jest.mock('../config/prisma', () => ({
  event: {
    findUnique: jest.fn(),
    create: jest.fn()
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
});
