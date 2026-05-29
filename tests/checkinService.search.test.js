const mockPrisma = {
  event: {
    findFirst: jest.fn()
  },
  ticket: {
    findMany: jest.fn(),
    updateMany: jest.fn()
  }
};

jest.mock('../config/prisma', () => mockPrisma);

const checkinService = require('../services/checkinService');

describe('CheckinService ticket search check-in', () => {
  const userId = 'auth0|organizer';
  const event = {
    id: 10,
    name: 'Festival',
    venue: 'Arena',
    opening_datetime: new Date('2026-05-08T23:00:00.000Z'),
    closing_datetime: new Date('2026-05-09T03:00:00.000Z'),
    created_by: userId
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.event.findFirst.mockResolvedValue(event);
  });

  test('searches by visible ticket number within the current event', async () => {
    const ticket = {
      id: 1,
      eventId: event.id,
      identificationNumber: 42,
      description: 'VIP',
      location: 'Sector A',
      table: null,
      price: '50',
      order: null,
      buyer: 'Joao Silva',
      buyerDocument: '12345678909',
      buyerEmail: 'joao@example.com',
      checkedIn: false,
      checkedInAt: null
    };

    mockPrisma.ticket.findMany.mockResolvedValueOnce([ticket]);

    const result = await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '42',
      field: 'ticket'
    });

    expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
      where: {
        id: event.id,
        created_by: userId
      },
      select: {
        id: true,
        name: true,
        venue: true,
        opening_datetime: true,
        closing_datetime: true,
        created_by: true
      }
    });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {
        eventId: event.id,
        identificationNumber: 42
      },
      orderBy: [
        { order: 'asc' },
        { identificationNumber: 'asc' }
      ]
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      key: 'ticket:1',
      type: 'ticket',
      label: 'Ticket #42',
      ticketCount: 1,
      checkedInCount: 0
    });
  });

  test('searches by buyer and returns every ticket in the matched order', async () => {
    const matchedTicket = {
      id: 1,
      eventId: event.id,
      identificationNumber: 10,
      description: 'VIP',
      table: 7,
      price: '50',
      order: 'ORDER-123',
      buyer: 'Maria Souza',
      buyerDocument: '12345678909',
      buyerEmail: 'maria@example.com',
      checkedIn: false,
      checkedInAt: null
    };
    const orderTickets = [
      matchedTicket,
      {
        ...matchedTicket,
        id: 2,
        identificationNumber: 11,
        buyer: null,
        buyerEmail: null,
        checkedIn: true,
        checkedInAt: new Date('2026-05-08T23:30:00.000Z')
      }
    ];

    mockPrisma.ticket.findMany
      .mockResolvedValueOnce([matchedTicket])
      .mockResolvedValueOnce(orderTickets);

    const result = await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: 'maria',
      field: 'buyer'
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        eventId: event.id,
        buyer: {
          contains: 'maria',
          mode: 'insensitive'
        }
      },
      orderBy: [
        { order: 'asc' },
        { identificationNumber: 'asc' }
      ]
    });
    expect(mockPrisma.ticket.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        eventId: event.id,
        order: {
          in: ['ORDER-123']
        }
      },
      orderBy: [
        { order: 'asc' },
        { identificationNumber: 'asc' }
      ]
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      key: 'order:ORDER-123',
      type: 'order',
      order: 'ORDER-123',
      ticketCount: 2,
      checkedInCount: 1
    });
    expect(result.groups[0].tickets.map((ticket) => ticket.id)).toEqual([1, 2]);
  });

  test('searches by table and returns the full order group', async () => {
    const matchedTicket = {
      id: 3,
      eventId: event.id,
      identificationNumber: 20,
      description: 'Table ticket',
      table: 12,
      price: '75',
      order: 'ORDER-456',
      buyer: 'Carlos',
      buyerDocument: null,
      buyerEmail: 'carlos@example.com',
      checkedIn: false,
      checkedInAt: null
    };

    mockPrisma.ticket.findMany
      .mockResolvedValueOnce([matchedTicket])
      .mockResolvedValueOnce([matchedTicket]);

    const result = await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '12',
      field: 'table'
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        eventId: event.id,
        table: 12
      }
    }));
    expect(result.groups[0].order).toBe('ORDER-456');
  });

  test('searches by buyer email and returns the full order group', async () => {
    const matchedTicket = {
      id: 4,
      eventId: event.id,
      identificationNumber: 30,
      description: 'Balcony',
      table: null,
      price: '65',
      order: 'ORDER-EMAIL',
      buyer: 'Ana',
      buyerDocument: null,
      buyerEmail: 'ana@example.com',
      checkedIn: false,
      checkedInAt: null
    };

    mockPrisma.ticket.findMany
      .mockResolvedValueOnce([matchedTicket])
      .mockResolvedValueOnce([matchedTicket]);

    const result = await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: 'ana@example.com',
      field: 'email'
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        eventId: event.id,
        buyerEmail: {
          contains: 'ana@example.com',
          mode: 'insensitive'
        }
      }
    }));
    expect(result.groups[0].order).toBe('ORDER-EMAIL');
  });

  test('any search combines numeric and text fields', async () => {
    mockPrisma.ticket.findMany.mockResolvedValueOnce([]);

    await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '15',
      field: 'any'
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {
        eventId: event.id,
        OR: [
          {
            buyer: {
              contains: '15',
              mode: 'insensitive'
            }
          },
          {
            buyerEmail: {
              contains: '15',
              mode: 'insensitive'
            }
          },
          {
            order: {
              contains: '15',
              mode: 'insensitive'
            }
          },
          { identificationNumber: 15 },
          { table: 15 }
        ]
      },
      orderBy: [
        { order: 'asc' },
        { identificationNumber: 'asc' }
      ]
    });
  });

  test('rejects searches for events not owned by the user', async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null);

    await expect(checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '42',
      field: 'ticket'
    })).rejects.toThrow('Event not found or access denied');

    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
  });

  test('checks in only selected tickets that are not already checked in', async () => {
    const tickets = [
      {
        id: 1,
        eventId: event.id,
        identificationNumber: 10,
        description: 'VIP',
        table: null,
        price: '50',
        order: 'ORDER-123',
        buyer: 'Maria',
        buyerDocument: null,
        buyerEmail: 'maria@example.com',
        checkedIn: false,
        checkedInAt: null
      },
      {
        id: 2,
        eventId: event.id,
        identificationNumber: 11,
        description: 'VIP',
        table: null,
        price: '50',
        order: 'ORDER-123',
        buyer: 'Joao',
        buyerDocument: null,
        buyerEmail: 'joao@example.com',
        checkedIn: true,
        checkedInAt: new Date('2026-05-08T23:30:00.000Z')
      }
    ];
    mockPrisma.ticket.findMany.mockResolvedValue(tickets);
    mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await checkinService.processSelectedTicketCheckins(event.id, userId, [1, 2]);

    expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [1]
        },
        eventId: event.id,
        checkedIn: false
      },
      data: {
        checkedIn: true,
        checkedInAt: expect.any(Date)
      }
    });
    expect(result.checkedInCount).toBe(1);
    expect(result.alreadyCheckedInCount).toBe(1);
    expect(result.tickets.find((ticket) => ticket.id === 1).checkedIn).toBe(true);
    expect(result.tickets.find((ticket) => ticket.id === 2).checkedIn).toBe(true);
  });

  test('rejects selected check-in when a ticket is outside the current event', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([{ id: 1, eventId: event.id }]);

    await expect(checkinService.processSelectedTicketCheckins(event.id, userId, [1, 2]))
      .rejects
      .toThrow('Some tickets were not found or access denied: 2');

    expect(mockPrisma.ticket.updateMany).not.toHaveBeenCalled();
  });
});
