const mockPrisma = {
  cartPurchase: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
  ticket: { findMany: jest.fn() }
};
jest.mock('../config/prisma', () => mockPrisma);
jest.mock('../services/novaMoneyService', () => ({ findPaidCartOrder: jest.fn() }));
jest.mock('../services/userProfileService', () => ({ getProfileByUserId: jest.fn() }));
jest.mock('../services/ticketService', () => ({ processShoppingCartWebhook: jest.fn() }));
jest.mock('../services/orderService', () => ({ getOrderByHash: jest.fn() }));
jest.mock('../services/qrCodeService', () => ({ generateQrCodeDataUrl: jest.fn() }));

const service = require('../services/cartPurchaseService');
const nova = require('../services/novaMoneyService');
const profiles = require('../services/userProfileService');
const tickets = require('../services/ticketService');
const orders = require('../services/orderService');
const qr = require('../services/qrCodeService');
const id = 'b3a73c89-af38-4708-970f-c218c1be64c9';
const event = { id: 7, public_hash: 'event-public', created_by: 'organizer', cart_payment_service_id: 'cart-page' };
let purchase;
let providerOrder;

beforeEach(() => {
  jest.resetAllMocks();
  purchase = { id, eventId: 7, ticketIds: [10], event, cartPageId: 'cart-page', orderId: null, qrEmailSent: true };
  providerOrder = { id: 123, status: 'paid', meta: { purchaseId: id, userId: 'organizer', eventId: 7, ticketIds: [10] }, customer: { name: 'Buyer' } };
  mockPrisma.cartPurchase.findFirst.mockImplementation(async ({ where }) => where.event.public_hash === event.public_hash ? purchase : null);
  mockPrisma.cartPurchase.findUnique.mockImplementation(async () => purchase);
  mockPrisma.ticket.findMany.mockResolvedValue([{ id: 10, identificationNumber: 1, description: 'Admission' }]);
  profiles.getProfileByUserId.mockResolvedValue({ nova_money_tenant: 'tenant', nova_money_api_key: 'secret' });
  nova.findPaidCartOrder.mockResolvedValue(providerOrder);
  tickets.processShoppingCartWebhook.mockImplementation(async () => { purchase.orderId = '123'; });
  orders.getOrderByHash.mockResolvedValue({ event: { name: 'Festival' }, isCompleted: true });
  qr.generateQrCodeDataUrl.mockResolvedValue({ dataUrl: 'data:image/png;base64,qr' });
});

test('creates a durable purchase and an event-specific redirect URL', async () => {
  mockPrisma.cartPurchase.create.mockResolvedValue({ id });
  const result = await service.create({ event, reservation: { reservationKey: 'reservation', tickets: [{ id: 10 }] }, customer: { name: 'Buyer' } });
  expect(result).toEqual({ purchaseId: id, redirect_url: expect.stringContaining(`/event/event-public/success/${id}`) });
  expect(mockPrisma.cartPurchase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventId: 7, reservationKey: 'reservation', ticketIds: [10], cartPageId: 'cart-page' }) });
});

test('redirect confirms immediately through NovaPay without a preceding webhook, returning a single ticket QR', async () => {
  const result = await service.confirm('event-public', id);
  expect(nova.findPaidCartOrder).toHaveBeenCalledWith({ tenant: 'tenant', apiKey: 'secret', cartPageId: 'cart-page', purchaseId: id });
  expect(tickets.processShoppingCartWebhook).toHaveBeenCalledWith({ event: 'order.paid', payload: providerOrder }, 'organizer');
  expect(result).toEqual(expect.objectContaining({ totalTickets: 1, qrEmailSent: true, confirmationHash: expect.any(String), tickets: [expect.objectContaining({ qrCode: 'data:image/png;base64,qr' })] }));
});

test('webhook-first and refreshed success pages do not reconfirm or require NovaPay availability', async () => {
  purchase.orderId = '123';
  await service.confirm('event-public', id);
  await service.confirm('event-public', id);
  expect(nova.findPaidCartOrder).not.toHaveBeenCalled();
  expect(tickets.processShoppingCartWebhook).not.toHaveBeenCalled();
});

test('multiple tickets require owner confirmation before displaying QR codes', async () => {
  purchase.ticketIds = [10, 11];
  purchase.orderId = '123';
  mockPrisma.ticket.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
  orders.getOrderByHash.mockResolvedValue({ event: { name: 'Festival' }, isCompleted: false });
  const result = await service.confirm('event-public', id);
  expect(result).toEqual(expect.objectContaining({ totalTickets: 2, isCompleted: false, tickets: [] }));
  expect(qr.generateQrCodeDataUrl).not.toHaveBeenCalled();
});

test('completed multi-ticket orders display every QR code', async () => {
  purchase.ticketIds = [10, 11];
  purchase.orderId = '123';
  mockPrisma.ticket.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
  expect((await service.confirm('event-public', id)).tickets).toHaveLength(2);
});

test.each([
  ['userId', 'other-organizer'], ['eventId', 8], ['ticketIds', [99]]
])('rejects a payment with mismatched %s', async (key, value) => {
  providerOrder.meta[key] = value;
  await expect(service.confirm('event-public', id)).rejects.toThrow('Payment does not match');
  expect(tickets.processShoppingCartWebhook).not.toHaveBeenCalled();
});

test('does not confirm when NovaPay cannot verify payment', async () => {
  nova.findPaidCartOrder.mockRejectedValue(new Error('Payment not confirmed'));
  await expect(service.confirm('event-public', id)).rejects.toThrow('Payment not confirmed');
  expect(tickets.processShoppingCartWebhook).not.toHaveBeenCalled();
});

test('rejects a purchase belonging to a different event and malformed links', async () => {
  await expect(service.confirm('other-event', id)).rejects.toThrow('Purchase not found');
  await expect(service.confirm('event-public', 'bad-token')).rejects.toThrow('Invalid purchase link');
  expect(nova.findPaidCartOrder).not.toHaveBeenCalled();
});
