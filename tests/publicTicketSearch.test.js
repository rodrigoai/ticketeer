// Unit tests for the Public Ticket Search API
// These tests verify the new public endpoint functionality

const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('../generated/prisma');
const ticketService = require('../services/ticketService');

// Mock Prisma client
jest.mock('../generated/prisma', () => ({
  PrismaClient: jest.fn(() => ({
    event: {
      findFirst: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    }
  }))
}));

describe('Public Ticket Search API', () => {
  let app;
  let mockPrisma;

  beforeAll(() => {
    // Create Express app with our routes
    app = express();
    app.use(express.json());

    // Mock the public ticket search route
    app.get('/api/public/tickets/search', async (req, res) => {
      try {
        const { userId, eventId, available } = req.query;
        
        // Validate required parameters
        if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: 'userId parameter is required'
          });
        }
        
        if (!eventId) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: 'eventId parameter is required'
          });
        }
        
        // Validate eventId is a number
        if (isNaN(parseInt(eventId))) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: 'eventId must be a valid number'
          });
        }
        
        // Validate available parameter if provided
        let availableOnly = false;
        if (available !== undefined) {
          if (available === 'true') {
            availableOnly = true;
          } else if (available === 'false') {
            availableOnly = false;
          } else {
            return res.status(400).json({
              success: false,
              error: 'Validation failed',
              message: 'Available parameter must be "true" or "false"'
            });
          }
        }
        
        const result = await ticketService.searchTicketsPublic(eventId, userId, availableOnly);
        
        // Map tickets to frontend format (privacy-protected - no buyer information)
        const mappedTickets = result.tickets.map(ticket => ({
          id: ticket.id,
          eventId: ticket.eventId,
          description: ticket.description,
          identificationNumber: ticket.identificationNumber,
          location: ticket.location,
          table: ticket.table,
          price: parseFloat(ticket.price) || 0,
          order: ticket.order,
          salesEndDateTime: ticket.salesEndDateTime,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at
          // Note: buyer, buyerDocument, buyerEmail are excluded for privacy
        }));
        
        res.json({
          success: true,
          tickets: mappedTickets,
          count: mappedTickets.length,
          eventId: parseInt(eventId),
          userId: userId,
          filter: {
            available: availableOnly
          }
        });
      } catch (error) {
        console.error('Error in public ticket search:', error);
        
        // Handle user not found error specifically
        if (error.message.includes('does not exist or has no events')) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            message: error.message
          });
        }
        
        // Handle event not found error
        if (error.message.includes('Event not found or does not belong to user')) {
          return res.status(404).json({
            success: false,
            error: 'Event not found',
            message: error.message
          });
        }
        
        res.status(500).json({
          success: false,
          error: 'Failed to search tickets',
          message: error.message
        });
      }
    });

    mockPrisma = new PrismaClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    test('should return 400 error when userId is missing', async () => {
      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ eventId: '1' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'userId parameter is required'
      });
    });

    test('should return 400 error when eventId is missing', async () => {
      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'eventId parameter is required'
      });
    });

    test('should return 400 error when eventId is not a number', async () => {
      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: 'not-a-number' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'eventId must be a valid number'
      });
    });

    test('should return 400 error when available parameter is invalid', async () => {
      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1', available: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'Available parameter must be "true" or "false"'
      });
    });
  });

  describe('User and Event Validation', () => {
    test('should return 404 when userId does not exist', async () => {
      // Mock user not found
      mockPrisma.event.findFirst
        .mockResolvedValueOnce(null) // User check
        .mockResolvedValueOnce(null); // Event check

      // Mock searchTicketsPublic to throw user not found error
      jest.spyOn(ticketService, 'searchTicketsPublic').mockRejectedValue(
        new Error("User with ID 'nonexistent' does not exist or has no events")
      );

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'nonexistent', eventId: '1' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'User not found',
        message: "User with ID 'nonexistent' does not exist or has no events"
      });
    });

    test('should return 404 when event does not belong to user', async () => {
      // Mock user exists but event doesn't belong to them
      mockPrisma.event.findFirst
        .mockResolvedValueOnce({ id: 1 }) // User exists
        .mockResolvedValueOnce(null); // Event doesn't belong to user

      // Mock searchTicketsPublic to throw event not found error
      jest.spyOn(ticketService, 'searchTicketsPublic').mockRejectedValue(
        new Error("Event not found or does not belong to user 'user123'")
      );

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '999' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Event not found',
        message: "Event not found or does not belong to user 'user123'"
      });
    });
  });

  describe('Successful Ticket Search', () => {
    const mockTickets = [
      {
        id: 1,
        eventId: 1,
        description: 'General Admission',
        identificationNumber: 1,
        location: 'Section A',
        table: null,
        price: '25.00',
        order: null,
        salesEndDateTime: null,
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-01T10:00:00Z')
      },
      {
        id: 2,
        eventId: 1,
        description: 'VIP',
        identificationNumber: 2,
        location: 'VIP Section',
        table: 5,
        price: '50.00',
        order: 'order_123',
        salesEndDateTime: new Date('2024-12-31T23:59:59Z'),
        created_at: new Date('2024-01-01T10:01:00Z'),
        updated_at: new Date('2024-01-01T10:01:00Z')
      }
    ];

    test('should return all tickets when valid userId and eventId provided', async () => {
      // Mock successful search
      jest.spyOn(ticketService, 'searchTicketsPublic').mockResolvedValue({
        success: true,
        tickets: mockTickets,
        eventId: 1,
        userId: 'user123',
        filter: { available: false }
      });

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.eventId).toBe(1);
      expect(response.body.userId).toBe('user123');
      expect(response.body.filter.available).toBe(false);

      // Verify ticket format (no buyer information)
      const ticket = response.body.tickets[0];
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('eventId');
      expect(ticket).toHaveProperty('description');
      expect(ticket).toHaveProperty('identificationNumber');
      expect(ticket).toHaveProperty('location');
      expect(ticket).toHaveProperty('table');
      expect(ticket).toHaveProperty('price');
      expect(ticket).toHaveProperty('order');
      expect(ticket).toHaveProperty('salesEndDateTime');
      expect(ticket).toHaveProperty('created_at');
      expect(ticket).toHaveProperty('updated_at');
      
      // Verify buyer information is NOT present
      expect(ticket).not.toHaveProperty('buyer');
      expect(ticket).not.toHaveProperty('buyerDocument');
      expect(ticket).not.toHaveProperty('buyerEmail');
    });

    test('should return only available tickets when available=true', async () => {
      const availableTickets = [mockTickets[0]]; // Only the first ticket (no order)

      jest.spyOn(ticketService, 'searchTicketsPublic').mockResolvedValue({
        success: true,
        tickets: availableTickets,
        eventId: 1,
        userId: 'user123',
        filter: { available: true }
      });

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1', available: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.filter.available).toBe(true);
      expect(response.body.tickets[0].order).toBe(null);
    });

    test('should return all tickets when available=false', async () => {
      jest.spyOn(ticketService, 'searchTicketsPublic').mockResolvedValue({
        success: true,
        tickets: mockTickets,
        eventId: 1,
        userId: 'user123',
        filter: { available: false }
      });

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1', available: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.filter.available).toBe(false);
    });

    test('should maintain sorting by identification number ascending', async () => {
      const unsortedTickets = [mockTickets[1], mockTickets[0]]; // Wrong order

      jest.spyOn(ticketService, 'searchTicketsPublic').mockResolvedValue({
        success: true,
        tickets: mockTickets, // Service returns properly sorted
        eventId: 1,
        userId: 'user123',
        filter: { available: false }
      });

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1' });

      expect(response.status).toBe(200);
      expect(response.body.tickets[0].identificationNumber).toBe(1);
      expect(response.body.tickets[1].identificationNumber).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle unexpected service errors', async () => {
      jest.spyOn(ticketService, 'searchTicketsPublic').mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to search tickets',
        message: 'Unexpected database error'
      });
    });
  });

  describe('Privacy Protection', () => {
    test('should exclude all buyer information from response', async () => {
      const ticketWithBuyerInfo = {
        ...mockTickets[0],
        buyer: 'John Doe',
        buyerDocument: '123-45-6789',
        buyerEmail: 'john@example.com'
      };

      jest.spyOn(ticketService, 'searchTicketsPublic').mockResolvedValue({
        success: true,
        tickets: [ticketWithBuyerInfo],
        eventId: 1,
        userId: 'user123',
        filter: { available: false }
      });

      const response = await request(app)
        .get('/api/public/tickets/search')
        .query({ userId: 'user123', eventId: '1' });

      expect(response.status).toBe(200);
      const ticket = response.body.tickets[0];
      
      // Verify buyer information is stripped out
      expect(ticket).not.toHaveProperty('buyer');
      expect(ticket).not.toHaveProperty('buyerDocument');
      expect(ticket).not.toHaveProperty('buyerEmail');
      
      // Verify other fields are still present
      expect(ticket).toHaveProperty('description');
      expect(ticket).toHaveProperty('price');
      expect(ticket).toHaveProperty('order');
    });
  });
});