const { PrismaClient } = require('../generated/prisma');

jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    event: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    ticketGroup: {
      findMany: jest.fn()
    },
    ticket: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn()
    },
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

jest.mock('../services/emailService', () => ({
  sendQrCodeEmailsForTickets: jest.fn().mockResolvedValue({
    successful: [],
    failed: [],
    totalSent: 0,
    totalFailed: 0
  })
}));

const ticketService = require('../services/ticketService');

describe('TicketService shopping cart flow', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  test('reserveTicketsForCart reserves all selected tickets atomically', async () => {
    const eventId = 26;
    const ticketIds = [1124, 2123];
    const reservedTickets = [
      {
        id: 1124,
        eventId,
        identificationNumber: 10,
        description: 'Ingresso Setor verde',
        price: '45.00',
        order: null,
        reservedUntil: null,
        salesEndDateTime: null
      },
      {
        id: 2123,
        eventId,
        identificationNumber: 11,
        description: 'Ingresso Setor verde',
        price: '45.00',
        order: null,
        reservedUntil: null,
        salesEndDateTime: null
      }
    ];

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        ticket: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce(reservedTickets)
            .mockResolvedValueOnce(
              reservedTickets.map((ticket) => ({
                ...ticket,
                reservationKey: 'generated',
                reservedUntil: new Date(Date.now() + 10 * 60 * 1000)
              }))
            ),
          updateMany: jest.fn().mockResolvedValue({ count: 1 })
        }
      };

      const result = await callback(tx);

      expect(tx.ticket.findMany).toHaveBeenCalledTimes(2);
      expect(tx.ticket.updateMany).toHaveBeenCalledTimes(2);
      return result;
    });

    const result = await ticketService.reserveTicketsForCart(eventId, ticketIds, { name: 'João' }, 10);

    expect(result.tickets).toHaveLength(2);
    expect(result.reservationKey).toBeTruthy();
    expect(result.reservedUntil).toBeInstanceOf(Date);
  });

  test('processShoppingCartWebhook marks tickets as sold and clears reservations on order.paid', async () => {
    const routeUserId = 'auth0|69f9e72b42cf21933aca64f7';
    const eventId = 26;
    const ticketIds = [1124, 2123];
    const baseTickets = ticketIds.map((id, index) => ({
      id,
      eventId,
      identificationNumber: index + 1,
      description: 'Ingresso Setor verde',
      price: '45.00',
      order: null,
      buyer: null,
      buyerEmail: null,
      buyerPhone: null,
      qrCodeHash: null,
      reservedUntil: new Date(Date.now() + 5 * 60 * 1000),
      event: {
        id: eventId,
        name: 'Festival',
        venue: 'Arena',
        opening_datetime: new Date('2026-05-09T20:00:00Z'),
        created_by: routeUserId
      }
    }));

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        ticket: {
          findMany: jest.fn().mockResolvedValue(baseTickets),
          update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({
            ...baseTickets.find((ticket) => ticket.id === where.id),
            ...data
          }))
        }
      };

      return callback(tx);
    });

    const result = await ticketService.processShoppingCartWebhook({
      event: 'order.paid',
      payload: {
        id: 'order_123',
        customer: {
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '11999999999'
        },
        meta: {
          userId: routeUserId,
          eventId,
          ticketIds
        }
      }
    }, routeUserId);

    expect(result.processedTickets).toBe(2);
    expect(result.orderId).toBe('order_123');
    expect(result.updatedTickets.every((ticket) => ticket.order === 'order_123')).toBe(true);
    expect(result.updatedTickets.every((ticket) => ticket.reservedUntil === null)).toBe(true);
    expect(result.updatedTickets.every((ticket) => ticket.buyer === 'João Silva')).toBe(true);
  });

  test('processShoppingCartWebhook releases reservations on payment.failed', async () => {
    const routeUserId = 'auth0|69f9e72b42cf21933aca64f7';
    const eventId = 26;
    const ticketIds = [1124, 2123];

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        ticket: {
          findMany: jest.fn().mockResolvedValue(ticketIds.map((id) => ({
            id,
            eventId,
            identificationNumber: id,
            order: null,
            event: {
              id: eventId,
              name: 'Festival',
              venue: 'Arena',
              opening_datetime: new Date('2026-05-09T20:00:00Z'),
              created_by: routeUserId
            }
          }))),
          updateMany: jest.fn().mockResolvedValue({ count: 2 })
        }
      };

      return callback(tx);
    });

    const result = await ticketService.processShoppingCartWebhook({
      event: 'payment.failed',
      payload: {
        id: 'order_123',
        meta: {
          userId: routeUserId,
          eventId,
          ticketIds
        }
      }
    }, routeUserId);

    expect(result.processedTickets).toBe(2);
    expect(result.message).toMatch(/Released 2 reserved ticket/);
  });

  test('processShoppingCartWebhook rejects mismatched webhook user scope', async () => {
    await expect(ticketService.processShoppingCartWebhook({
      event: 'order.paid',
      payload: {
        id: 'order_123',
        meta: {
          userId: 'auth0|different-user',
          eventId: 26,
          ticketIds: [1]
        }
      }
    }, 'auth0|69f9e72b42cf21933aca64f7')).rejects.toThrow('Webhook user scope does not match cart metadata');
  });
});
