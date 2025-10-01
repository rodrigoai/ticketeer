const crypto = require('crypto');

/**
 * Utility class for generating and validating order hashes for public links
 * Uses HMAC-SHA256 for secure hash generation that can't be reverse-engineered
 */
class OrderHashUtil {
  constructor() {
    // Use environment variable for secret, fallback for development
    this.secret = process.env.ORDER_HASH_SECRET || 'ticketeer-default-secret-change-in-production';
    this.algorithm = 'sha256';
  }

  /**
   * Generate a secure hash for an order ID
   * @param {string} orderId - The order ID to hash
   * @returns {string} - Base64 URL-safe hash
   */
  generateHash(orderId) {
    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Order ID must be a non-empty string');
    }

    // Create HMAC hash with secret
    const hmac = crypto.createHmac(this.algorithm, this.secret);
    hmac.update(orderId);
    const hash = hmac.digest('base64');
    
    // Make it URL-safe by replacing problematic characters
    return hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Validate if a hash could potentially match an order ID
   * Note: This doesn't reveal the original order ID, just validates format
   * @param {string} hash - The hash to validate
   * @returns {boolean} - Whether the hash format is valid
   */
  isValidHashFormat(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    // Check if it matches our expected format (URL-safe base64 without padding)
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    return base64UrlRegex.test(hash) && hash.length >= 20 && hash.length <= 60;
  }

  /**
   * Verify if a hash matches a specific order ID
   * @param {string} hash - The hash to verify
   * @param {string} orderId - The order ID to check against
   * @returns {boolean} - Whether the hash matches the order ID
   */
  verifyHash(hash, orderId) {
    if (!this.isValidHashFormat(hash) || !orderId) {
      return false;
    }

    try {
      const expectedHash = this.generateHash(orderId);
      return hash === expectedHash;
    } catch (error) {
      console.error('Error verifying hash:', error);
      return false;
    }
  }

  /**
   * Generate a public confirmation URL for an order
   * @param {string} orderId - The order ID
   * @param {string} baseUrl - The base URL of the application (optional)
   * @returns {string} - Complete public confirmation URL
   */
  generateConfirmationUrl(orderId, baseUrl = '') {
    const hash = this.generateHash(orderId);
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanBaseUrl}/confirmation/${hash}`;
  }

  /**
   * Extract and validate hash from a confirmation URL
   * @param {string} url - The full confirmation URL
   * @returns {string|null} - The hash if valid, null otherwise
   */
  extractHashFromUrl(url) {
    try {
      // Match pattern: /confirmation/{hash} or just the hash part
      const hashMatch = url.match(/\/confirmation\/([A-Za-z0-9_-]+)$/);
      if (hashMatch && hashMatch[1]) {
        const hash = hashMatch[1];
        return this.isValidHashFormat(hash) ? hash : null;
      }
      
      // If URL doesn't match pattern, check if the whole string is just a hash
      return this.isValidHashFormat(url) ? url : null;
    } catch (error) {
      console.error('Error extracting hash from URL:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new OrderHashUtil();