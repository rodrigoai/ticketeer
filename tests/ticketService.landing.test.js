const { PrismaClient } = require('../generated/prisma');

jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    ticket: {
      findMany: jest.fn()
    },
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

const ticketService = require('../services/ticketService');

describe('TicketService landing page tickets', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  test('getLandingTicketsByEvent excludes already sold tickets from the public landing page', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);

    await ticketService.getLandingTicketsByEvent(26);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        eventId: 26,
        AND: [
          {
            OR: [
              { order: null },
              { order: '' }
            ]
          },
          {
            OR: [
              { salesEndDateTime: null },
              { salesEndDateTime: { gt: expect.any(Date) } }
            ]
          }
        ]
      }),
      orderBy: { identificationNumber: 'asc' }
    }));
  });
});
