const prisma = require('../config/prisma');
const qrCodeHashUtil = require('../utils/qrCodeHash');
const ticketQrLookupService = require('./ticketQrLookupService');

class CheckinService {
  _mapTicketForCheckin(ticket) {
    return {
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt
    };
  }

  _mapEventForCheckin(event) {
    return {
      id: event.id,
      name: event.name,
      venue: event.venue,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime
    };
  }

  _normalizeTicketIds(ticketIds) {
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      throw new Error('Ticket IDs array is required');
    }

    const normalizedTicketIds = Array.from(
      new Set(ticketIds.map((id) => parseInt(id, 10)).filter(Number.isInteger))
    );

    if (normalizedTicketIds.length === 0) {
      throw new Error('Ticket IDs array is required');
    }

    return normalizedTicketIds;
  }

  async _getOwnedEvent(eventId, userId) {
    const event = await prisma.event.findFirst({
      where: {
        id: parseInt(eventId, 10),
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

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    return event;
  }

  _buildSearchWhere(eventId, query, field) {
    const normalizedField = ['any', 'ticket', 'buyer', 'email', 'table', 'order'].includes(field) ? field : 'any';
    const normalizedQuery = String(query || '').trim();
    const numericQuery = parseInt(normalizedQuery, 10);
    const hasNumericQuery = /^\d+$/.test(normalizedQuery) && Number.isInteger(numericQuery);

    if (!normalizedQuery) {
      return null;
    }

    const baseWhere = { eventId: parseInt(eventId, 10) };
    const textContains = (key) => ({
      [key]: {
        contains: normalizedQuery,
        mode: 'insensitive'
      }
    });

    if (normalizedField === 'ticket') {
      if (!hasNumericQuery) return null;
      return { ...baseWhere, identificationNumber: numericQuery };
    }

    if (normalizedField === 'table') {
      if (!hasNumericQuery) return null;
      return { ...baseWhere, table: numericQuery };
    }

    if (normalizedField === 'buyer') {
      return { ...baseWhere, buyer: textContains('buyer').buyer };
    }

    if (normalizedField === 'email') {
      return { ...baseWhere, buyerEmail: textContains('buyerEmail').buyerEmail };
    }

    if (normalizedField === 'order') {
      return { ...baseWhere, order: textContains('order').order };
    }

    const conditions = [
      textContains('buyer'),
      textContains('buyerEmail'),
      textContains('order')
    ];

    if (hasNumericQuery) {
      conditions.push({ identificationNumber: numericQuery });
      conditions.push({ table: numericQuery });
    }

    return {
      ...baseWhere,
      OR: conditions
    };
  }

  _groupTicketsForSearch(matchedTickets, fullOrderTickets) {
    const ticketsByOrder = new Map();
    for (const ticket of fullOrderTickets) {
      if (!ticket.order) continue;
      const orderKey = String(ticket.order);
      if (!ticketsByOrder.has(orderKey)) {
        ticketsByOrder.set(orderKey, []);
      }
      ticketsByOrder.get(orderKey).push(ticket);
    }

    const groups = [];
    const includedKeys = new Set();

    for (const ticket of matchedTickets) {
      if (ticket.order) {
        const orderKey = String(ticket.order);
        if (includedKeys.has(`order:${orderKey}`)) continue;

        const orderTickets = (ticketsByOrder.get(orderKey) || [ticket])
          .sort((a, b) => a.identificationNumber - b.identificationNumber);
        const primaryTicket = orderTickets[0] || ticket;

        groups.push({
          key: `order:${orderKey}`,
          type: 'order',
          order: orderKey,
          label: `Order ${orderKey}`,
          buyer: primaryTicket.buyer || null,
          buyerEmail: primaryTicket.buyerEmail || null,
          table: primaryTicket.table || null,
          ticketCount: orderTickets.length,
          checkedInCount: orderTickets.filter((item) => item.checkedIn).length,
          tickets: orderTickets.map((item) => this._mapTicketForCheckin(item))
        });
        includedKeys.add(`order:${orderKey}`);
      } else {
        const standaloneKey = `ticket:${ticket.id}`;
        if (includedKeys.has(standaloneKey)) continue;

        groups.push({
          key: standaloneKey,
          type: 'ticket',
          order: null,
          label: `Ticket #${ticket.identificationNumber}`,
          buyer: ticket.buyer || null,
          buyerEmail: ticket.buyerEmail || null,
          table: ticket.table || null,
          ticketCount: 1,
          checkedInCount: ticket.checkedIn ? 1 : 0,
          tickets: [this._mapTicketForCheckin(ticket)]
        });
        includedKeys.add(standaloneKey);
      }
    }

    return groups;
  }

  async searchTicketsForCheckin(eventId, userId, options = {}) {
    try {
      const event = await this._getOwnedEvent(eventId, userId);
      const field = options.field || 'any';
      const query = String(options.query || '').trim();
      const where = this._buildSearchWhere(event.id, query, field);

      if (!where) {
        return {
          success: true,
          event: this._mapEventForCheckin(event),
          query,
          field,
          groups: [],
          count: 0
        };
      }

      const matchedTickets = await prisma.ticket.findMany({
        where,
        orderBy: [
          { order: 'asc' },
          { identificationNumber: 'asc' }
        ]
      });

      const orderIds = Array.from(
        new Set(matchedTickets.map((ticket) => ticket.order).filter(Boolean).map(String))
      );
      const fullOrderTickets = orderIds.length
        ? await prisma.ticket.findMany({
            where: {
              eventId: event.id,
              order: {
                in: orderIds
              }
            },
            orderBy: [
              { order: 'asc' },
              { identificationNumber: 'asc' }
            ]
          })
        : [];
      const groups = this._groupTicketsForSearch(matchedTickets, fullOrderTickets);

      return {
        success: true,
        event: this._mapEventForCheckin(event),
        query,
        field,
        groups,
        count: groups.length
      };
    } catch (error) {
      console.error('Error searching tickets for check-in:', error);
      throw new Error(`Failed to search tickets for check-in: ${error.message}`);
    }
  }

  async processSelectedTicketCheckins(eventId, userId, ticketIds) {
    try {
      const event = await this._getOwnedEvent(eventId, userId);
      const normalizedTicketIds = this._normalizeTicketIds(ticketIds);

      const tickets = await prisma.ticket.findMany({
        where: {
          id: { in: normalizedTicketIds },
          eventId: event.id
        },
        orderBy: {
          identificationNumber: 'asc'
        }
      });

      if (tickets.length !== normalizedTicketIds.length) {
        const foundTicketIds = new Set(tickets.map((ticket) => ticket.id));
        const missingTicketIds = normalizedTicketIds.filter((id) => !foundTicketIds.has(id));
        throw new Error(`Some tickets were not found or access denied: ${missingTicketIds.join(', ')}`);
      }

      const alreadyCheckedIn = tickets.filter((ticket) => ticket.checkedIn).map((ticket) => this._mapTicketForCheckin(ticket));
      const ticketsToCheckIn = tickets.filter((ticket) => !ticket.checkedIn);
      const checkedInAt = new Date();

      if (ticketsToCheckIn.length > 0) {
        await prisma.ticket.updateMany({
          where: {
            id: {
              in: ticketsToCheckIn.map((ticket) => ticket.id)
            },
            eventId: event.id,
            checkedIn: false
          },
          data: {
            checkedIn: true,
            checkedInAt
          }
        });
      }

      const updatedTickets = tickets.map((ticket) => {
        if (ticket.checkedIn) {
          return this._mapTicketForCheckin(ticket);
        }

        return this._mapTicketForCheckin({
          ...ticket,
          checkedIn: true,
          checkedInAt
        });
      });

      return {
        success: true,
        message: `${ticketsToCheckIn.length} ticket(s) checked in successfully`,
        event: this._mapEventForCheckin(event),
        tickets: updatedTickets,
        checkedIn: updatedTickets.filter((ticket) => !alreadyCheckedIn.some((item) => item.id === ticket.id)),
        alreadyCheckedIn,
        checkedInCount: ticketsToCheckIn.length,
        alreadyCheckedInCount: alreadyCheckedIn.length
      };
    } catch (error) {
      console.error('Error processing selected ticket check-ins:', error);
      throw new Error(`Failed to process selected ticket check-ins: ${error.message}`);
    }
  }

  
  /**
   * Find ticket by QR code hash
   * 
   * @param {string} hash - The QR code hash from the URL
   * @returns {Object} - Ticket information with event details
   */
  async findTicketByHash(hash) {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Invalid hash format');
      }

      const ticket = await ticketQrLookupService.findTicketByHash(hash, {
        include: {
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              opening_datetime: true,
              closing_datetime: true,
              created_by: true
            }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found for the provided hash');
      }

      return {
        id: ticket.id,
        eventId: ticket.eventId,
        description: ticket.description,
        identificationNumber: ticket.identificationNumber,
        location: ticket.location,
        table: ticket.table,
        price: parseFloat(ticket.price) || 0,
        buyer: ticket.buyer,
        buyerDocument: ticket.buyerDocument,
        buyerEmail: ticket.buyerEmail,
        checkedIn: ticket.checkedIn,
        checkedInAt: ticket.checkedInAt,
        event: {
          id: ticket.event.id,
          name: ticket.event.name,
          venue: ticket.event.venue,
          opening_datetime: ticket.event.opening_datetime,
          closing_datetime: ticket.event.closing_datetime,
          created_by: ticket.event.created_by
        },
        hash: ticket.qrCodeHash
      };
    } catch (error) {
      console.error('Error finding ticket by hash:', error);
      throw new Error(`Failed to find ticket: ${error.message}`);
    }
  }

  /**
   * Get check-in status for a ticket by hash
   * 
   * @param {string} hash - The QR code hash from the URL
   * @returns {Object} - Check-in status information
   */
  async getCheckinStatus(hash) {
    try {
      const ticket = await this.findTicketByHash(hash);

      return {
        success: true,
        ticket: {
          id: ticket.id,
          identificationNumber: ticket.identificationNumber,
          description: ticket.description,
          location: ticket.location,
          table: ticket.table,
          buyer: ticket.buyer,
          buyerDocument: ticket.buyerDocument,
          checkedIn: ticket.checkedIn,
          checkedInAt: ticket.checkedInAt
        },
        event: {
          name: ticket.event.name,
          venue: ticket.event.venue,
          opening_datetime: ticket.event.opening_datetime,
          closing_datetime: ticket.event.closing_datetime
        },
        canCheckin: !ticket.checkedIn,
        hash: hash
      };
    } catch (error) {
      console.error('Error getting check-in status:', error);
      throw new Error(`Failed to get check-in status: ${error.message}`);
    }
  }

  /**
   * Process ticket check-in
   * 
   * @param {string} hash - The QR code hash from the URL
   * @returns {Object} - Check-in result
   */
  async processCheckin(hash) {
    try {
      const ticket = await this.findTicketByHash(hash);

      // Check if already checked in
      if (ticket.checkedIn) {
        return {
          success: false,
          alreadyCheckedIn: true,
          message: 'This ticket has already been checked in',
          ticket: {
            id: ticket.id,
            identificationNumber: ticket.identificationNumber,
            description: ticket.description,
            location: ticket.location,
            table: ticket.table,
            buyer: ticket.buyer,
            buyerDocument: ticket.buyerDocument,
            checkedIn: ticket.checkedIn,
            checkedInAt: ticket.checkedInAt
          },
          event: {
            name: ticket.event.name,
            venue: ticket.event.venue
          }
        };
      }

      // Process the check-in
      const checkedInAt = new Date();
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          checkedIn: true,
          checkedInAt: checkedInAt
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              opening_datetime: true,
              closing_datetime: true
            }
          }
        }
      });

      return {
        success: true,
        message: 'Check-in completed successfully',
        ticket: {
          id: updatedTicket.id,
          identificationNumber: updatedTicket.identificationNumber,
          description: updatedTicket.description,
          location: updatedTicket.location,
          table: updatedTicket.table,
          buyer: updatedTicket.buyer,
          buyerDocument: updatedTicket.buyerDocument,
          checkedIn: updatedTicket.checkedIn,
          checkedInAt: updatedTicket.checkedInAt
        },
        event: {
          name: updatedTicket.event.name,
          venue: updatedTicket.event.venue,
          opening_datetime: updatedTicket.event.opening_datetime,
          closing_datetime: updatedTicket.event.closing_datetime
        }
      };
    } catch (error) {
      console.error('Error processing check-in:', error);
      throw new Error(`Failed to process check-in: ${error.message}`);
    }
  }

  /**
   * Generate check-in hash for a ticket (for testing purposes)
   * 
   * @param {number} ticketId - The ticket ID
   * @param {string} userId - The user ID who owns the event
   * @returns {string} - The check-in hash
   */
  async generateCheckinHash(ticketId, userId) {
    try {
      const ticket = await prisma.ticket.findFirst({
        where: { 
          id: parseInt(ticketId),
          event: {
            created_by: userId
          }
        },
        include: {
          event: {
            select: {
              id: true,
              created_by: true
            }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found or access denied');
      }

      const qrCodeHash = ticket.qrCodeHash || qrCodeHashUtil.generateQrCodeHash(
        ticket.event.created_by,
        ticket.eventId,
        ticket.id
      );

      if (!ticket.qrCodeHash) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCodeHash }
        });
      }

      return qrCodeHash;
    } catch (error) {
      console.error('Error generating check-in hash:', error);
      throw new Error(`Failed to generate check-in hash: ${error.message}`);
    }
  }

  /**
   * Get check-in statistics for an event
   * 
   * @param {number} eventId - The event ID
   * @param {string} userId - The user ID who owns the event
   * @returns {Object} - Check-in statistics
   */
  async getEventCheckinStats(eventId, userId) {
    try {
      // Verify event exists and user owns it
      const event = await prisma.event.findFirst({
        where: { 
          id: parseInt(eventId), 
          created_by: userId 
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const stats = await prisma.ticket.groupBy({
        by: ['checkedIn'],
        where: { eventId: parseInt(eventId) },
        _count: {
          id: true
        }
      });

      let totalTickets = 0;
      let checkedInTickets = 0;

      stats.forEach(stat => {
        if (stat.checkedIn) {
          checkedInTickets = stat._count.id;
        }
        totalTickets += stat._count.id;
      });

      const notCheckedIn = totalTickets - checkedInTickets;

      return {
        success: true,
        eventId: parseInt(eventId),
        stats: {
          totalTickets,
          checkedInTickets,
          notCheckedIn,
          checkedInPercentage: totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error getting event check-in stats:', error);
      throw new Error(`Failed to get check-in stats: ${error.message}`);
    }
  }
}

module.exports = new CheckinService();
