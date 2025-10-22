const { PrismaClient } = require('../generated/prisma');
const qrCodeHashUtil = require('../utils/qrCodeHash');

const prisma = new PrismaClient();

class CheckinService {
  
  /**
   * Find ticket by QR code hash
   * Since hashes are deterministic but not reversible, we need to search through possible matches
   * 
   * @param {string} hash - The QR code hash from the URL
   * @returns {Object} - Ticket information with event details
   */
  async findTicketByHash(hash) {
    try {
      if (!hash || typeof hash !== 'string') {
        throw new Error('Invalid hash format');
      }

      // Get all tickets that could potentially match this hash
      // We'll need to check each ticket against the hash
      const allTickets = await prisma.ticket.findMany({
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

      // Check each ticket to see if its hash matches
      for (const ticket of allTickets) {
        const expectedHash = qrCodeHashUtil.generateQrCodeHash(
          ticket.event.created_by,
          ticket.eventId,
          ticket.id
        );

        if (expectedHash === hash) {
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
            hash: hash
          };
        }
      }

      throw new Error('Ticket not found for the provided hash');
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

      return qrCodeHashUtil.generateQrCodeHash(
        ticket.event.created_by,
        ticket.eventId,
        ticket.id
      );
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