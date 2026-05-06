const { PrismaClient } = require('../generated/prisma');

jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    event: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    ticketGroup: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn()
    },
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

const ticketService = require('../services/ticketService');

describe('TicketService bulkDeleteTickets', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  test('deletes all owned tickets with one validation query and one deleteMany', async () => {
    const ticketIds = [10, 11, 12];
    const userId = 'auth0|testuser123';

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        ticket: {
          findMany: jest.fn().mockResolvedValue(ticketIds.map((id) => ({ id }))),
          deleteMany: jest.fn().mockResolvedValue({ count: 3 })
        }
      };

      const result = await callback(tx);

      expect(tx.ticket.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ticketIds },
          event: {
            created_by: userId
          }
        },
        select: {
          id: true
        }
      });

      expect(tx.ticket.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ticketIds
          }
        }
      });

      return result;
    });

    const result = await ticketService.bulkDeleteTickets(ticketIds, userId);

    expect(result).toEqual({ count: 3 });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test('throws when some tickets are missing or not owned by the user', async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        ticket: {
          findMany: jest.fn().mockResolvedValue([{ id: 10 }]),
          deleteMany: jest.fn()
        }
      };

      return callback(tx);
    });

    await expect(ticketService.bulkDeleteTickets([10, 11], 'auth0|testuser123'))
      .rejects
      .toThrow('Failed to bulk delete tickets: Some tickets were not found or access was denied: 11');
  });
});
