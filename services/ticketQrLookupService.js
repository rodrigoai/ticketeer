const prisma = require('../config/prisma');
const qrCodeHashUtil = require('../utils/qrCodeHash');

class TicketQrLookupService {
  async findTicketByHash(hash, queryOptions = {}) {
    const directMatch = await prisma.ticket.findUnique({
      where: { qrCodeHash: hash },
      ...queryOptions
    });

    if (directMatch) {
      return directMatch;
    }

    const legacyMatch = await this.findLegacyDeterministicMatch(hash);
    if (!legacyMatch) {
      return null;
    }

    if (legacyMatch.qrCodeHash) {
      return prisma.ticket.findUnique({
        where: { id: legacyMatch.id },
        ...queryOptions
      });
    }

    try {
      return await prisma.ticket.update({
        where: { id: legacyMatch.id },
        data: { qrCodeHash: hash },
        ...queryOptions
      });
    } catch (error) {
      const migratedMatch = await prisma.ticket.findUnique({
        where: { qrCodeHash: hash },
        ...queryOptions
      });

      if (migratedMatch) {
        return migratedMatch;
      }

      throw error;
    }
  }

  async findLegacyDeterministicMatch(hash) {
    const candidates = await prisma.ticket.findMany({
      where: {
        OR: [
          { order: { not: null } },
          { buyerEmail: { not: null } }
        ]
      },
      select: {
        id: true,
        eventId: true,
        qrCodeHash: true,
        event: {
          select: {
            created_by: true
          }
        }
      }
    });

    return candidates.find((ticket) => {
      if (!ticket.event?.created_by) {
        return false;
      }

      return qrCodeHashUtil.generateQrCodeHash(
        ticket.event.created_by,
        ticket.eventId,
        ticket.id
      ) === hash;
    }) || null;
  }
}

module.exports = new TicketQrLookupService();
