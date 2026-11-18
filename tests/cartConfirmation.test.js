const mockPrisma = {
  $transaction: jest.fn(),
  cartPurchase: { update: jest.fn() }
};
jest.mock('../config/prisma', () => mockPrisma);
jest.mock('../services/emailService', () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendTicketQrCodeEmail: jest.fn().mockResolvedValue({ success: true })
}));
const service = require('../services/ticketService');
const email = require('../services/emailService');
const purchaseId = 'b3a73c89-af38-4708-970f-c218c1be64c9';
let purchase;
let storedTickets;
let tx;
const payload = () => ({ event: 'order.paid', payload: {
  id: 123,
  customer: { name: 'Buyer', email: 'buyer@example.com', identification: '11144477735' },
  meta: { purchaseId, eventId: 7, userId: 'organizer', ticketIds: storedTickets.map(t => t.id) }
} });

beforeEach(() => {
  jest.clearAllMocks();
  purchase = { id: purchaseId, eventId: 7, ticketIds: [10], reservationKey: 'reservation', orderId: null };
  storedTickets = [{
    id: 10, eventId: 7, identificationNumber: 1, description: 'Admission',
    reservationKey: 'reservation', order: null, table: 2, qrCodeHash: 'stored-qr',
    event: { id: 7, name: 'Festival', created_by: 'organizer' }
  }];
  tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    cartPurchase: {
      findUnique: jest.fn().mockImplementation(async () => ({ ...purchase })),
      update: jest.fn().mockImplementation(async ({ data }) => Object.assign(purchase, data))
    },
    ticket: {
      findMany: jest.fn().mockImplementation(async () => storedTickets.map(t => ({ ...t }))),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        const matching = storedTickets.filter(t => t.reservationKey === where.reservationKey && !t.order);
        matching.forEach(t => Object.assign(t, data));
        return { count: matching.length };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const ticket = storedTickets.find(t => t.id === where.id);
        Object.assign(ticket, data);
        return { ...ticket };
      })
    }
  };
  mockPrisma.$transaction.mockImplementation(async callback => callback(tx));
  mockPrisma.cartPurchase.update.mockImplementation(async ({ data }) => Object.assign(purchase, data));
});

test('confirms a single ticket, including table tickets, and sends its QR exactly once', async () => {
  const result = await service.processShoppingCartWebhook(payload(), 'organizer');
  expect(purchase.orderId).toBe('123');
  expect(storedTickets[0]).toEqual(expect.objectContaining({ order: '123', reservationKey: null, buyer: 'Buyer' }));
  expect(result.isSingleTicket).toBe(true);
  expect(result.qrEmailSent).toBe(true);
  expect(email.sendTicketQrCodeEmail).toHaveBeenCalledTimes(1);
  expect(email.sendConfirmationEmail).not.toHaveBeenCalled();
  expect(tx.$queryRaw).toHaveBeenCalled();
  expect(tx.ticket.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ reservationKey: 'reservation' }) }));
  await service.processShoppingCartWebhook(payload(), 'organizer');
  expect(email.sendTicketQrCodeEmail).toHaveBeenCalledTimes(1);
});

test('webhook fallback confirms when the buyer never returns', async () => {
  storedTickets.push({ ...storedTickets[0], id: 11, identificationNumber: 2, table: null });
  purchase.ticketIds.push(11);
  const result = await service.processShoppingCartWebhook(payload(), 'organizer');
  expect(result.isSingleTicket).toBe(false);
  expect(storedTickets.map(t => t.order)).toEqual(['123', '123']);
  expect(storedTickets[0].buyer).toBe('Buyer');
  expect(storedTickets[1].buyer).toBeUndefined();
  expect(email.sendConfirmationEmail).toHaveBeenCalledTimes(1);
});

test('concurrent return and webhook serialize on the purchase lock and send one email', async () => {
  let tail = Promise.resolve();
  mockPrisma.$transaction.mockImplementation(async callback => {
    const previous = tail;
    let release;
    tail = new Promise(resolve => { release = resolve; });
    // Simulate PostgreSQL's FOR UPDATE wait inside the transaction, rather than serializing callers.
    const lockedTx = { ...tx, $queryRaw: jest.fn(async () => { await previous; return []; }) };
    try { return await callback(lockedTx); } finally { release(); }
  });
  const results = await Promise.all([
    service.processShoppingCartWebhook(payload(), 'organizer'),
    service.processShoppingCartWebhook(payload(), 'organizer')
  ]);
  expect(results.filter(r => r.alreadyProcessed)).toHaveLength(1);
  expect(tx.cartPurchase.update).toHaveBeenCalledTimes(1);
  expect(email.sendTicketQrCodeEmail).toHaveBeenCalledTimes(1);
});

test('late payment.failed does not release a confirmed purchase', async () => {
  await service.processShoppingCartWebhook(payload(), 'organizer');
  tx.ticket.updateMany.mockClear();
  const result = await service.processShoppingCartWebhook({ ...payload(), event: 'payment.failed' }, 'organizer');
  expect(result.alreadyProcessed).toBe(true);
  expect(tx.ticket.updateMany).not.toHaveBeenCalled();
  expect(storedTickets[0].order).toBe('123');
});

test('old payment failures do not release a replacement reservation', async () => {
  storedTickets[0].reservationKey = 'new-reservation';
  const result = await service.processShoppingCartWebhook({ ...payload(), event: 'payment.failed' }, 'organizer');
  expect(result.processedTickets).toBe(0);
  expect(storedTickets[0].reservationKey).toBe('new-reservation');
});

test('rejects a paid purchase whose reservation has been reassigned', async () => {
  storedTickets[0].reservationKey = 'new-reservation';
  await expect(service.processShoppingCartWebhook(payload(), 'organizer')).rejects.toThrow('original ticket reservation');
  expect(tx.ticket.update).not.toHaveBeenCalled();
  expect(email.sendTicketQrCodeEmail).not.toHaveBeenCalled();
});

test('rejects purchase metadata for another event or unknown purchase', async () => {
  purchase.eventId = 8;
  await expect(service.processShoppingCartWebhook(payload(), 'organizer')).rejects.toThrow('metadata does not match');
  tx.cartPurchase.findUnique.mockResolvedValue(null);
  await expect(service.processShoppingCartWebhook(payload(), 'organizer')).rejects.toThrow('metadata does not match');
  expect(tx.ticket.update).not.toHaveBeenCalled();
});

test('email failure keeps payment confirmed and records truthful delivery status', async () => {
  const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
  email.sendTicketQrCodeEmail.mockRejectedValueOnce(new Error('SES unavailable'));
  try {
    const result = await service.processShoppingCartWebhook(payload(), 'organizer');
    expect(result.qrEmailSent).toBe(false);
    expect(purchase).toEqual(expect.objectContaining({ orderId: '123', qrEmailSent: false }));
    await service.processShoppingCartWebhook(payload(), 'organizer');
    expect(email.sendTicketQrCodeEmail).toHaveBeenCalledTimes(1);
  } finally { silence.mockRestore(); }
});
