const { PrismaClient } = require('../generated/prisma');

jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    event: {
      findFirst: jest.fn()
    },
    ticketGroup: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    ticket: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

const ticketService = require('../services/ticketService');

describe('Ticket group tiered pricing', () => {
  const silenceExpectedConsoleError = () => (
    jest.spyOn(console, 'error').mockImplementation(() => {})
  );

  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('resolveTicketGroupPricing uses the active tier price for the current datetime', () => {
    const result = ticketService.resolveTicketGroupPricing({
      defaultPrice: '100.00',
      pricingTiers: [
        {
          id: 1,
          name: 'Tier One',
          start_at: new Date('2026-05-08T15:00:00Z'),
          end_at: new Date('2026-05-10T16:00:00Z'),
          price: '80.00'
        },
        {
          id: 2,
          name: 'Tier Two',
          start_at: new Date('2026-05-10T16:00:00Z'),
          end_at: new Date('2026-05-12T16:00:00Z'),
          price: '90.00'
        }
      ],
      referenceDate: new Date('2026-05-09T12:00:00Z')
    });

    expect(result.defaultPrice).toBe(100);
    expect(result.activePrice).toBe(80);
    expect(result.activePricingTier).toEqual(expect.objectContaining({
      name: 'Tier One',
      price: 80
    }));
  });

  test('resolveTicketGroupPricing falls back to the default group price when no tier is active', () => {
    const result = ticketService.resolveTicketGroupPricing({
      defaultPrice: '120.00',
      pricingTiers: [
        {
          id: 1,
          name: 'Early Bird',
          start_at: new Date('2026-05-08T15:00:00Z'),
          end_at: new Date('2026-05-10T16:00:00Z'),
          price: '95.00'
        }
      ],
      referenceDate: new Date('2026-05-11T12:00:00Z')
    });

    expect(result.activePrice).toBe(120);
    expect(result.activePricingTier).toBeNull();
  });

  test('resolveTicketGroupPricing keeps period batches start-inclusive and end-exclusive', () => {
    const pricingTiers = [
      {
        id: 1,
        position: 0,
        type: 'period',
        name: 'Period 1',
        start_at: new Date('2026-05-08T15:00:00Z'),
        end_at: new Date('2026-05-10T16:00:00Z'),
        price: '80.00'
      },
      {
        id: 2,
        position: 1,
        type: 'period',
        name: 'Period 2',
        start_at: new Date('2026-05-10T16:00:00Z'),
        end_at: new Date('2026-05-12T16:00:00Z'),
        price: '90.00'
      }
    ];

    const atFirstStart = ticketService.resolveTicketGroupPricing({
      defaultPrice: 100,
      pricingTiers,
      referenceDate: new Date('2026-05-08T15:00:00Z')
    });
    const atSharedBoundary = ticketService.resolveTicketGroupPricing({
      defaultPrice: 100,
      pricingTiers,
      referenceDate: new Date('2026-05-10T16:00:00Z')
    });
    const atLastEnd = ticketService.resolveTicketGroupPricing({
      defaultPrice: 100,
      pricingTiers,
      referenceDate: new Date('2026-05-12T16:00:00Z')
    });

    expect(atFirstStart.activePricingTier.name).toBe('Period 1');
    expect(atFirstStart.activePrice).toBe(80);
    expect(atSharedBoundary.activePricingTier.name).toBe('Period 2');
    expect(atSharedBoundary.activePrice).toBe(90);
    expect(atLastEnd.activePricingTier).toBeNull();
    expect(atLastEnd.activePrice).toBe(100);
  });

  test('resolveTicketGroupPricing ignores sold count when batches are period-controlled', () => {
    const result = ticketService.resolveTicketGroupPricing({
      defaultPrice: 100,
      pricingTiers: [
        {
          id: 1,
          position: 0,
          type: 'period',
          name: 'Current period',
          start_at: new Date('2026-05-08T15:00:00Z'),
          end_at: new Date('2026-05-10T16:00:00Z'),
          price: 80
        }
      ],
      referenceDate: new Date('2026-05-09T12:00:00Z'),
      soldCount: 999
    });

    expect(result.activePricingTier.name).toBe('Current period');
    expect(result.activePrice).toBe(80);
  });

  test('resolveTicketGroupPricing advances quantity batches in registration order', () => {
    const pricingTiers = [
      { id: 20, position: 1, type: 'quantity', name: 'Batch 2', quantity: 25, price: '70.00' },
      { id: 10, position: 0, type: 'quantity', name: 'Batch 1', quantity: 25, price: '50.00' }
    ];

    const firstBatch = ticketService.resolveTicketGroupPricing({
      defaultPrice: '100.00',
      pricingTiers,
      soldCount: 24
    });
    const secondBatch = ticketService.resolveTicketGroupPricing({
      defaultPrice: '100.00',
      pricingTiers,
      soldCount: 25
    });

    expect(firstBatch.activePrice).toBe(50);
    expect(firstBatch.activePricingTier.name).toBe('Batch 1');
    expect(secondBatch.activePrice).toBe(70);
    expect(secondBatch.activePricingTier.name).toBe('Batch 2');
  });

  test('resolveTicketGroupPricing falls back after all quantity batches are sold', () => {
    const result = ticketService.resolveTicketGroupPricing({
      defaultPrice: '100.00',
      pricingTiers: [
        { id: 1, position: 0, type: 'quantity', name: 'Only batch', quantity: 25, price: '50.00' }
      ],
      soldCount: 25
    });

    expect(result.activePrice).toBe(100);
    expect(result.activePricingTier).toBeNull();
  });

  test.each([
    [0, 'Batch 1', 50],
    [24, 'Batch 1', 50],
    [25, 'Batch 2', 70],
    [49, 'Batch 2', 70],
    [50, null, 100]
  ])('resolveTicketGroupPricing maps sold count %i to the expected quantity batch', (soldCount, expectedBatch, expectedPrice) => {
    const result = ticketService.resolveTicketGroupPricing({
      defaultPrice: 100,
      pricingTiers: [
        { id: 1, position: 0, type: 'quantity', name: 'Batch 1', quantity: 25, price: 50 },
        { id: 2, position: 1, type: 'quantity', name: 'Batch 2', quantity: 25, price: 70 }
      ],
      soldCount
    });

    expect(result.activePricingTier?.name || null).toBe(expectedBatch);
    expect(result.activePrice).toBe(expectedPrice);
  });

  test('updateTicketGroup rejects overlapping pricing tiers', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();

    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26 });

    await expect(ticketService.updateTicketGroup(26, 9, {
      checkoutUrl: '',
      productId: null,
      color: '#94a3b8',
      pricingTiers: [
        {
          name: 'Tier One',
          startDateTime: '2026-05-08T15:00:00.000Z',
          endDateTime: '2026-05-10T16:00:00.000Z',
          price: 80
        },
        {
          name: 'Tier Two',
          startDateTime: '2026-05-10T15:59:00.000Z',
          endDateTime: '2026-05-12T16:00:00.000Z',
          price: 90
        }
      ]
    }, 'user-1')).rejects.toThrow("cannot overlap");

    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error updating ticket group:',
      expect.any(Error)
    );
  });

  test.each(['', '   '])('updateTicketGroup rejects a missing batch name (%p)', async (name) => {
    const consoleErrorSpy = silenceExpectedConsoleError();
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Yellow' });

    await expect(ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        { name, type: 'quantity', quantity: 1, price: 50 }
      ]
    }, 'user-1')).rejects.toThrow('must have a name');

    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('updateTicketGroup accepts adjacent pricing tiers without intersection', async () => {
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26 });
    mockPrisma.ticketGroup.update.mockResolvedValue({
      id: 9,
      eventId: 26,
      groupKey: 'Yellow',
      description: 'Yellow',
      checkout_url: null,
      product_id: null,
      color: '#94a3b8',
      pricingTiers: [
        {
          id: 1,
          name: 'Tier One',
          start_at: new Date('2026-05-08T15:00:00Z'),
          end_at: new Date('2026-05-10T16:00:00Z'),
          price: '80.00'
        },
        {
          id: 2,
          name: 'Tier Two',
          start_at: new Date('2026-05-10T16:00:00Z'),
          end_at: new Date('2026-05-12T16:00:00Z'),
          price: '90.00'
        }
      ]
    });

    const updatedGroup = await ticketService.updateTicketGroup(26, 9, {
      salesDescription: '  Includes dinner and access to the premium area.  ',
      checkoutUrl: '',
      productId: null,
      color: '#94a3b8',
      pricingTiers: [
        {
          name: 'Tier One',
          startDateTime: '2026-05-08T15:00:00.000Z',
          endDateTime: '2026-05-10T16:00:00.000Z',
          price: 80
        },
        {
          name: 'Tier Two',
          startDateTime: '2026-05-10T16:00:00.000Z',
          endDateTime: '2026-05-12T16:00:00.000Z',
          price: 90
        }
      ]
    }, 'user-1');

    expect(mockPrisma.ticketGroup.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9 },
      data: expect.objectContaining({
        sales_description: 'Includes dinner and access to the premium area.',
        pricingTiers: expect.objectContaining({
          deleteMany: {},
          create: expect.arrayContaining([
            expect.objectContaining({
              name: 'Tier One',
              type: 'period',
              quantity: null,
              position: 0,
              price: '80'
            }),
            expect.objectContaining({
              name: 'Tier Two',
              type: 'period',
              quantity: null,
              position: 1,
              price: '90'
            })
          ])
        })
      })
    }));
    expect(updatedGroup.pricingTiers).toHaveLength(2);
  });

  test('updateTicketGroup stores quantity batches with explicit registration order', async () => {
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Yellow' });
    mockPrisma.ticket.count.mockResolvedValue(50);
    mockPrisma.ticketGroup.update.mockImplementation(async ({ data }) => ({
      id: 9,
      pricingTiers: data.pricingTiers.create
    }));

    await ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        { name: 'First 25', type: 'quantity', quantity: 25, price: 50 },
        { name: 'Next 25', type: 'quantity', quantity: 25, price: 70 }
      ]
    }, 'user-1');

    expect(mockPrisma.ticketGroup.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pricingTiers: expect.objectContaining({
          create: [
            expect.objectContaining({ name: 'First 25', type: 'quantity', quantity: 25, position: 0, start_at: null, end_at: null }),
            expect.objectContaining({ name: 'Next 25', type: 'quantity', quantity: 25, position: 1, start_at: null, end_at: null })
          ]
        })
      })
    }));
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
      where: { eventId: 26, description: 'Yellow' }
    });
  });

  test('updateTicketGroup accepts quantity batches whose cumulative quantity exactly matches group inventory', async () => {
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Yellow' });
    mockPrisma.ticket.count.mockResolvedValue(50);
    mockPrisma.ticketGroup.update.mockResolvedValue({ id: 9, pricingTiers: [] });

    await expect(ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        { name: 'First 20', type: 'quantity', quantity: 20, price: 50 },
        { name: 'Last 30', type: 'quantity', quantity: 30, price: 70 }
      ]
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 9 }));

    expect(mockPrisma.ticketGroup.update).toHaveBeenCalledTimes(1);
  });

  test('updateTicketGroup rejects quantity batches whose cumulative quantity exceeds group inventory', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Yellow' });
    mockPrisma.ticket.count.mockResolvedValue(50);

    await expect(ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        { name: 'First 25', type: 'quantity', quantity: 25, price: 50 },
        { name: 'Too many remaining', type: 'quantity', quantity: 26, price: 70 }
      ]
    }, 'user-1')).rejects.toThrow('configure 51 tickets, but this ticket group only has 50');

    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('updateTicketGroup rejects quantity batches when the ticket group has no inventory', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Empty group' });
    mockPrisma.ticket.count.mockResolvedValue(0);

    await expect(ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        { name: 'Impossible batch', type: 'quantity', quantity: 1, price: 50 }
      ]
    }, 'user-1')).rejects.toThrow('configure 1 tickets, but this ticket group only has 0');

    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test.each([
    ['zero', 0],
    ['negative', -1],
    ['fractional', 2.5],
    ['missing', undefined]
  ])('updateTicketGroup rejects a %s ticket quantity batch', async (_caseName, quantity) => {
    const consoleErrorSpy = silenceExpectedConsoleError();
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Yellow' });

    await expect(ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        { name: 'Invalid batch', type: 'quantity', quantity, price: 50 }
      ]
    }, 'user-1')).rejects.toThrow('whole number greater than zero');

    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('period batches remain independent of ticket group inventory size', async () => {
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26, description: 'Yellow' });
    mockPrisma.ticketGroup.update.mockResolvedValue({ id: 9, pricingTiers: [] });

    await ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        {
          name: 'Timed batch',
          type: 'period',
          startDateTime: '2026-05-08T15:00:00.000Z',
          endDateTime: '2026-05-10T16:00:00.000Z',
          price: 50
        }
      ]
    }, 'user-1');

    expect(mockPrisma.ticket.count).not.toHaveBeenCalled();
    expect(mockPrisma.ticketGroup.update).toHaveBeenCalledTimes(1);
  });

  test('updateTicketGroup does not allow period and quantity batches in the same group', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26 });

    await expect(ticketService.updateTicketGroup(26, 9, {
      pricingTiers: [
        {
          name: 'Period batch',
          type: 'period',
          startDateTime: '2026-05-08T15:00:00.000Z',
          endDateTime: '2026-05-10T16:00:00.000Z',
          price: 50
        },
        { name: 'Quantity batch', type: 'quantity', quantity: 25, price: 70 }
      ]
    }, 'user-1')).rejects.toThrow('same control type');

    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('updateTicketGroup rejects buyer descriptions longer than 500 characters', async () => {
    const consoleErrorSpy = silenceExpectedConsoleError();

    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26 });

    await expect(ticketService.updateTicketGroup(26, 9, {
      salesDescription: 'a'.repeat(501),
      pricingTiers: []
    }, 'user-1')).rejects.toThrow('cannot exceed 500 characters');

    expect(mockPrisma.ticketGroup.update).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error updating ticket group:',
      expect.any(Error)
    );
  });

  test('updateTicketGroup stores timezone-less pricing tier datetimes using the app timezone', async () => {
    mockPrisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    mockPrisma.ticketGroup.findFirst.mockResolvedValue({ id: 9, eventId: 26 });
    mockPrisma.ticketGroup.update.mockImplementation(async ({ data }) => ({
      id: 9,
      pricingTiers: data.pricingTiers.create
    }));

    const updatedGroup = await ticketService.updateTicketGroup(26, 9, {
      checkoutUrl: '',
      productId: null,
      color: '#94a3b8',
      pricingTiers: [
        {
          name: 'Lote 1',
          startDateTime: '2026-05-08T20:00',
          endDateTime: '2026-05-08T23:30',
          price: 80
        }
      ]
    }, 'user-1');

    expect(mockPrisma.ticketGroup.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pricingTiers: expect.objectContaining({
          create: [
            expect.objectContaining({
              name: 'Lote 1',
              start_at: expect.any(Date),
              end_at: expect.any(Date),
              price: '80'
            })
          ]
        })
      })
    }));
    expect(updatedGroup.pricingTiers[0].start_at.toISOString()).toBe('2026-05-08T23:00:00.000Z');
    expect(updatedGroup.pricingTiers[0].end_at.toISOString()).toBe('2026-05-09T02:30:00.000Z');
  });
});
