const { PrismaClient } = require('../generated/prisma');

jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    event: {
      findFirst: jest.fn()
    },
    ticket: {
      findFirst: jest.fn()
    },
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

const ticketService = require('../services/ticketService');

describe('TicketService buyerPhone persistence', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  test('persists buyer phone when creating a ticket', async () => {
    mockPrisma.event.findFirst.mockResolvedValue({ id: 10, created_by: 'auth0|organizer' });

    const tx = {
      ticketGroup: {
        upsert: jest.fn().mockResolvedValue({ id: 1 })
      },
      event: {
        update: jest.fn().mockResolvedValue({ nextTicketNumber: 6 })
      },
      ticket: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 20, ...data }))
      }
    };

    mockPrisma.$transaction.mockImplementation((callback) => callback(tx));

    const result = await ticketService.createTicket(10, {
      description: 'VIP',
      price: 50,
      buyer: 'Ana',
      buyerEmail: 'ana@example.com',
      buyerPhone: '+5511999999999'
    }, 'auth0|organizer');

    expect(tx.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerPhone: '+5511999999999'
      })
    });
    expect(result.buyerPhone).toBe('+5511999999999');
  });

  test('persists buyer phone when updating a ticket', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue({
      id: 20,
      eventId: 10,
      description: 'VIP',
      table: null,
      event: {
        created_by: 'auth0|organizer'
      }
    });

    const tx = {
      ticketGroup: {
        upsert: jest.fn().mockResolvedValue({ id: 1 })
      },
      ticket: {
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 20, ...data }))
      }
    };

    mockPrisma.$transaction.mockImplementation((callback) => callback(tx));

    await ticketService.updateTicket(20, {
      buyerPhone: '+5511888888888'
    }, 'auth0|organizer');

    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: {
        buyerPhone: '+5511888888888'
      }
    });
  });

  test('persists buyer phone when bulk updating tickets', async () => {
    mockPrisma.ticket.findFirst
      .mockResolvedValueOnce({
        id: 20,
        event: { created_by: 'auth0|organizer' }
      })
      .mockResolvedValueOnce({
        id: 21,
        event: { created_by: 'auth0|organizer' }
      });

    const tx = {
      ticket: {
        update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
      }
    };

    mockPrisma.$transaction.mockImplementation((callback) => callback(tx));

    await ticketService.bulkUpdateTickets([20, 21], {
      buyerPhone: '+5511777777777'
    }, 'auth0|organizer');

    expect(tx.ticket.update).toHaveBeenCalledTimes(2);
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: {
        buyerPhone: '+5511777777777'
      }
    });
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        buyerPhone: '+5511777777777'
      }
    });
  });
});
