const { PrismaClient } = require('../generated/prisma');
const TicketService = require('../services/ticketService');

// Mock Prisma for testing
jest.mock('../generated/prisma', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    event: {
      findFirst: jest.fn(),
      update: jest.fn()
    },
    ticket: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    $disconnect: jest.fn()
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('TicketService Webhook - Selective Buyer Assignment', () => {
  let mockPrisma;
  let ticketService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh mock instances
    mockPrisma = new PrismaClient();
    ticketService = TicketService;
  });

  describe('processCheckoutWebhook - Single Ticket Purchase', () => {
    test('should assign both order and buyer info to single ticket', async () => {
      // Mock data
      const userId = 'auth0|testuser123';
      const orderId = 'ORDER-12345-ABC';
      const customer = {
        name: 'John Doe',
        identification: '123.456.789-00',
        email: 'john.doe@example.com'
      };

      const mockTickets = [
        {
          id: 1,
          identificationNumber: 1,
          eventId: 1,
          table: null,
          order: null,
          event: {
            id: 1,
            created_by: userId,
            name: 'Test Event'
          }
        }
      ];

      const webhookPayload = {
        payload: {
          id: orderId,
          customer: customer,
          items: [{ quantity: 1 }]
        }
      };

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticket: {
            findMany: jest.fn().mockResolvedValue(mockTickets),
            update: jest.fn().mockImplementation(({ where, data }) => {
              return Promise.resolve({
                ...mockTickets[0],
                order: data.order,
                buyer: data.buyer,
                buyerDocument: data.buyerDocument,
                buyerEmail: data.buyerEmail
              });
            })
          }
        });
      });

      // Execute
      const result = await ticketService.processCheckoutWebhook(webhookPayload, userId);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.processedTickets).toBe(1);
      expect(result.buyerAssigned).toBe('John Doe');
      expect(result.ticketIds).toEqual([1]);

      // Verify the transaction was called with correct update data
      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      const mockTx = {
        ticket: {
          findMany: jest.fn().mockResolvedValue(mockTickets),
          update: jest.fn().mockResolvedValue({
            ...mockTickets[0],
            order: orderId,
            buyer: customer.name,
            buyerDocument: customer.identification,
            buyerEmail: customer.email
          })
        }
      };

      await transactionCallback(mockTx);

      // Verify update was called with both order and buyer info
      expect(mockTx.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          order: orderId,
          buyer: customer.name,
          buyerDocument: customer.identification,
          buyerEmail: customer.email
        }
      });
    });
  });

  describe('processCheckoutWebhook - Multi-Ticket Purchase', () => {
    test('should assign order to all tickets but buyer info only to first ticket', async () => {
      // Mock data
      const userId = 'auth0|testuser123';
      const orderId = 'ORDER-12345-MULTI';
      const customer = {
        name: 'Jane Smith',
        identification: '987.654.321-00',
        email: 'jane.smith@example.com'
      };

      const mockTickets = [
        {
          id: 1,
          identificationNumber: 1,
          eventId: 1,
          table: null,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        },
        {
          id: 2,
          identificationNumber: 2,
          eventId: 1,
          table: null,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        },
        {
          id: 3,
          identificationNumber: 3,
          eventId: 1,
          table: null,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        }
      ];

      const webhookPayload = {
        payload: {
          id: orderId,
          customer: customer,
          items: [{ quantity: 3 }]
        }
      };

      // Mock transaction with detailed update tracking
      const updatedTickets = [];
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticket: {
            findMany: jest.fn().mockResolvedValue(mockTickets),
            update: jest.fn().mockImplementation(({ where, data }) => {
              const ticket = mockTickets.find(t => t.id === where.id);
              const updatedTicket = {
                ...ticket,
                order: data.order,
                buyer: data.buyer || null,
                buyerDocument: data.buyerDocument || null,
                buyerEmail: data.buyerEmail || null
              };
              updatedTickets.push(updatedTicket);
              return Promise.resolve(updatedTicket);
            })
          }
        });
      });

      // Execute
      const result = await ticketService.processCheckoutWebhook(webhookPayload, userId);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.processedTickets).toBe(3);
      expect(result.buyerAssigned).toBe('Jane Smith');
      expect(result.ticketIds).toEqual([1, 2, 3]);

      // Verify updates were called correctly
      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      const mockTx = {
        ticket: {
          findMany: jest.fn().mockResolvedValue(mockTickets),
          update: jest.fn()
            .mockImplementationOnce(({ where, data }) => {
              // First ticket should get buyer info + order
              expect(where.id).toBe(1);
              expect(data).toEqual({
                order: orderId,
                buyer: customer.name,
                buyerDocument: customer.identification,
                buyerEmail: customer.email
              });
              return Promise.resolve({ ...mockTickets[0], ...data });
            })
            .mockImplementationOnce(({ where, data }) => {
              // Second ticket should get only order
              expect(where.id).toBe(2);
              expect(data).toEqual({
                order: orderId
              });
              return Promise.resolve({ ...mockTickets[1], ...data });
            })
            .mockImplementationOnce(({ where, data }) => {
              // Third ticket should get only order
              expect(where.id).toBe(3);
              expect(data).toEqual({
                order: orderId
              });
              return Promise.resolve({ ...mockTickets[2], ...data });
            })
        }
      };

      await transactionCallback(mockTx);

      // Verify all three updates were called
      expect(mockTx.ticket.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('processCheckoutWebhook - Table Purchase', () => {
    test('should assign order to all table tickets but buyer info only to first ticket by identificationNumber', async () => {
      // Mock data
      const userId = 'auth0|testuser123';
      const orderId = 'ORDER-TABLE-789';
      const tableNumber = 5;
      const customer = {
        name: 'Robert Wilson',
        identification: '456.789.123-00',
        email: 'robert.wilson@example.com'
      };

      // Note: Tickets are intentionally out of order by ID but ordered by identificationNumber
      const mockTickets = [
        {
          id: 10,
          identificationNumber: 5,  // First by identification number
          eventId: 1,
          table: 5,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        },
        {
          id: 8,
          identificationNumber: 8,   // Second by identification number
          eventId: 1,
          table: 5,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        },
        {
          id: 12,
          identificationNumber: 12,  // Third by identification number
          eventId: 1,
          table: 5,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        }
      ];

      const webhookPayload = {
        payload: {
          id: orderId,
          customer: customer,
          meta: {
            tableNumber: tableNumber.toString()
          }
        }
      };

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticket: {
            findMany: jest.fn().mockResolvedValue(mockTickets),
            update: jest.fn()
              .mockImplementationOnce(({ where, data }) => {
                // First ticket (by identificationNumber) should get buyer info + order
                expect(where.id).toBe(10);
                expect(data).toEqual({
                  order: orderId,
                  buyer: customer.name,
                  buyerDocument: customer.identification,
                  buyerEmail: customer.email
                });
                return Promise.resolve({ ...mockTickets[0], ...data });
              })
              .mockImplementationOnce(({ where, data }) => {
                // Second ticket should get only order
                expect(where.id).toBe(8);
                expect(data).toEqual({
                  order: orderId
                });
                return Promise.resolve({ ...mockTickets[1], ...data });
              })
              .mockImplementationOnce(({ where, data }) => {
                // Third ticket should get only order
                expect(where.id).toBe(12);
                expect(data).toEqual({
                  order: orderId
                });
                return Promise.resolve({ ...mockTickets[2], ...data });
              })
          }
        });
      });

      // Execute
      const result = await ticketService.processCheckoutWebhook(webhookPayload, userId);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.tableNumber).toBe(tableNumber);
      expect(result.processedTickets).toBe(3);
      expect(result.buyerAssigned).toBe('Robert Wilson');
      expect(result.ticketIds).toEqual([10, 8, 12]);

      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('processCheckoutWebhook - Edge Cases', () => {
    test('should handle webhook with no customer information', async () => {
      // Mock data
      const userId = 'auth0|testuser123';
      const orderId = 'ORDER-NO-CUSTOMER';

      const mockTickets = [
        {
          id: 1,
          identificationNumber: 1,
          eventId: 1,
          table: null,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        }
      ];

      const webhookPayload = {
        payload: {
          id: orderId,
          customer: null,  // No customer info
          items: [{ quantity: 1 }]
        }
      };

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticket: {
            findMany: jest.fn().mockResolvedValue(mockTickets),
            update: jest.fn().mockImplementation(({ where, data }) => {
              // Should only have order field, no buyer fields
              expect(data).toEqual({
                order: orderId
              });
              return Promise.resolve({
                ...mockTickets[0],
                order: data.order
              });
            })
          }
        });
      });

      // Execute
      const result = await ticketService.processCheckoutWebhook(webhookPayload, userId);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.processedTickets).toBe(1);
      expect(result.buyerAssigned).toBe(null);
    });

    test('should handle webhook with empty customer information', async () => {
      // Mock data
      const userId = 'auth0|testuser123';
      const orderId = 'ORDER-EMPTY-CUSTOMER';

      const mockTickets = [
        {
          id: 1,
          identificationNumber: 1,
          eventId: 1,
          table: null,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        },
        {
          id: 2,
          identificationNumber: 2,
          eventId: 1,
          table: null,
          order: null,
          event: { id: 1, created_by: userId, name: 'Test Event' }
        }
      ];

      const webhookPayload = {
        payload: {
          id: orderId,
          customer: {
            name: '',       // Empty name
            identification: null,  // Null identification
            email: undefined       // Undefined email
          },
          items: [{ quantity: 2 }]
        }
      };

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticket: {
            findMany: jest.fn().mockResolvedValue(mockTickets),
            update: jest.fn()
              .mockImplementationOnce(({ where, data }) => {
                // First ticket should get order + null buyer fields
                expect(data).toEqual({
                  order: orderId,
                  buyer: null,
                  buyerDocument: null,
                  buyerEmail: null
                });
                return Promise.resolve({ ...mockTickets[0], ...data });
              })
              .mockImplementationOnce(({ where, data }) => {
                // Second ticket should get only order
                expect(data).toEqual({
                  order: orderId
                });
                return Promise.resolve({ ...mockTickets[1], ...data });
              })
          }
        });
      });

      // Execute
      const result = await ticketService.processCheckoutWebhook(webhookPayload, userId);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.processedTickets).toBe(2);
      expect(result.buyerAssigned).toBe('N/A'); // Should handle empty name gracefully
    });

    test('should fail when no tickets are found', async () => {
      // Mock data
      const userId = 'auth0|testuser123';
      const orderId = 'ORDER-NO-TICKETS';

      const webhookPayload = {
        payload: {
          id: orderId,
          customer: { name: 'Test User' },
          items: [{ quantity: 1 }]
        }
      };

      // Mock transaction - no tickets found
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          ticket: {
            findMany: jest.fn().mockResolvedValue([]), // Empty array
          }
        });
      });

      // Execute and expect error
      await expect(ticketService.processCheckoutWebhook(webhookPayload, userId))
        .rejects
        .toThrow('No available tickets without table numbers found for user');
    });
  });

  describe('_updateTicketsWithSelectiveBuyerInfo Helper Method', () => {
    test('should correctly assign buyer info only to first ticket', async () => {
      const orderId = 'ORDER-HELPER-TEST';
      const customer = {
        name: 'Helper Test User',
        identification: '111.222.333-44',
        email: 'helper@test.com'
      };

      const mockTickets = [
        { id: 1, identificationNumber: 1 },
        { id: 2, identificationNumber: 2 },
        { id: 3, identificationNumber: 3 }
      ];

      const mockTx = {
        ticket: {
          update: jest.fn()
            .mockResolvedValueOnce({ id: 1, order: orderId, buyer: customer.name, buyerDocument: customer.identification, buyerEmail: customer.email })
            .mockResolvedValueOnce({ id: 2, order: orderId })
            .mockResolvedValueOnce({ id: 3, order: orderId })
        }
      };

      // Execute helper method directly
      const result = await ticketService._updateTicketsWithSelectiveBuyerInfo(mockTx, mockTickets, orderId, customer);

      // Assertions
      expect(result.ticketsUpdated).toBe(3);
      expect(result.ticketIds).toEqual([1, 2, 3]);
      expect(result.firstTicketId).toBe(1);
      expect(result.orderAssignedToAll).toBe(true);
      expect(result.buyerInfo).toEqual({
        buyer: customer.name,
        buyerDocument: customer.identification,
        buyerEmail: customer.email
      });

      // Verify first ticket got buyer info + order
      expect(mockTx.ticket.update).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
        data: {
          order: orderId,
          buyer: customer.name,
          buyerDocument: customer.identification,
          buyerEmail: customer.email
        }
      });

      // Verify other tickets got only order
      expect(mockTx.ticket.update).toHaveBeenNthCalledWith(2, {
        where: { id: 2 },
        data: { order: orderId }
      });

      expect(mockTx.ticket.update).toHaveBeenNthCalledWith(3, {
        where: { id: 3 },
        data: { order: orderId }
      });
    });
  });
});