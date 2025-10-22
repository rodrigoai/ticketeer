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
        salesEndDateTime,
        checkedIn,
        checkedInAt
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
      if (checkedIn !== undefined) updateData.checkedIn = Boolean(checkedIn);
      if (checkedInAt !== undefined) updateData.checkedInAt = checkedInAt ? new Date(checkedInAt) : null;

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

      // Count tickets that are checked in
      const checkedInCount = await prisma.ticket.count({
        where: { 
          eventId: parseInt(eventId),
          checkedIn: true
        }
      });

      return {
        totalTickets: stats._count.id || 0,
        totalRevenue: stats._sum.price || '0',
        averagePrice: stats._avg.price || '0',
        minPrice: stats._min.price || '0',
        maxPrice: stats._max.price || '0',
        checkedInTickets: checkedInCount
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
   * Uses quantity-based selection or table-based selection depending on payload
   * NEW BEHAVIOR: Only the first ticket gets buyer information, all tickets get order field
   * UPDATED: Supports Base64-encoded eventId in meta.eventId for event-specific ticket selection
   * @param {Object} webhookPayload - The webhook payload from payment system
   * @param {string} userId - The user ID to validate ticket ownership
   * @returns {Object} - Processing result with updated tickets info
   */
  async processCheckoutWebhook(webhookPayload, userId) {
    try {
      // Validate webhook payload structure
      if (!webhookPayload.payload) {
        throw new Error('Invalid webhook payload: missing payload object');
      }

      const { payload } = webhookPayload;
      const { meta, customer, id: orderId, items } = payload;
      
      // Validate required fields
      if (!orderId) {
        throw new Error('Invalid webhook payload: missing order ID');
      }

      // NEW: Decode Base64 eventId from meta.eventId
      let decodedEventId = null;
      console.log('🔍 [DEBUG] Starting eventId processing...');
      console.log('🔍 [DEBUG] meta object:', JSON.stringify(meta, null, 2));
      
      if (meta && meta.eventId) {
        try {
          // Decode Base64 eventId
          const base64EventId = meta.eventId;
          decodedEventId = Buffer.from(base64EventId, 'base64').toString('utf8');
          console.log(`🔍 [DEBUG] Decoded eventId: ${decodedEventId} (from Base64: ${base64EventId})`);
          
          // Validate that decoded eventId is a valid number
          const eventIdNumber = parseInt(decodedEventId, 10);
          if (isNaN(eventIdNumber) || eventIdNumber <= 0) {
            throw new Error(`Invalid decoded eventId: ${decodedEventId}`);
          }
          
          decodedEventId = eventIdNumber;
          console.log(`🔍 [DEBUG] Final decodedEventId: ${decodedEventId} (type: ${typeof decodedEventId})`);
        } catch (decodeError) {
          console.error('❌ [DEBUG] Failed to decode Base64 eventId:', decodeError);
          throw new Error(`Failed to decode eventId from Base64: ${meta.eventId}`);
        }
      } else {
        console.log('🔍 [DEBUG] No eventId provided in meta, will search across all user events');
      }

      // Parse table number if present
      let tableNumber = null;
      if (meta && meta.tableNumber) {
        tableNumber = parseInt(meta.tableNumber, 10);
        if (isNaN(tableNumber)) {
          throw new Error(`Invalid table number: ${meta.tableNumber}`);
        }
      }

      // Validate that the decoded eventId belongs to the user (if provided)
      if (decodedEventId) {
        console.log(`🔍 [DEBUG] Validating eventId ${decodedEventId} for user ${userId}`);
        const event = await prisma.event.findFirst({
          where: {
            id: decodedEventId,
            created_by: userId
          },
          select: {
            id: true,
            name: true,
            created_by: true
          }
        });
        
        console.log(`🔍 [DEBUG] Event validation result:`, JSON.stringify(event, null, 2));
        
        if (!event) {
          console.error(`❌ [DEBUG] Event with ID ${decodedEventId} not found or does not belong to user ${userId}`);
          throw new Error(`Event with ID ${decodedEventId} not found or does not belong to user ${userId}`);
        }
        
        console.log(`✅ [DEBUG] Event validated: ${event.name} (ID: ${event.id}) for user ${userId}`);
      }

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        let ticketsToUpdate;
        let selectionMethod;

        if (tableNumber !== null) {
          // CASE 1: Table-based selection - update all tickets for this table
          selectionMethod = 'table-based';
          
          // Build where clause with optional eventId filter
          const whereClause = {
            table: tableNumber,
            event: {
              created_by: userId
            }
          };
          
          // If eventId is provided, filter by specific event
          if (decodedEventId) {
            whereClause.eventId = decodedEventId;
          }
          
          ticketsToUpdate = await tx.ticket.findMany({
            where: whereClause,
            include: {
              event: {
                select: {
                  id: true,
                  created_by: true,
                  name: true
                }
              }
            },
            orderBy: {
              identificationNumber: 'asc'
            }
          });

          if (ticketsToUpdate.length === 0) {
            const eventFilter = decodedEventId ? ` for event ${decodedEventId}` : '';
            throw new Error(`No tickets found for table ${tableNumber}${eventFilter} belonging to user ${userId}`);
          }

        } else {
          // CASE 2: Quantity-based selection - find N unsold tickets without table numbers
          selectionMethod = 'quantity-based';
          
          // Determine quantity from items array
          let quantity = 0;
          if (items && Array.isArray(items)) {
            quantity = items.reduce((total, item) => total + (item.quantity || 0), 0);
          }
          
          if (quantity <= 0) {
            throw new Error('Invalid webhook payload: no valid quantity found in items');
          }

          // Build where clause for unsold tickets without table numbers
          console.log(`🔍 [DEBUG] Building WHERE clause for quantity-based selection...`);
          console.log(`🔍 [DEBUG] quantity: ${quantity}, userId: ${userId}, decodedEventId: ${decodedEventId}`);
          
          const whereClause = {
            AND: [
              {
                event: {
                  created_by: userId
                }
              },
              {
                OR: [
                  { table: null },
                  { table: 0 }
                ]
              },
              {
                OR: [
                  { order: null },
                  { order: '' }
                ]
              }
            ]
          };
          
          console.log(`🔍 [DEBUG] Initial WHERE clause:`, JSON.stringify(whereClause, null, 2));
          
          // If eventId is provided, add event-specific filter
          if (decodedEventId) {
            console.log(`🔍 [DEBUG] Adding eventId filter: ${decodedEventId}`);
            whereClause.AND.push({
              eventId: decodedEventId
            });
            console.log(`✅ [DEBUG] WHERE clause after eventId filter:`, JSON.stringify(whereClause, null, 2));
          } else {
            console.log(`🔍 [DEBUG] No eventId filter added - will search across all user events`);
          }

          // Find unsold tickets
          console.log(`🔍 [DEBUG] Searching for tickets with Prisma query...`);
          ticketsToUpdate = await tx.ticket.findMany({
            where: whereClause,
            include: {
              event: {
                select: {
                  id: true,
                  created_by: true,
                  name: true
                }
              }
            },
            orderBy: {
              identificationNumber: 'asc'
            },
            take: Math.floor(quantity)
          });
          
          console.log(`🔍 [DEBUG] Found ${ticketsToUpdate.length} tickets`);
          if (ticketsToUpdate.length > 0) {
            console.log(`🔍 [DEBUG] First ticket details:`);
            console.log(`  - ID: ${ticketsToUpdate[0].id}`);
            console.log(`  - Event ID: ${ticketsToUpdate[0].eventId}`);
            console.log(`  - Event Name: ${ticketsToUpdate[0].event.name}`);
            console.log(`  - Identification Number: ${ticketsToUpdate[0].identificationNumber}`);
            console.log(`  - Order: ${ticketsToUpdate[0].order || 'null'}`);
          }

          if (ticketsToUpdate.length === 0) {
            const eventFilter = decodedEventId ? ` for event ${decodedEventId}` : '';
            throw new Error(`No available tickets without table numbers found${eventFilter} for user ${userId}`);
          }

          if (ticketsToUpdate.length < Math.floor(quantity)) {
            const eventFilter = decodedEventId ? ` for event ${decodedEventId}` : '';
            throw new Error(`Not enough available tickets${eventFilter}: requested ${Math.floor(quantity)}, found ${ticketsToUpdate.length}`);
          }
        }

        // Validate user ownership (additional safety check)
        const invalidTickets = ticketsToUpdate.filter(t => t.event.created_by !== userId);
        if (invalidTickets.length > 0) {
          const invalidIds = invalidTickets.map(t => t.id);
          throw new Error(`Tickets do not belong to user ${userId}: ${invalidIds.join(', ')}`);
        }

        // For table-based updates, check if any tickets are already sold (only if not table-based)
        if (selectionMethod !== 'table-based') {
          const soldTickets = ticketsToUpdate.filter(t => t.order && t.order.trim() !== '');
          if (soldTickets.length > 0) {
            const soldIds = soldTickets.map(t => t.id);
            throw new Error(`Some tickets are already sold: ${soldIds.join(', ')}`);
          }
        }

        // Process selective buyer assignment using helper method
        const updateResult = await this._updateTicketsWithSelectiveBuyerInfo(tx, ticketsToUpdate, orderId.toString(), customer);

        // Determine if this is a single ticket purchase (should send QR email immediately)
        // or multiple tickets/table purchase (should send confirmation email)
        const isSingleTicket = ticketsToUpdate.length === 1 && !tableNumber;
        
        let emailSent = false;
        let qrEmailSent = false;
        
        if (customer && customer.email) {
          const emailService = require('./emailService');
          
          if (isSingleTicket && updateResult.buyerInfo) {
            // SINGLE TICKET: Send QR code email directly to the buyer
            console.log('🎫 Single ticket purchase detected - sending QR code email directly');
            
            try {
              const ticketWithBuyerInfo = updateResult.updatedTickets[0];
              const eventData = {
                name: ticketsToUpdate[0].event.name,
                venue: null, // We'll need to get this from event if available
                date: null   // We'll need to get this from event if available
              };
              
              // Get full event data for QR email
              const fullEvent = await prisma.event.findUnique({
                where: { id: ticketsToUpdate[0].eventId },
                select: {
                  name: true,
                  venue: true,
                  opening_datetime: true,
                  created_by: true
                }
              });
              
              if (fullEvent) {
                eventData.name = fullEvent.name;
                eventData.venue = fullEvent.venue;
                eventData.date = fullEvent.opening_datetime;
              }
              
              const result = await emailService.sendTicketQrCodeEmail(
                updateResult.buyerInfo.buyerEmail,
                {
                  id: ticketWithBuyerInfo.id,
                  eventId: ticketsToUpdate[0].eventId,
                  identificationNumber: ticketWithBuyerInfo.identificationNumber,
                  buyer: ticketWithBuyerInfo.buyer,
                  buyerEmail: ticketWithBuyerInfo.buyerEmail
                },
                eventData,
                userId
              );
              
              qrEmailSent = true;
              console.log(`QR code email sent to ${updateResult.buyerInfo.buyerEmail} for single ticket purchase`);
              
            } catch (emailError) {
              console.error('Failed to send QR code email for single ticket:', emailError);
              // Don't fail the webhook for email issues, but log it
            }
            
          } else {
            // MULTIPLE TICKETS/TABLE: Send confirmation email for buyer information collection
            console.log(`🎟️ Multiple tickets/table purchase detected (${ticketsToUpdate.length} tickets, table: ${tableNumber}) - sending confirmation email`);
            
            try {
              const orderService = require('./orderService');
              const confirmationUrl = orderService.generateConfirmationUrl(orderId.toString());
              
              await emailService.sendConfirmationEmail(customer.email, {
                eventName: ticketsToUpdate[0].event.name,
                confirmationUrl,
                orderId: orderId.toString(),
                totalTickets: ticketsToUpdate.length
              });
              emailSent = true;
              console.log(`Confirmation email sent to ${customer.email} for multi-ticket/table purchase`);
            } catch (emailError) {
              console.error('Failed to send confirmation email:', emailError);
              // Don't fail the webhook for email issues
            }
          }
        }

        return {
          success: true,
          message: `Checkout webhook processed successfully. Order ${orderId} assigned to ${tableNumber ? `table ${tableNumber}` : `${ticketsToUpdate.length} tickets`} with ${updateResult.ticketsUpdated} tickets updated.`,
          orderId: orderId.toString(),
          tableNumber: tableNumber,
          ticketIds: updateResult.ticketIds,
          buyerAssigned: updateResult.buyerInfo ? (updateResult.buyerInfo.buyer || 'N/A') : null,
          processedTickets: updateResult.ticketsUpdated,
          updatedTickets: updateResult.updatedTickets,
          selectionMethod,
          quantity: selectionMethod === 'quantity-based' ? Math.floor(items.reduce((total, item) => total + (item.quantity || 0), 0)) : undefined,
          confirmationUrl: !isSingleTicket && emailSent ? require('./orderService').generateConfirmationUrl(orderId.toString()) : null,
          emailSent,
          qrEmailSent,
          isSingleTicket,
          customerEmail: customer?.email || null
        };
      });

      return result;

    } catch (error) {
      console.error('Error processing checkout webhook:', error);
      throw error;
    }
  }

  /**
   * Helper method to update tickets with selective buyer information assignment
   * NEW BEHAVIOR: Only the first ticket (by identificationNumber asc) gets buyer info
   * All tickets get the order field filled
   * @param {Object} tx - Prisma transaction object
   * @param {Array} ticketsToUpdate - Array of tickets to update (already sorted by identificationNumber asc)
   * @param {string} orderId - Order ID to assign to all tickets
   * @param {Object} customer - Customer object from webhook payload
   * @returns {Object} - Result with updated tickets info
   */
  async _updateTicketsWithSelectiveBuyerInfo(tx, ticketsToUpdate, orderId, customer) {
    try {
      if (!ticketsToUpdate || ticketsToUpdate.length === 0) {
        throw new Error('No tickets provided for update');
      }

      // Prepare buyer information from customer object
      let buyerInfo = null;
      if (customer) {
        buyerInfo = {
          buyer: customer.name || null,
          buyerDocument: customer.identification || null,
          buyerEmail: customer.email || null,
          buyerPhone: customer.phone || null
        };
      }

      const updatedTickets = [];
      const ticketIds = ticketsToUpdate.map(t => t.id);

      // Process each ticket
      for (let i = 0; i < ticketsToUpdate.length; i++) {
        const ticket = ticketsToUpdate[i];
        const isFirstTicket = i === 0;

        // Base update data - all tickets get order field
        const updateData = {
          order: orderId
        };

        // Only the first ticket gets buyer information
        if (isFirstTicket && buyerInfo) {
          Object.assign(updateData, buyerInfo);
        }

        // Update the ticket
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: updateData
        });

        updatedTickets.push(updatedTicket);
      }

      return {
        ticketIds,
        updatedTickets,
        ticketsUpdated: updatedTickets.length,
        buyerInfo: buyerInfo,
        firstTicketId: ticketsToUpdate[0].id,
        orderAssignedToAll: true
      };

    } catch (error) {
      console.error('Error in selective buyer info assignment:', error);
      throw new Error(`Failed to update tickets with selective buyer info: ${error.message}`);
    }
  }

  /**
   * Public search tickets by event and user with filtering and privacy protection
   * This method validates userId separately and is designed for public API access
   * @param {number} eventId - Event ID to search tickets for
   * @param {string} userId - User ID to validate and filter tickets
   * @param {boolean} availableOnly - If true, return only available tickets (no order + sales not ended)
   * @returns {Object} Result with tickets and validation info
   */
  async searchTicketsPublic(eventId, userId, availableOnly = false) {
    try {
      // First, validate that the userId exists in the database (has created events)
      const userEvents = await prisma.event.findFirst({
        where: { 
          created_by: userId 
        },
        select: { id: true }
      });

      if (!userEvents) {
        throw new Error(`User with ID '${userId}' does not exist or has no events`);
      }

      // Verify the specific event exists and belongs to the specified userId
      const event = await prisma.event.findFirst({
        where: { 
          id: parseInt(eventId), 
          created_by: userId 
        }
      });

      if (!event) {
        throw new Error(`Event not found or does not belong to user '${userId}'`);
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

      return {
        success: true,
        tickets,
        eventId: parseInt(eventId),
        userId,
        filter: {
          available: availableOnly
        }
      };
    } catch (error) {
      console.error('Error in public ticket search:', error);
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
