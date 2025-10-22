const { PrismaClient } = require('../generated/prisma');
const orderHash = require('../utils/orderHash');
const cpfValidator = require('../utils/cpfValidator');

const prisma = new PrismaClient();

class OrderService {

  /**
   * Generate a public confirmation URL for an order
   * @param {string} orderId - The order ID
   * @param {string} baseUrl - Base URL for the application
   * @returns {string} - Public confirmation URL
   */
  generateConfirmationUrl(orderId, baseUrl = null) {
    // Auto-detect production base URL if not provided
    if (!baseUrl) {
      baseUrl = process.env.BASE_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                'https://ticketeer.vercel.app'; // Your production domain
    }
    return orderHash.generateConfirmationUrl(orderId, baseUrl);
  }

  /**
   * Get all tickets for an order using hash validation
   * @param {string} hash - The order hash from the public URL
   * @returns {Object} - Order details with tickets
   */
  async getOrderByHash(hash) {
    try {
      // Validate hash format first
      if (!orderHash.isValidHashFormat(hash)) {
        throw new Error('Invalid hash format');
      }

      // Find all tickets and check if any order matches the hash
      const tickets = await prisma.ticket.findMany({
        where: {
          order: {
            not: null
          }
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              opening_datetime: true,
              created_by: true
            }
          }
        },
        orderBy: {
          identificationNumber: 'asc'
        }
      });

      // Group tickets by order and find the one that matches our hash
      const ticketsByOrder = {};
      for (const ticket of tickets) {
        const orderId = ticket.order;
        if (!ticketsByOrder[orderId]) {
          ticketsByOrder[orderId] = [];
        }
        ticketsByOrder[orderId].push(ticket);
      }

      // Find the order that matches our hash
      let matchingOrderId = null;
      let matchingTickets = null;

      for (const [orderId, orderTickets] of Object.entries(ticketsByOrder)) {
        if (orderHash.verifyHash(hash, orderId)) {
          matchingOrderId = orderId;
          matchingTickets = orderTickets;
          break;
        }
      }

      if (!matchingOrderId || !matchingTickets) {
        throw new Error('Order not found for the provided hash');
      }

      // Get event information from first ticket
      const event = matchingTickets[0].event;
      
      // Check if all tickets already have buyer information
      const hasAllBuyerInfo = matchingTickets.every(ticket => 
        ticket.buyer && ticket.buyerDocument && ticket.buyerEmail
      );

      // Map tickets to public format (hide sensitive info if already filled)
      const publicTickets = matchingTickets.map(ticket => ({
        id: ticket.id,
        eventId: ticket.eventId, // Include eventId for QR code generation
        identificationNumber: ticket.identificationNumber,
        description: ticket.description,
        location: ticket.location,
        table: ticket.table,
        price: parseFloat(ticket.price || 0),
        // Only show buyer info if not filled, or mask it if filled
        buyer: hasAllBuyerInfo ? (ticket.buyer ? '✓ Preenchido' : null) : (ticket.buyer || null),
        buyerDocument: hasAllBuyerInfo ? (ticket.buyerDocument ? cpfValidator.mask(ticket.buyerDocument) : null) : (ticket.buyerDocument || null),
        buyerEmail: hasAllBuyerInfo ? (ticket.buyerEmail ? ticket.buyerEmail.replace(/(.{2}).*(@.*)/, '$1***$2') : null) : (ticket.buyerEmail || null),
        isCompleted: !!(ticket.buyer && ticket.buyerDocument && ticket.buyerEmail)
      }));

