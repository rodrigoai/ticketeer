const orderHash = require('../utils/orderHash');
const cpfValidator = require('../utils/cpfValidator');
const orderService = require('../services/orderService');

// Mock Prisma for testing
jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    ticket: {
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn()
    },
    event: {
      findFirst: jest.fn()
    },
    $disconnect: jest.fn()
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('Buyer Confirmation Feature Tests', () => {
  
  describe('OrderHash Utility', () => {
    
    test('should generate consistent hash for same order ID', () => {
      const orderId = 'ORDER-12345-TEST';
      const hash1 = orderHash.generateHash(orderId);
      const hash2 = orderHash.generateHash(orderId);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
    });

    test('should generate different hashes for different order IDs', () => {
      const hash1 = orderHash.generateHash('ORDER-12345');
      const hash2 = orderHash.generateHash('ORDER-67890');
      
      expect(hash1).not.toBe(hash2);
    });

    test('should validate hash format correctly', () => {
      const validHash = orderHash.generateHash('ORDER-TEST-123');
      const invalidHashes = [
        '',
        'abc',
        'invalid hash with spaces',
        'short',
        '!@#$%^&*()',
        null,
        undefined
      ];

      expect(orderHash.isValidHashFormat(validHash)).toBe(true);
      
      invalidHashes.forEach(hash => {
        expect(orderHash.isValidHashFormat(hash)).toBe(false);
      });
    });

    test('should verify hash correctly', () => {
      const orderId = 'ORDER-VERIFY-TEST';
      const correctHash = orderHash.generateHash(orderId);
      const wrongHash = orderHash.generateHash('OTHER-ORDER');
      
      expect(orderHash.verifyHash(correctHash, orderId)).toBe(true);
      expect(orderHash.verifyHash(wrongHash, orderId)).toBe(false);
    });

    test('should generate proper confirmation URL', () => {
      const orderId = 'ORDER-URL-TEST';
      const baseUrl = 'https://example.com';
      const url = orderHash.generateConfirmationUrl(orderId, baseUrl);
      
      expect(url).toContain(baseUrl);
      expect(url).toContain('/confirmation/');
      expect(url).toMatch(/https:\/\/example\.com\/confirmation\/[A-Za-z0-9_-]+$/);
    });

    test('should extract hash from URL correctly', () => {
      const orderId = 'ORDER-EXTRACT-TEST';
      const hash = orderHash.generateHash(orderId);
      const url = `https://example.com/confirmation/${hash}`;
      
      const extractedHash = orderHash.extractHashFromUrl(url);
      expect(extractedHash).toBe(hash);
      
      // Test invalid URLs
      expect(orderHash.extractHashFromUrl('invalid-url')).toBe(null);
      expect(orderHash.extractHashFromUrl('')).toBe(null);
    });

    test('should throw error for invalid order ID', () => {
      expect(() => orderHash.generateHash('')).toThrow('Order ID must be a non-empty string');
      expect(() => orderHash.generateHash(null)).toThrow('Order ID must be a non-empty string');
      expect(() => orderHash.generateHash(123)).toThrow('Order ID must be a non-empty string');
    });
  });

  describe('CPF Validator Utility', () => {
    
    test('should clean CPF correctly', () => {
      expect(cpfValidator.clean('123.456.789-10')).toBe('12345678910');
      expect(cpfValidator.clean('123 456 789 10')).toBe('12345678910');
      expect(cpfValidator.clean('abc123def456ghi789jk10')).toBe('12345678910');
      expect(cpfValidator.clean('')).toBe('');
      expect(cpfValidator.clean(null)).toBe('');
    });

    test('should format CPF correctly', () => {
      expect(cpfValidator.format('12345678910')).toBe('123.456.789-10');
      expect(cpfValidator.format('123.456.789-10')).toBe('123.456.789-10');
      expect(cpfValidator.format('123456789')).toBe('123456789'); // Too short
    });

    test('should validate CPF format', () => {
      expect(cpfValidator.hasValidFormat('12345678910')).toBe(true);
      expect(cpfValidator.hasValidFormat('123.456.789-10')).toBe(true);
      
      // Invalid formats
      expect(cpfValidator.hasValidFormat('1234567891')).toBe(false); // Too short
      expect(cpfValidator.hasValidFormat('123456789100')).toBe(false); // Too long
      expect(cpfValidator.hasValidFormat('11111111111')).toBe(false); // All same digits
      expect(cpfValidator.hasValidFormat('')).toBe(false);
    });

    test('should validate real CPF numbers', () => {
      // Valid CPFs (using real algorithm)
      const validCPFs = [
        '11144477735', // Real valid CPF
        '123.456.789-09', // Another valid CPF
      ];

      // Invalid CPFs
      const invalidCPFs = [
        '12345678901', // Invalid verification digits
        '11111111111', // All same digits
        '123456789', // Too short
        'abcdefghijk', // Not numbers
      ];

      validCPFs.forEach(cpf => {
        expect(cpfValidator.isValid(cpf)).toBe(true);
      });

      invalidCPFs.forEach(cpf => {
        expect(cpfValidator.isValid(cpf)).toBe(false);
      });
    });

    test('should validate and format CPF with detailed response', () => {
      const validResult = cpfValidator.validateAndFormat('11144477735');
      expect(validResult.isValid).toBe(true);
      expect(validResult.clean).toBe('11144477735');
      expect(validResult.formatted).toBe('111.444.777-35');
      expect(validResult.error).toBeNull();

      const invalidResult = cpfValidator.validateAndFormat('12345678901');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeTruthy();
    });

    test('should provide specific error messages', () => {
      expect(cpfValidator.getValidationError('')).toBe('CPF é obrigatório');
      expect(cpfValidator.getValidationError('123')).toBe('CPF deve ter 11 dígitos');
      expect(cpfValidator.getValidationError('11111111111')).toBe('CPF não pode ter todos os dígitos iguais');
      expect(cpfValidator.getValidationError('12345678901')).toBe('CPF inválido');
    });

    test('should generate random valid CPF', () => {
      const randomCPF = cpfValidator.generateRandom();
      expect(cpfValidator.isValid(randomCPF)).toBe(true);
      expect(randomCPF).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    });

    test('should mask CPF correctly', () => {
      const cpf = '12345678910';
      const masked = cpfValidator.mask(cpf);
      expect(masked).toBe('***.***.234-10');
      
      // Invalid CPF should return as-is
      expect(cpfValidator.mask('123')).toBe('123');
    });
  });

  describe('Order Service', () => {
    let mockPrisma;

    beforeEach(() => {
      const { PrismaClient } = require('../generated/prisma');
      mockPrisma = new PrismaClient();
      jest.clearAllMocks();
    });

    test('should generate confirmation URL', () => {
      const orderId = 'ORDER-SERVICE-TEST';
      const baseUrl = 'https://test.com';
      
      const url = orderService.generateConfirmationUrl(orderId, baseUrl);
      
      expect(url).toContain(baseUrl);
      expect(url).toContain('/confirmation/');
    });

    test('should validate buyers data correctly', () => {
      const validBuyers = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '11144477735',
          email: 'joao@example.com'
        },
        {
          ticketId: 2,
          name: 'Maria Santos',
          document: '12345678909',
          email: 'maria@example.com'
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 },
        { id: 2, identificationNumber: 2 }
      ];

      const result = orderService.validateBuyersData(validBuyers, tickets);
      expect(result.isValid).toBe(true);
    });

    test('should detect duplicate CPF in buyers data', () => {
      const duplicateCPFBuyers = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '11144477735',
          email: 'joao@example.com'
        },
        {
          ticketId: 2,
          name: 'Maria Santos',
          document: '11144477735', // Same CPF
          email: 'maria@example.com'
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 },
        { id: 2, identificationNumber: 2 }
      ];

      const result = orderService.validateBuyersData(duplicateCPFBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('já utilizado');
    });

    test('should detect duplicate email in buyers data', () => {
      const duplicateEmailBuyers = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '11144477735',
          email: 'same@example.com'
        },
        {
          ticketId: 2,
          name: 'Maria Santos',
          document: '12345678909',
          email: 'same@example.com' // Same email
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 },
        { id: 2, identificationNumber: 2 }
      ];

      const result = orderService.validateBuyersData(duplicateEmailBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('já utilizado');
    });

    test('should validate required fields', () => {
      const incompleteBuyers = [
        {
          ticketId: 1,
          name: '', // Missing name
          document: '11144477735',
          email: 'joao@example.com'
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 }
      ];

      const result = orderService.validateBuyersData(incompleteBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should validate CPF format in buyers data', () => {
      const invalidCPFBuyers = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '12345678901', // Invalid CPF
          email: 'joao@example.com'
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 }
      ];

      const result = orderService.validateBuyersData(invalidCPFBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid CPF');
    });

    test('should validate email format in buyers data', () => {
      const invalidEmailBuyers = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '11144477735',
          email: 'invalid-email' // Invalid email
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 }
      ];

      const result = orderService.validateBuyersData(invalidEmailBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    test('should validate ticket ID mismatch', () => {
      const mismatchBuyers = [
        {
          ticketId: 999, // Wrong ticket ID
          name: 'João Silva',
          document: '11144477735',
          email: 'joao@example.com'
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 }
      ];

      const result = orderService.validateBuyersData(mismatchBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    test('should validate buyer count matches ticket count', () => {
      const tooManyBuyers = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '11144477735',
          email: 'joao@example.com'
        },
        {
          ticketId: 2,
          name: 'Maria Santos',
          document: '12345678909',
          email: 'maria@example.com'
        }
      ];

      const tickets = [
        { id: 1, identificationNumber: 1 }
        // Only one ticket, but two buyers
      ];

      const result = orderService.validateBuyersData(tooManyBuyers, tickets);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must match');
    });
  });

  describe('Integration Tests', () => {

    test('should handle complete buyer confirmation flow', async () => {
      const orderId = 'ORDER-INTEGRATION-TEST';
      const hash = orderHash.generateHash(orderId);
      
      // Mock order data
      const mockTickets = [
        {
          id: 1,
          identificationNumber: 1,
          description: 'VIP Ticket',
          order: orderId,
          buyer: null,
          buyerDocument: null,
          buyerEmail: null,
          event: {
            name: 'Test Event',
            venue: 'Test Venue',
            opening_datetime: new Date()
          }
        }
      ];

      // Verify hash can be generated and validated
      expect(orderHash.verifyHash(hash, orderId)).toBe(true);
      
      // Verify buyer data would pass validation
      const buyersData = [
        {
          ticketId: 1,
          name: 'João Silva',
          document: '11144477735',
          email: 'joao@example.com'
        }
      ];

      const validationResult = orderService.validateBuyersData(buyersData, mockTickets);
      expect(validationResult.isValid).toBe(true);
      
      // Verify CPF is valid
      expect(cpfValidator.isValid(buyersData[0].document)).toBe(true);
    });

    test('should handle security - hash cannot be reverse engineered', () => {
      const orderIds = ['ORDER-1', 'ORDER-2', 'ORDER-SECRET'];
      const hashes = orderIds.map(id => orderHash.generateHash(id));
      
      // Hashes should not contain original order IDs
      hashes.forEach((hash, index) => {
        expect(hash).not.toContain(orderIds[index]);
        expect(hash).not.toContain('ORDER');
      });
      
      // Different orders should have completely different hashes
      expect(hashes[0]).not.toBe(hashes[1]);
      expect(hashes[1]).not.toBe(hashes[2]);
      expect(hashes[0]).not.toBe(hashes[2]);
    });

    test('should handle edge cases in URL hash extraction', () => {
      const testCases = [
        { url: '/confirmation/abc123def', expected: 'abc123def' },
        { url: 'https://example.com/confirmation/xyz789uvw', expected: 'xyz789uvw' },
        { url: '/other/path', expected: null },
        { url: '', expected: null },
        { url: '/confirmation/', expected: null },
        { url: '/confirmation/invalid!@#', expected: null }
      ];

      testCases.forEach(testCase => {
        const result = orderHash.extractHashFromUrl(testCase.url);
        if (testCase.expected) {
          expect(result).toBe(testCase.expected);
        } else {
          expect(result).toBe(null);
        }
      });
    });
  });
});