const crypto = require('crypto');

/**
 * QR Code Hash Utility
 * 
 * Generates deterministic, unique hashes for QR codes based on user, event, and ticket information.
 * The hash is not stored in the database but can be regenerated when needed.
 */
class QrCodeHashUtil {
  constructor() {
    // Use the same secret as orderHash for consistency, but we'll add a different suffix for QR codes
    this.secret = process.env.ORDER_HASH_SECRET;
    
    if (!this.secret) {
      throw new Error('ORDER_HASH_SECRET environment variable is required');
    }
  }

  /**
   * Generate a deterministic QR code hash for a ticket
   * 
   * The hash combines:
   * - userId (event owner)
   * - eventId (the event)
   * - ticketId (the specific ticket)
   * 
   * @param {string} userId - The user ID who owns the event
   * @param {number} eventId - The event ID
   * @param {number} ticketId - The ticket ID
   * @returns {string} - A deterministic hash string
   */
  generateQrCodeHash(userId, eventId, ticketId) {
    if (!userId || !eventId || !ticketId) {
      throw new Error('userId, eventId, and ticketId are required to generate QR code hash');
    }

    // Create a deterministic string that combines all three components
    const dataString = `${userId}:${eventId}:${ticketId}:QR`;
    
    // Generate HMAC-SHA256 hash
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(dataString)
      .digest('hex');

    // Return first 32 characters for a reasonable QR code size
    return hash.substring(0, 32);
  }

  /**
   * Generate QR code hash using ticket data object
   * 
   * @param {Object} ticket - Ticket object from database
   * @param {string} userId - The user ID who owns the event
   * @returns {string} - A deterministic hash string
   */
  generateQrCodeHashFromTicket(ticket, userId) {
    return this.generateQrCodeHash(userId, ticket.eventId, ticket.id);
  }

  /**
   * Verify if a given hash matches the expected hash for the ticket
   * 
   * @param {string} hash - The hash to verify
   * @param {string} userId - The user ID who owns the event
   * @param {number} eventId - The event ID
   * @param {number} ticketId - The ticket ID
   * @returns {boolean} - True if hash is valid
   */
  verifyQrCodeHash(hash, userId, eventId, ticketId) {
    const expectedHash = this.generateQrCodeHash(userId, eventId, ticketId);
    return hash === expectedHash;
  }

  /**
   * Generate multiple QR code hashes for an array of tickets
   * 
   * @param {Array} tickets - Array of ticket objects
   * @param {string} userId - The user ID who owns the event
   * @returns {Array} - Array of objects with ticket info and hash
   */
  generateQrCodeHashesForTickets(tickets, userId) {
    return tickets.map(ticket => ({
      ticketId: ticket.id,
      identificationNumber: ticket.identificationNumber,
      eventId: ticket.eventId,
      hash: this.generateQrCodeHashFromTicket(ticket, userId),
      buyer: ticket.buyer,
      buyerEmail: ticket.buyerEmail
    }));
  }

  /**
   * Generate QR code verification URL (for future use if needed)
   * 
   * @param {string} hash - The QR code hash
   * @param {string} baseUrl - Base URL for the application
   * @returns {string} - Full verification URL
   */
  generateVerificationUrl(hash, baseUrl = null) {
    if (!baseUrl) {
      baseUrl = process.env.BASE_URL || 'https://ticketeer.vercel.app';
    }
    
    return `${baseUrl}/verify/${hash}`;
  }
}

module.exports = new QrCodeHashUtil();