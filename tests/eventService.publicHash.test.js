jest.mock('../config/prisma', () => ({
  event: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

const prisma = require('../config/prisma');
const eventService = require('../services/eventService');

describe('EventService public hash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generatePublicHash returns a short unique hash', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    const publicHash = await eventService.generatePublicHash();

    expect(typeof publicHash).toBe('string');
    expect(publicHash.length).toBeLessThanOrEqual(16);
    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { public_hash: publicHash },
      select: { id: true }
    });
  });

  test('getEventByPublicHash fetches the event by hash', async () => {
    const event = { id: 26, public_hash: 'abc123def456' };
    prisma.event.findUnique.mockResolvedValue(event);

    const result = await eventService.getEventByPublicHash('abc123def456');

    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { public_hash: 'abc123def456' }
    });
    expect(result).toBe(event);
  });

  test('createEvent stores timezone-less datetimes using the app timezone instead of the server timezone', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    prisma.event.create.mockImplementation(async ({ data }) => data);

    const result = await eventService.createEvent({
      name: 'Sunset Session',
      event_image_url: null,
      mobile_event_image_url: null,
      promotional_image: null,
      opening_datetime: '2026-05-08T20:00',
      closing_datetime: '2026-05-08T23:30',
      map_image: null,
      description: 'Live set',
      additional_information: '<p>Doors open at 19:00.</p>',
      venue: 'Sao Paulo',
      sale_mode: 'checkout',
      checkout_page_id: null,
      checkout_page_title: null,
      cart_payment_service_id: null,
      reservation_expires_in_minutes: 10,
      created_by: 'user-1'
    });

    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        opening_datetime: expect.any(Date),
        closing_datetime: expect.any(Date),
        additional_information: '<p>Doors open at 19:00.</p>'
      })
    }));
    expect(result.opening_datetime.toISOString()).toBe('2026-05-08T23:00:00.000Z');
    expect(result.closing_datetime.toISOString()).toBe('2026-05-09T02:30:00.000Z');
  });

  test('updateEvent persists additional information', async () => {
    prisma.event.findFirst.mockResolvedValue({ id: 26, created_by: 'user-1' });
    prisma.event.update.mockImplementation(async ({ data }) => data);

    await eventService.updateEvent(26, {
      additional_information: '<p>Parking is available.</p>'
    }, 'user-1');

    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 26, created_by: 'user-1' },
      data: expect.objectContaining({
        additional_information: '<p>Parking is available.</p>'
      })
    }));
  });
});
