const { PrismaClient } = require('../generated/prisma');

jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    ticketGroup: {
      findMany: jest.fn(),
      upsert: jest.fn()
    },
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

  test('new ticket groups are active by default', async () => {
    mockPrisma.ticketGroup.upsert.mockResolvedValue({ id: 9, active: true });

    await ticketService._ensureTicketGroup(mockPrisma, 26, 'VIP', null);

    expect(mockPrisma.ticketGroup.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ active: true })
    }));
  });

  test('getLandingTicketsByEvent excludes already sold tickets from the public landing page', async () => {
    mockPrisma.ticketGroup.findMany.mockResolvedValue([
      { groupKey: 'General Admission' }
    ]);
    mockPrisma.ticket.findMany.mockResolvedValue([]);

    await ticketService.getLandingTicketsByEvent(26);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        eventId: 26,
        description: { in: ['General Admission'] },
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

  test('getLandingTicketsByEvent only queries tickets belonging to active groups', async () => {
    mockPrisma.ticketGroup.findMany.mockResolvedValue([
      { groupKey: 'VIP' },
      { groupKey: 'General Admission' }
    ]);
    mockPrisma.ticket.findMany.mockResolvedValue([]);

    await ticketService.getLandingTicketsByEvent(26);

    expect(mockPrisma.ticketGroup.findMany).toHaveBeenCalledWith({
      where: { eventId: 26, active: true },
      select: { groupKey: true }
    });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        description: { in: ['VIP', 'General Admission'] }
      })
    }));
  });
});
