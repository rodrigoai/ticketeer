const { PrismaClient } = require('../generated/prisma');
const { Decimal } = require('decimal.js');

const prisma = new PrismaClient();

class TicketService {

  /**
   * Create a single ticket with atomic identification number assignment
   */
  async createTicket(eventId, ticketData, userId) {
    try {
      const {
        description,
        location,
        table,
        price,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        salesEndDateTime
      } = ticketData;

      // Validate required fields
      if (!description || price === undefined || price === null) {
        throw new Error('Description and price are required');
      }

      // Validate price is a positive number
      const priceDecimal = new Decimal(price);
      if (priceDecimal.lt(0)) {
        throw new Error('Price must be a positive number');
      }

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

      // Use transaction to atomically assign identification number
      const ticket = await prisma.$transaction(async (tx) => {
        // Increment the counter and get the new value
        const updatedEvent = await tx.event.update({
          where: { id: parseInt(eventId) },
          data: { 
            nextTicketNumber: { increment: 1 } 
          },
          select: { nextTicketNumber: true }
        });

        const identificationNumber = updatedEvent.nextTicketNumber - 1;

        // Create the ticket with the assigned identification number
        return await tx.ticket.create({
          data: {
            eventId: parseInt(eventId),
            description,
            identificationNumber,
            location: location || null,
            table: table ? parseInt(table) : null,
            price: priceDecimal.toString(),
            order: order || null,
            buyer: buyer || null,
            buyerDocument: buyerDocument || null,
            buyerEmail: buyerEmail || null,
            salesEndDateTime: salesEndDateTime ? new Date(salesEndDateTime) : null
          }
        });
      });

      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  /**
   * Create multiple tickets in batch with sequential identification numbers
   */
  async createTicketsBatch(eventId, ticketData, quantity, userId) {
    try {
      if (!quantity || quantity < 1 || quantity > 100) {
        throw new Error('Quantity must be between 1 and 100');
      }

      const {
        description,
        location,
        table,
        price,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        salesEndDateTime
      } = ticketData;

      // Validate required fields
      if (!description || price === undefined || price === null) {
        throw new Error('Description and price are required');
      }

      const priceDecimal = new Decimal(price);
      if (priceDecimal.lt(0)) {
        throw new Error('Price must be a positive number');
      }

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

      // Use transaction to atomically assign sequential identification numbers
      const tickets = await prisma.$transaction(async (tx) => {
        // Increment the counter by quantity and get the new value
        const updatedEvent = await tx.event.update({
          where: { id: parseInt(eventId) },
          data: { 
            nextTicketNumber: { increment: quantity } 
          },
          select: { nextTicketNumber: true }
        });

        const startingNumber = updatedEvent.nextTicketNumber - quantity;

        // Create all tickets with sequential numbers
        const ticketsToCreate = [];
        for (let i = 0; i < quantity; i++) {
          ticketsToCreate.push({
            eventId: parseInt(eventId),
            description,
            identificationNumber: startingNumber + i,
            location: location || null,
            table: table ? parseInt(table) : null,
            price: priceDecimal.toString(),
            order: order || null,
            buyer: buyer || null,
            buyerDocument: buyerDocument || null,
            buyerEmail: buyerEmail || null,
            salesEndDateTime: salesEndDateTime ? new Date(salesEndDateTime) : null
          });
        }

        // Batch insert all tickets
        const createdTickets = [];
        for (const ticketData of ticketsToCreate) {
          const ticket = await tx.ticket.create({ data: ticketData });
          createdTickets.push(ticket);
        }

        return createdTickets;
      });

      return tickets;
    } catch (error) {
      console.error('Error creating tickets batch:', error);
      throw new Error(`Failed to create tickets: ${error.message}`);
    }
  }

  /**
   * Get all tickets for an event
   */
  async getTicketsByEvent(eventId, userId) {
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

      const tickets = await prisma.ticket.findMany({
        where: { eventId: parseInt(eventId) },
        orderBy: { identificationNumber: 'asc' }
      });

      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicketById(ticketId, userId) {
    try {
      const ticket = await prisma.ticket.findFirst({
        where: { 
          id: parseInt(ticketId) 
        },
        include: {
          event: {
            select: { created_by: true }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Check if user owns the event
      if (ticket.event.created_by !== userId) {
        throw new Error('Access denied');
      }

      return ticket;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }
  }

  /**
   * Update a ticket (cannot change identification number)
   */
  async updateTicket(ticketId, ticketData, userId) {
    try {
      const {
        description,
        location,
        table,
        price,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        salesEndDateTime
      } = ticketData;

      // Get existing ticket and verify ownership
      const existingTicket = await this.getTicketById(ticketId, userId);

      // Validate price if provided
      let priceDecimal;
      if (price !== undefined && price !== null) {
        priceDecimal = new Decimal(price);
        if (priceDecimal.lt(0)) {
          throw new Error('Price must be a positive number');
        }
      }

      const updateData = {};
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location || null;
      if (table !== undefined) updateData.table = table ? parseInt(table) : null;
      if (price !== undefined) updateData.price = priceDecimal.toString();
      if (order !== undefined) updateData.order = order || null;
      if (buyer !== undefined) updateData.buyer = buyer || null;
      if (buyerDocument !== undefined) updateData.buyerDocument = buyerDocument || null;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail || null;
      if (salesEndDateTime !== undefined) updateData.salesEndDateTime = salesEndDateTime ? new Date(salesEndDateTime) : null;

      const updatedTicket = await prisma.ticket.update({
        where: { id: parseInt(ticketId) },
        data: updateData
      });

      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId, userId) {
    try {
      // Verify ownership
      await this.getTicketById(ticketId, userId);

      const deletedTicket = await prisma.ticket.delete({
        where: { id: parseInt(ticketId) }
      });

      return deletedTicket;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  /**
   * Delete multiple tickets
   */
  async deleteTickets(ticketIds, userId) {
    try {
      if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        throw new Error('Ticket IDs array is required');
      }

      // Verify ownership of all tickets
      for (const ticketId of ticketIds) {
        await this.getTicketById(ticketId, userId);
      }

      const deletedTickets = await prisma.ticket.deleteMany({
        where: { 
          id: { 
            in: ticketIds.map(id => parseInt(id)) 
          } 
        }
      });

      return deletedTickets;
    } catch (error) {
      console.error('Error deleting tickets:', error);
      throw new Error(`Failed to delete tickets: ${error.message}`);
    }
  }

  /**
   * Get ticket statistics for an event
   */
  async getEventTicketStats(eventId, userId) {
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

      const stats = await prisma.ticket.aggregate({
        where: { eventId: parseInt(eventId) },
        _count: { id: true },
        _sum: { price: true },
        _avg: { price: true },
        _min: { price: true },
        _max: { price: true }
      });

      return {
        totalTickets: stats._count.id || 0,
        totalRevenue: stats._sum.price || '0',
        averagePrice: stats._avg.price || '0',
        minPrice: stats._min.price || '0',
        maxPrice: stats._max.price || '0'
      };
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      throw new Error(`Failed to fetch ticket statistics: ${error.message}`);
    }
  }

  /**
   * Search tickets by event with filtering and privacy protection
   * @param {number} eventId - Event ID to search tickets for
   * @param {string} userId - User ID for authorization
   * @param {boolean} availableOnly - If true, return only available tickets (no order + sales not ended)
   * @returns {Array} Filtered tickets without buyer information for privacy
   */
  async searchTicketsByEvent(eventId, userId, availableOnly = false) {
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

      // Build where clause based on availability filter
      const whereClause = {
        eventId: parseInt(eventId)
      };

      if (availableOnly) {
        const currentDateTime = new Date();
        
        whereClause.AND = [
          // No order field filled (unsold)
          {
            OR: [
              { order: null },
              { order: '' }
            ]
          },
          // Sales end date time is either null or in the future
          {
            OR: [
              { salesEndDateTime: null },
              { salesEndDateTime: { gt: currentDateTime } }
            ]
          }
        ];
      }

      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        orderBy: { identificationNumber: 'asc' },
        select: {
          // Include all fields except buyer information for privacy
          id: true,
          eventId: true,
          description: true,
          identificationNumber: true,
          location: true,
          table: true,
          price: true,
          order: true, // Keep order field as required
          salesEndDateTime: true,
          created_at: true,
          updated_at: true,
          // Explicitly exclude buyer information for privacy
          // buyer: false,
          // buyerDocument: false,
          // buyerEmail: false,
        }
      });

      return tickets;
    } catch (error) {
      console.error('Error searching tickets:', error);
      throw new Error(`Failed to search tickets: ${error.message}`);
    }
  }

  /**
   * Process checkout webhook to confirm ticket purchases
   * @param {Object} webhookPayload - The webhook payload from payment system
   * @param {string} userId - The user ID to validate ticket ownership
   * @returns {Object} - Processing result with updated tickets info
   */
  async processCheckoutWebhook(webhookPayload, userId) {
    try {
      // Validate webhook payload structure
      if (!webhookPayload.payload || !webhookPayload.payload.meta) {
        throw new Error('Invalid webhook payload: missing payload or meta object');
      }

      const { meta, customer, id: orderId } = webhookPayload.payload;

      // Validate required meta fields
      if (!meta.tickets) {
        throw new Error('Invalid webhook payload: missing meta.tickets');
      }

      // Parse tickets from JSON string
      let ticketIds;
      try {
        ticketIds = JSON.parse(meta.tickets);
        if (!Array.isArray(ticketIds)) {
          // Handle single ticket as array
          ticketIds = [ticketIds];
        }
      } catch (error) {
        throw new Error('Invalid webhook payload: meta.tickets is not valid JSON');
      }

      if (ticketIds.length === 0) {
        throw new Error('Invalid webhook payload: no ticket IDs provided');
      }

      // Convert ticket IDs to integers
      const ticketIdsInt = ticketIds.map(id => {
        const intId = parseInt(id, 10);
        if (isNaN(intId)) {
          throw new Error(`Invalid ticket ID: ${id}`);
        }
        return intId;
      });

      // Parse table number if present (optional)
      let tableNumber = null;
      if (meta.tableNumber) {
        tableNumber = parseInt(meta.tableNumber, 10);
        if (isNaN(tableNumber)) {
          throw new Error(`Invalid table number: ${meta.tableNumber}`);
        }
      }

      // Check if tickets exist and are available, and validate they belong to events owned by the specified userId
      const existingTickets = await prisma.ticket.findMany({
        where: {
          id: { in: ticketIdsInt }
        },
        include: {
          event: {
            select: {
              id: true,
              created_by: true,
              name: true
            }
          }
        }
      });

      if (existingTickets.length !== ticketIdsInt.length) {
        const foundIds = existingTickets.map(t => t.id);
        const missingIds = ticketIdsInt.filter(id => !foundIds.includes(id));
        throw new Error(`Tickets not found: ${missingIds.join(', ')}`);
      }

      // Validate that all tickets belong to events owned by the specified userId
      const invalidTickets = existingTickets.filter(t => t.event.created_by !== userId);
      if (invalidTickets.length > 0) {
        const invalidIds = invalidTickets.map(t => t.id);
        throw new Error(`Tickets do not belong to user ${userId}: ${invalidIds.join(', ')}`);
      }

      // Check if any tickets are already sold
      const soldTickets = existingTickets.filter(t => t.order && t.order.trim() !== '');
      if (soldTickets.length > 0) {
        const soldIds = soldTickets.map(t => t.id);
        throw new Error(`Tickets already sold: ${soldIds.join(', ')}`);
      }

      // Prepare buyer information for single ticket purchases
      let buyerInfo = {};
      if (ticketIdsInt.length === 1 && customer) {
        buyerInfo = {
          buyer: customer.name || null,
          buyerDocument: customer.identification || null,
          buyerEmail: customer.email || null
        };
      }

      // Update tickets with order information
      const updateData = {
        order: orderId.toString(),
        ...buyerInfo
      };

      // Only include table number if it was provided
      if (tableNumber !== null) {
        updateData.table = tableNumber;
      }

      const updatedTickets = [];
      for (const ticketId of ticketIdsInt) {
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: updateData
        });
        updatedTickets.push(updatedTicket);
      }

      const result = {
        success: true,
        message: `Successfully processed ${ticketIdsInt.length} ticket(s)`,
        orderId: orderId.toString(),
        ticketIds: ticketIdsInt,
        updatedTickets,
        buyerAssigned: Object.keys(buyerInfo).length > 0
      };

      // Only include table number in response if it was provided
      if (tableNumber !== null) {
        result.tableNumber = tableNumber;
      }

      return result;

    } catch (error) {
      console.error('Error processing checkout webhook:', error);
      throw error;
    }
  }

  /**
   * Close the Prisma connection
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = new TicketService();