      return {
        orderId: matchingOrderId,
        hash,
        event: {
          name: event.name,
          venue: event.venue,
          date: event.opening_datetime
        },
        tickets: publicTickets,
        isCompleted: hasAllBuyerInfo,
        totalTickets: publicTickets.length
      };

    } catch (error) {
      console.error('Error getting order by hash:', error);
      throw error;
    }
  }

  /**
   * Save buyer information for all tickets in an order (atomic operation)
   * @param {string} hash - The order hash
   * @param {Array} buyersData - Array of buyer information for each ticket
   * @returns {Object} - Save result
   */
  async saveBuyersForOrder(hash, buyersData) {
    try {
      // Validate hash format
      if (!orderHash.isValidHashFormat(hash)) {
        throw new Error('Invalid hash format');
      }

      // Get order details first
      const orderDetails = await this.getOrderByHash(hash);
      
      if (orderDetails.isCompleted) {
        throw new Error('This order has already been completed and cannot be modified');
      }

      // Validate buyers data
      const validationResult = this.validateBuyersData(buyersData, orderDetails.tickets);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      // Use transaction for atomic save
      const result = await prisma.$transaction(async (tx) => {
        const updatedTickets = [];

        for (let i = 0; i < buyersData.length; i++) {
          const buyerData = buyersData[i];
          const ticket = orderDetails.tickets[i];

          if (!buyerData.ticketId || buyerData.ticketId !== ticket.id) {
            throw new Error(`Ticket ID mismatch for position ${i + 1}`);
          }

          // Update ticket with buyer information
          const updatedTicket = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              buyer: buyerData.name.trim(),
              buyerDocument: cpfValidator.clean(buyerData.document),
              buyerEmail: buyerData.email.trim().toLowerCase(),
              buyerPhone: buyerData.phone ? buyerData.phone.trim() : null
            }
          });

          updatedTickets.push({
            id: updatedTicket.id,
            eventId: updatedTicket.eventId, // Include eventId for QR code generation
            identificationNumber: updatedTicket.identificationNumber,
            buyer: updatedTicket.buyer,
            buyerDocument: cpfValidator.format(updatedTicket.buyerDocument),
            buyerEmail: updatedTicket.buyerEmail
          });
        }

        return updatedTickets;
      });

      // Get event creator (userId) for QR code generation
      const eventCreatorQuery = await prisma.event.findUnique({
        where: { id: orderDetails.tickets[0].eventId },
        select: { created_by: true }
      });
      
      const eventCreatorUserId = eventCreatorQuery?.created_by;
      if (!eventCreatorUserId) {
        throw new Error('Event creator not found');
      }

      // Send QR code emails to each buyer
      let qrCodeEmailsResult = { successful: [], failed: [], totalSent: 0, totalFailed: 0 };
      let completionEmailSent = false;
      
      try {
        console.log('🎯 [QR-DEBUG] Starting QR code email sending process...');
        console.log(`🎯 [QR-DEBUG] Event creator userId: ${eventCreatorUserId}`);
        console.log(`🎯 [QR-DEBUG] Number of tickets to process: ${result.length}`);
        console.log(`🎯 [QR-DEBUG] Event data:`, JSON.stringify(orderDetails.event, null, 2));
        
        // Log each ticket data
        result.forEach((ticket, index) => {
          console.log(`🎯 [QR-DEBUG] Ticket ${index + 1}:`, {
            id: ticket.id,
            eventId: ticket.eventId,
            identificationNumber: ticket.identificationNumber,
            buyer: ticket.buyer,
            buyerEmail: ticket.buyerEmail
          });
        });
        
        const emailService = require('./emailService');
        
        // Send QR code emails for all tickets
        console.log('🎯 [QR-DEBUG] Calling sendQrCodeEmailsForTickets...');
        qrCodeEmailsResult = await emailService.sendQrCodeEmailsForTickets(
          result, // result already contains eventId from database update
          orderDetails.event,
          eventCreatorUserId
        );
        
        console.log('🎯 [QR-DEBUG] QR email sending completed!');
        console.log(`🎯 [QR-DEBUG] Results: ${qrCodeEmailsResult.totalSent} sent, ${qrCodeEmailsResult.totalFailed} failed`);
        console.log('🎯 [QR-DEBUG] Successful emails:', qrCodeEmailsResult.successful);
        console.log('🎯 [QR-DEBUG] Failed emails:', qrCodeEmailsResult.failed);
        
        // NOTE: No completion email needed - each buyer receives their QR code email directly
        
      } catch (qrEmailError) {
        console.error('❌ [QR-DEBUG] Failed to send QR code emails:', qrEmailError);
        console.error('❌ [QR-DEBUG] Error stack:', qrEmailError.stack);
        // Don't fail the save for email issues, but log the error
      }

      return {
        success: true,
        message: `Buyer information saved for ${result.length} tickets - QR code emails sent to each buyer`,
        orderId: orderDetails.orderId,
        updatedTickets: result,
        completionEmailSent: false, // No completion email needed - QR emails sent directly
        qrCodeEmails: {
          sent: qrCodeEmailsResult.totalSent,
          failed: qrCodeEmailsResult.totalFailed,
          successful: qrCodeEmailsResult.successful,
          errors: qrCodeEmailsResult.failed
        }
      };

    } catch (error) {
      console.error('Error saving buyers for order:', error);
      throw error;
    }
  }

  /**
   * Validate buyers data before saving
   * @param {Array} buyersData - Array of buyer information
   * @param {Array} tickets - Array of tickets for validation
   * @returns {Object} - Validation result
   */
  validateBuyersData(buyersData, tickets) {
    if (!Array.isArray(buyersData)) {
      return { isValid: false, error: 'Buyers data must be an array' };
    }

    if (buyersData.length !== tickets.length) {
      return { isValid: false, error: 'Number of buyers must match number of tickets' };
    }

    // Track unique documents and emails
    const usedDocuments = new Set();
    const usedEmails = new Set();

    for (let i = 0; i < buyersData.length; i++) {
      const buyer = buyersData[i];
      const ticket = tickets[i];

      // Required fields validation
      if (!buyer.name || !buyer.document || !buyer.email || !buyer.ticketId) {
        return { isValid: false, error: `All fields are required for ticket #${ticket.identificationNumber}` };
      }

      // Name validation
      if (typeof buyer.name !== 'string' || buyer.name.trim().length < 2) {
        return { isValid: false, error: `Invalid name for ticket #${ticket.identificationNumber}` };
      }

      // CPF validation
      const cpfValidation = cpfValidator.validateAndFormat(buyer.document);
      if (!cpfValidation.isValid) {
        return { isValid: false, error: `Invalid CPF for ticket #${ticket.identificationNumber}: ${cpfValidation.error}` };
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(buyer.email.trim())) {
        return { isValid: false, error: `Invalid email for ticket #${ticket.identificationNumber}` };
      }

      // Check for duplicate documents
      const cleanDocument = cpfValidation.clean;
      if (usedDocuments.has(cleanDocument)) {
        return { isValid: false, error: `CPF ${cpfValidation.formatted} is already used for another ticket in this order` };
      }
      usedDocuments.add(cleanDocument);

      // Check for duplicate emails
      const cleanEmail = buyer.email.trim().toLowerCase();
      if (usedEmails.has(cleanEmail)) {
        return { isValid: false, error: `Email ${cleanEmail} is already used for another ticket in this order` };
      }
      usedEmails.add(cleanEmail);

      // Ticket ID validation
      if (buyer.ticketId !== ticket.id) {
        return { isValid: false, error: `Ticket ID mismatch for position ${i + 1}` };
      }
    }

    return { isValid: true };
  }

  /**
   * Get confirmation hash for an order by order ID (with user permission check)
   * @param {string} orderId - The order ID
   * @param {string} userId - The user ID making the request
   * @returns {string} - The confirmation hash for the order
   */
  async getConfirmationHashByOrderId(orderId, userId) {
    try {
      // First, verify that the order exists and the user has access to it
      const tickets = await prisma.ticket.findMany({
        where: { order: orderId },
        include: {
          event: {
            select: {
              id: true,
              created_by: true
            }
          }
        }
      });

      if (tickets.length === 0) {
        throw new Error('Order not found');
      }

      // Check if the user has permission to access this order
      // (they must be the owner of the event that contains these tickets)
      const eventCreator = tickets[0].event.created_by;
      if (eventCreator !== userId) {
        throw new Error('Access denied: You do not have permission to access this order');
      }

      // Generate and return the hash
      return orderHash.generateHash(orderId);

    } catch (error) {
      console.error('Error getting confirmation hash by order ID:', error);
      throw error;
    }
  }

  /**
   * Check if an order exists and get basic information
   * @param {string} orderId - The order ID to check
   * @returns {Object|null} - Order information or null if not found
   */
  async getOrderInfo(orderId) {
    try {
      const tickets = await prisma.ticket.findMany({
        where: { order: orderId },
        include: {
          event: {
            select: {
              name: true,
              venue: true,
              opening_datetime: true
            }
          }
        },
        orderBy: {
          identificationNumber: 'asc'
        }
      });

      if (tickets.length === 0) {
        return null;
      }

      const event = tickets[0].event;
      const hasAllBuyerInfo = tickets.every(ticket => 
        ticket.buyer && ticket.buyerDocument && ticket.buyerEmail
      );

      return {
        orderId,
        hash: orderHash.generateHash(orderId),
        confirmationUrl: this.generateConfirmationUrl(orderId),
        event: {
          name: event.name,
          venue: event.venue,
          date: event.opening_datetime
        },
        totalTickets: tickets.length,
        isCompleted: hasAllBuyerInfo,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          identificationNumber: ticket.identificationNumber,
          description: ticket.description,
          hasBuyerInfo: !!(ticket.buyer && ticket.buyerDocument && ticket.buyerEmail)
        }))
      };

    } catch (error) {
      console.error('Error getting order info:', error);
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

module.exports = new OrderService();