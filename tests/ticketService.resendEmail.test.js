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

jest.mock('../services/emailService', () => ({
  sendTicketQrCodeEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'message-123'
  })
}));

const ticketService = require('../services/ticketService');
const emailService = require('../services/emailService');

describe('TicketService resendTicketEmails', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  test('resends QR emails for selected tickets with buyer information', async () => {
    const userId = 'auth0|organizer';
    const event = {
      id: 10,
      name: 'Festival',
      venue: 'Arena',
      opening_datetime: new Date('2026-05-08T23:00:00.000Z'),
      created_by: userId
    };
    const tickets = [
      {
        id: 2,
        eventId: event.id,
        identificationNumber: 20,
        description: 'VIP',
        buyer: 'Maria',
        buyerEmail: 'maria@example.com',
        qrCodeHash: 'hash-2',
        event
      },
      {
        id: 1,
        eventId: event.id,
        identificationNumber: 10,
        description: 'Standard',
        buyer: 'Joao',
        buyerEmail: 'joao@example.com',
        qrCodeHash: 'hash-1',
        event
      }
    ];

    mockPrisma.ticket.findMany.mockResolvedValue(tickets);

    const result = await ticketService.resendTicketEmails([2, '1', 1], userId);

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [2, 1] },
        event: {
          created_by: userId
        }
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            venue: true,
            opening_datetime: true,
            created_by: true
          }
        }
      },
      orderBy: {
        identificationNumber: 'asc'
      }
    });

    expect(emailService.sendTicketQrCodeEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendTicketQrCodeEmail).toHaveBeenCalledWith(
      'maria@example.com',
      expect.objectContaining({
        id: 2,
        eventId: event.id,
        identificationNumber: 20,
        buyer: 'Maria',
        buyerEmail: 'maria@example.com',
        qrCodeHash: 'hash-2'
      }),
      {
        name: 'Festival',
        venue: 'Arena',
        date: event.opening_datetime
      },
      userId
    );
    expect(result).toEqual({
      successful: [
        {
          ticketId: 2,
          identificationNumber: 20,
          email: 'maria@example.com',
          messageId: 'message-123'
        },
        {
          ticketId: 1,
          identificationNumber: 10,
          email: 'joao@example.com',
          messageId: 'message-123'
        }
      ],
      failed: [],
      skipped: [],
      totalSelected: 2,
      totalSent: 2,
      totalFailed: 0,
      totalSkipped: 0
    });
  });

  test('skips selected tickets without buyer name or email', async () => {
    const userId = 'auth0|organizer';
    const event = {
      id: 10,
      name: 'Festival',
      venue: 'Arena',
      opening_datetime: new Date('2026-05-08T23:00:00.000Z'),
      created_by: userId
    };

    mockPrisma.ticket.findMany.mockResolvedValue([
      {
        id: 1,
        eventId: event.id,
        identificationNumber: 10,
        description: 'Standard',
        buyer: 'Joao',
        buyerEmail: 'joao@example.com',
        event
      },
      {
        id: 2,
        eventId: event.id,
        identificationNumber: 20,
        description: 'VIP',
        buyer: null,
        buyerEmail: null,
        event
      }
    ]);

    const result = await ticketService.resendTicketEmails([1, 2], userId);

    expect(emailService.sendTicketQrCodeEmail).toHaveBeenCalledTimes(1);
    expect(result.totalSent).toBe(1);
    expect(result.totalSkipped).toBe(1);
    expect(result.skipped).toEqual([
      {
        ticketId: 2,
        identificationNumber: 20,
        reason: 'Ticket must have buyer name and email information'
      }
    ]);
  });

  test('rejects when a selected ticket is missing or not owned by the user', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([{ id: 1 }]);

    await expect(ticketService.resendTicketEmails([1, 2], 'auth0|organizer'))
      .rejects
      .toThrow('Some tickets were not found or access was denied: 2');

    expect(emailService.sendTicketQrCodeEmail).not.toHaveBeenCalled();
  });
});
