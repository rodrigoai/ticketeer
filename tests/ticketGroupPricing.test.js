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
      findMany: jest.fn()
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
            expect.objectContaining({ name: 'Tier One', price: '80' }),
            expect.objectContaining({ name: 'Tier Two', price: '90' })
          ])
        })
      })
    }));
    expect(updatedGroup.pricingTiers).toHaveLength(2);
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
