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
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
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
});
