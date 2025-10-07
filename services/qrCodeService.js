const QRCode = require('qrcode');
const qrCodeHashUtil = require('../utils/qrCodeHash');

/**
 * QR Code Service
 * 
 * Handles QR code generation for tickets using deterministic hashes.
 */
class QrCodeService {
  constructor() {
    // Default QR code options
    this.qrCodeOptions = {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF'  // White background
      },
      width: 200  // 200px width
    };
  }

  /**
   * Generate QR code as buffer for a single ticket
   * 
   * @param {Object} ticket - Ticket object from database
   * @param {string} userId - The user ID who owns the event
   * @returns {Promise<Buffer>} - QR code image as buffer
   */
  async generateQrCodeForTicket(ticket, userId) {
    try {
      // Generate the deterministic hash
      const hash = qrCodeHashUtil.generateQrCodeHashFromTicket(ticket, userId);
      
      // Generate QR code image buffer
      const qrCodeBuffer = await QRCode.toBuffer(hash, this.qrCodeOptions);
      
      return {
        hash,
        buffer: qrCodeBuffer,
        ticketId: ticket.id,
        identificationNumber: ticket.identificationNumber,
        buyer: ticket.buyer,
        buyerEmail: ticket.buyerEmail
      };
    } catch (error) {
      console.error('Error generating QR code for ticket:', error);
      throw new Error(`Failed to generate QR code for ticket ${ticket.id}: ${error.message}`);
    }
  }

  /**
   * Generate QR codes for multiple tickets
   * 
   * @param {Array} tickets - Array of ticket objects from database
   * @param {string} userId - The user ID who owns the event
   * @returns {Promise<Array>} - Array of QR code data objects
   */
  async generateQrCodesForTickets(tickets, userId) {
    try {
      const qrCodes = [];
      
      for (const ticket of tickets) {
        const qrCodeData = await this.generateQrCodeForTicket(ticket, userId);
        qrCodes.push(qrCodeData);
      }
      
      return qrCodes;
    } catch (error) {
      console.error('Error generating QR codes for tickets:', error);
      throw error;
    }
  }

  /**
   * Generate QR code as data URL (base64) for embedding in emails
   * 
   * @param {Object} ticket - Ticket object from database
   * @param {string} userId - The user ID who owns the event
   * @returns {Promise<Object>} - QR code data with base64 string
   */
  async generateQrCodeDataUrl(ticket, userId) {
    try {
      // Generate the deterministic hash
      const hash = qrCodeHashUtil.generateQrCodeHashFromTicket(ticket, userId);
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(hash, this.qrCodeOptions);
      
      return {
        hash,
        dataUrl: qrCodeDataUrl,
        ticketId: ticket.id,
        identificationNumber: ticket.identificationNumber,
        buyer: ticket.buyer,
        buyerEmail: ticket.buyerEmail
      };
    } catch (error) {
      console.error('Error generating QR code data URL for ticket:', error);
      throw new Error(`Failed to generate QR code data URL for ticket ${ticket.id}: ${error.message}`);
    }
  }

  /**
   * Generate QR code with custom options
   * 
   * @param {string} hash - The hash to encode in the QR code
   * @param {Object} customOptions - Custom QR code options (optional)
   * @returns {Promise<Buffer>} - QR code image as buffer
   */
  async generateCustomQrCode(hash, customOptions = {}) {
    try {
      const options = { ...this.qrCodeOptions, ...customOptions };
      return await QRCode.toBuffer(hash, options);
    } catch (error) {
      console.error('Error generating custom QR code:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code with ticket information as content (alternative approach)
   * This includes human-readable information in the QR code
   * 
   * @param {Object} ticket - Ticket object from database
   * @param {string} userId - The user ID who owns the event
   * @param {Object} eventInfo - Event information
   * @returns {Promise<Object>} - QR code data with buffer and info
   */
  async generateQrCodeWithTicketInfo(ticket, userId, eventInfo) {
    try {
      // Generate the deterministic hash
      const hash = qrCodeHashUtil.generateQrCodeHashFromTicket(ticket, userId);
      
      // Create structured data for QR code (JSON format)
      const qrContent = JSON.stringify({
        hash: hash,
        ticketId: ticket.id,
        eventId: ticket.eventId,
        eventName: eventInfo.name,
        ticketNumber: ticket.identificationNumber,
        buyer: ticket.buyer,
        timestamp: new Date().toISOString()
      });
      
      // Generate QR code with the structured content
      const qrCodeBuffer = await QRCode.toBuffer(qrContent, this.qrCodeOptions);
      
      return {
        hash,
        buffer: qrCodeBuffer,
        content: qrContent,
        ticketId: ticket.id,
        identificationNumber: ticket.identificationNumber,
        buyer: ticket.buyer,
        buyerEmail: ticket.buyerEmail
      };
    } catch (error) {
      console.error('Error generating QR code with ticket info:', error);
      throw new Error(`Failed to generate QR code with info for ticket ${ticket.id}: ${error.message}`);
    }
  }

  /**
   * Verify QR code hash validity
   * 
   * @param {string} hash - The hash to verify
   * @param {string} userId - The user ID who owns the event
   * @param {number} eventId - The event ID
   * @param {number} ticketId - The ticket ID
   * @returns {boolean} - True if hash is valid
   */
  verifyQrCode(hash, userId, eventId, ticketId) {
    return qrCodeHashUtil.verifyQrCodeHash(hash, userId, eventId, ticketId);
  }

  /**
   * Get QR code options for customization
   * 
   * @returns {Object} - Current QR code options
   */
  getQrCodeOptions() {
    return { ...this.qrCodeOptions };
  }

  /**
   * Update QR code options
   * 
   * @param {Object} newOptions - New options to merge
   */
  updateQrCodeOptions(newOptions) {
    this.qrCodeOptions = { ...this.qrCodeOptions, ...newOptions };
  }
}

module.exports = new QrCodeService();