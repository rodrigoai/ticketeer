const mockPrisma = {
  event: {
    findFirst: jest.fn()
  },
  ticket: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateManyAndReturn: jest.fn()
  }
};

jest.mock('../config/prisma', () => mockPrisma);

const checkinService = require('../services/checkinService');

describe('CheckinService ticket search check-in', () => {
  const silenceExpectedConsoleError = () => (
    jest.spyOn(console, 'error').mockImplementation(() => {})
  );

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

  afterEach(() => {
    jest.restoreAllMocks();
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
      query: '#42',
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
      checkedInCount: 0,
      matchedTicketIds: [1]
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
      {
        ...matchedTicket,
        id: 2,
        identificationNumber: 9,
        buyer: null,
        buyerEmail: null,
        checkedIn: true,
        checkedInAt: new Date('2026-05-08T23:30:00.000Z')
      },
      matchedTicket
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
      buyer: 'Maria Souza',
      ticketCount: 2,
      checkedInCount: 1,
      matchedTicketIds: [1]
    });
    expect(result.groups[0].tickets.map(({ id, buyer }) => [id, buyer])).toEqual([[2, null], [1, 'Maria Souza']]);
  });

  test.each([
    ['any', '#11', { identificationNumber: 11 }, [2]],
    ['order', 'ORDER-123', { order: { contains: 'ORDER-123', mode: 'insensitive' } }, [1, 2]]
  ])('returns the full order for a %s search', async (field, query, matchWhere, matchedIds) => {
    const orderTickets = [
      { id: 1, order: 'ORDER-123', identificationNumber: 10, buyer: 'Maria', checkedIn: false },
      { id: 2, order: 'ORDER-123', identificationNumber: 11, buyer: null, checkedIn: false }
    ];
    mockPrisma.ticket.findMany
      .mockResolvedValueOnce(orderTickets.filter(ticket => matchedIds.includes(ticket.id)))
      .mockResolvedValueOnce(orderTickets);

    const result = await checkinService.searchTicketsForCheckin(event.id, userId, { query, field });

    expect(mockPrisma.ticket.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { eventId: event.id, ...matchWhere }
    }));
    expect(result.groups[0]).toMatchObject({
      buyer: 'Maria',
      matchedTicketIds: matchedIds,
      tickets: [{ id: 1, buyer: 'Maria' }, { id: 2, buyer: null }]
    });
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

  test('searches by buyer document and accepts formatted CPF input', async () => {
    const matchedTicket = {
      id: 5,
      eventId: event.id,
      identificationNumber: 31,
      description: 'Floor',
      table: null,
      price: '65',
      order: 'ORDER-DOCUMENT',
      buyer: 'Bruna',
      buyerDocument: '12345678909',
      buyerEmail: 'bruna@example.com',
      checkedIn: false,
      checkedInAt: null
    };

    mockPrisma.ticket.findMany
      .mockResolvedValueOnce([matchedTicket])
      .mockResolvedValueOnce([matchedTicket]);

    const result = await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '123.456.789-09',
      field: 'document'
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        eventId: event.id,
        OR: [
          {
            buyerDocument: {
              contains: '123.456.789-09',
              mode: 'insensitive'
            }
          },
          {
            buyerDocument: {
              contains: '12345678909',
              mode: 'insensitive'
            }
          }
        ]
      }
    }));
    expect(result.groups[0].order).toBe('ORDER-DOCUMENT');
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
            buyerDocument: {
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

  test('any search does not use CPF-sized numeric queries for integer ticket fields', async () => {
    mockPrisma.ticket.findMany.mockResolvedValueOnce([]);

    await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '27219777094',
      field: 'any'
    });

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
      where: {
        eventId: event.id,
        OR: [
          {
            buyer: {
              contains: '27219777094',
              mode: 'insensitive'
            }
          },
          {
            buyerDocument: {
              contains: '27219777094',
              mode: 'insensitive'
            }
          },
          {
            buyerEmail: {
              contains: '27219777094',
              mode: 'insensitive'
            }
          },
          {
            order: {
              contains: '27219777094',
              mode: 'insensitive'
            }
          }
        ]
      },
      orderBy: [
        { order: 'asc' },
        { identificationNumber: 'asc' }
      ]
    });
  });

  test('ticket field search skips numbers too large for integer columns', async () => {
    const result = await checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '27219777094',
      field: 'ticket'
    });

    expect(mockPrisma.ticket.findMany).not.toHaveBeenCalled();
    expect(result.groups).toEqual([]);
  });

  test('rejects searches for events not owned by the user', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();

    mockPrisma.event.findFirst.mockResolvedValue(null);

    await expect(checkinService.searchTicketsForCheckin(event.id, userId, {
      query: '42',
      field: 'ticket'
    })).rejects.toThrow('Event not found or access denied');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error searching tickets for check-in:',
      expect.any(Error)
    );
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
        buyer: null,
        buyerDocument: null,
        buyerEmail: null,
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
    mockPrisma.ticket.updateManyAndReturn.mockImplementationOnce(async ({ data }) => [{ ...tickets[0], ...data }]);

    const result = await checkinService.processSelectedTicketCheckins(event.id, userId, [1, 2]);

    expect(mockPrisma.ticket.updateManyAndReturn).toHaveBeenCalledWith({
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

  test('checks in only the chosen unnamed ticket and returns the original time when another station got there first', async () => {
    const ticket = { id: 2, eventId: event.id, order: 'ORDER-123', buyer: null, checkedIn: false };
    const checkedInAt = new Date('2026-05-08T23:30:00.000Z');
    mockPrisma.ticket.findMany
      .mockResolvedValueOnce([ticket])
      .mockResolvedValueOnce([{ ...ticket, checkedIn: true, checkedInAt }]);
    mockPrisma.ticket.updateManyAndReturn.mockResolvedValueOnce([]);

    const result = await checkinService.processSelectedTicketCheckins(event.id, userId, [2]);

    expect(mockPrisma.ticket.updateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [2] }, eventId: event.id, checkedIn: false }
    }));
    expect(result).toMatchObject({
      checkedInCount: 0,
      alreadyCheckedInCount: 1,
      tickets: [{ id: 2, buyer: null, checkedIn: true, checkedInAt }]
    });
  });

  test('a QR check-in racing manual check-in reports the original time', async () => {
    const ticket = { id: 2, event, checkedIn: false };
    const checkedInAt = new Date('2026-05-08T23:30:00.000Z');
    jest.spyOn(checkinService, 'findTicketByHash')
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce({ ...ticket, checkedIn: true, checkedInAt });
    mockPrisma.ticket.update.mockRejectedValueOnce(Object.assign(new Error('Already updated'), { code: 'P2025' }));

    const result = await checkinService.processCheckin('fixture-hash');

    expect(mockPrisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ticket.id, checkedIn: false }
    }));
    expect(result).toMatchObject({
      success: false,
      alreadyCheckedIn: true,
      ticket: { id: 2, checkedIn: true, checkedInAt }
    });
  });

  test('rejects selected check-in when a ticket is outside the current event', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();

    mockPrisma.ticket.findMany.mockResolvedValue([{ id: 1, eventId: event.id }]);

    await expect(checkinService.processSelectedTicketCheckins(event.id, userId, [1, 2]))
      .rejects
      .toThrow('Some tickets were not found or access denied: 2');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error processing selected ticket check-ins:',
      expect.any(Error)
    );
    expect(mockPrisma.ticket.updateManyAndReturn).not.toHaveBeenCalled();
  });
});
