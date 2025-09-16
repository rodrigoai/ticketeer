const express = require('express');
const path = require('path');
const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auth0 configuration for JWT validation
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'novamoney.us.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://ticket.nova.money';

// JWT verification middleware
const jwtCheck = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

// Wrapper middleware with proper error handling
const requiresAuth = (req, res, next) => {
  jwtCheck(req, res, (err) => {
    if (err) {
      console.error('JWT Auth Error:', err.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid JWT token required',
        details: err.message
      });
    }
    next();
  });
};


// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Vue.js SPA built files
app.use(express.static(path.join(__dirname, 'dist')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ticketeer SPA server is running!',
    timestamp: new Date().toISOString(),
    auth: {
      domain: AUTH0_DOMAIN,
      audience: AUTH0_AUDIENCE
    }
  });
});

// Simple test endpoint (no JWT required)
app.get('/api/test/simple', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test endpoint working!',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for JWT authentication (protected)
app.get('/api/test/protected', requiresAuth, (req, res) => {
  try {
    res.json({
      success: true,
      message: 'JWT authentication is working!',
      user: {
        sub: req.auth?.payload?.sub || req.auth?.sub || 'N/A',
        email: req.auth?.payload?.email || req.auth?.email || 'N/A',
        name: req.auth?.payload?.name || req.auth?.name || 'N/A',
        picture: req.auth?.payload?.picture || req.auth?.picture || 'N/A'
      },
      scope: req.auth?.scope || 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in protected endpoint:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message
    });
  }
});

// Get events from database (JWT authenticated)
app.get('/api/events', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    const eventService = require('./services/eventService');
    
    // Get events created by the authenticated user
    const events = await eventService.getEvents({ 
      created_by: userId,
      status: 'active'
    });
    
    // Map database fields to frontend expectations
    const mappedEvents = events.map(event => ({
      id: event.id,
      title: event.name,
      name: event.name,
      description: event.description,
      date: event.opening_datetime,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime,
      venue: event.venue,
      price: 0, // We'll need to add price to schema or calculate from tickets
      status: event.status,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));
    
    res.json({
      success: true,
      events: mappedEvents,
      count: mappedEvents.length,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

// Create event in database (JWT authenticated)
app.post('/api/events', requiresAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Event creation request received');
    console.log('📥 Request body:', req.body);
    console.log('👤 Auth data:', req.auth);
    
    const { title, description, date, venue, price } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    
    console.log('🎯 Extracted data:', { title, description, date, venue, price, userId });
    
    // Validate required fields
    if (!title || !date || !venue) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, date, and venue are required'
      });
    }
    
    console.log('🛠️ Loading event service...');
    const eventService = require('./services/eventService');
    
    // Create event data for database
    const eventData = {
      name: title,
      description: description || '',
      opening_datetime: new Date(date),
      closing_datetime: new Date(date), // For now, same as opening. TODO: Add separate closing time
      venue: venue,
      created_by: userId
    };
    
    console.log('📄 Event data for Prisma:', eventData);
    console.log('⚡ Calling eventService.createEvent...');
    const newEvent = await eventService.createEvent(eventData);
    console.log('✅ Event created successfully via service:', newEvent);
    
    // Map response to frontend format
    const mappedEvent = {
      id: newEvent.id,
      title: newEvent.name,
      name: newEvent.name,
      description: newEvent.description,
      date: newEvent.opening_datetime,
      venue: newEvent.venue,
      price: parseFloat(price) || 0,
      created_by: newEvent.created_by
    };
    
    res.status(201).json({
      success: true,
      event: mappedEvent,
      message: 'Event created successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

// Get individual event by ID (JWT authenticated)
app.get('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
    const eventService = require('./services/eventService');
    
    const event = await eventService.getEventById(id, userId);
    
    // Map database fields to frontend expectations
    const mappedEvent = {
      id: event.id,
      title: event.name,
      name: event.name,
      description: event.description,
      date: event.opening_datetime,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime,
      venue: event.venue,
      status: event.status,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at
    };
    
    res.json({
      success: true,
      event: mappedEvent,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

// Update event in database (JWT authenticated)
app.put('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, venue, price } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    
    const eventService = require('./services/eventService');
    
    // Update event data
    const eventData = {
      name: title,
      description: description || '',
      opening_datetime: date ? new Date(date) : undefined,
      closing_datetime: date ? new Date(date) : undefined, // TODO: Add separate closing time
      venue: venue
    };
    
    const updatedEvent = await eventService.updateEvent(id, eventData, userId);
    
    // Map response to frontend format
    const mappedEvent = {
      id: updatedEvent.id,
      title: updatedEvent.name,
      name: updatedEvent.name,
      description: updatedEvent.description,
      date: updatedEvent.opening_datetime,
      venue: updatedEvent.venue,
      price: parseFloat(price) || 0,
      created_by: updatedEvent.created_by
    };
    
    res.json({
      success: true,
      event: mappedEvent,
      message: 'Event updated successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message
    });
  }
});

// Delete event from database (JWT authenticated)
app.delete('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    
    const eventService = require('./services/eventService');
    
    const deletedEvent = await eventService.deleteEvent(id, userId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully',
      deletedEvent: { id: parseInt(id) },
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

// ==========================================
// TICKET API ENDPOINTS
// ==========================================

// Get all tickets for an event (JWT authenticated)
app.get('/api/events/:eventId/tickets', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
    const ticketService = require('./services/ticketService');
    
    const tickets = await ticketService.getTicketsByEvent(eventId, userId);
    
    // Map tickets to frontend format
    const mappedTickets = tickets.map(ticket => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      salesEndDateTime: ticket.salesEndDateTime,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));
    
    res.json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      eventId: parseInt(eventId),
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
      message: error.message
    });
  }
});

// Get ticket statistics for an event (JWT authenticated)
app.get('/api/events/:eventId/tickets/stats', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
    const ticketService = require('./services/ticketService');
    
    const stats = await ticketService.getEventTicketStats(eventId, userId);
    
    // Convert decimal strings to numbers for frontend
    const mappedStats = {
      totalTickets: stats.totalTickets,
      totalRevenue: parseFloat(stats.totalRevenue) || 0,
      averagePrice: parseFloat(stats.averagePrice) || 0,
      minPrice: parseFloat(stats.minPrice) || 0,
      maxPrice: parseFloat(stats.maxPrice) || 0
    };
    
    res.json({
      success: true,
      stats: mappedStats,
      eventId: parseInt(eventId),
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket statistics',
      message: error.message
    });
  }
});

// Search tickets for an event with filtering and privacy protection (JWT authenticated)
app.get('/api/events/:eventId/tickets/search', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { available } = req.query;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
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
    
    const ticketService = require('./services/ticketService');
    
    const tickets = await ticketService.searchTicketsByEvent(eventId, userId, availableOnly);
    
    // Map tickets to frontend format (privacy-protected - no buyer information)
    const mappedTickets = tickets.map(ticket => ({
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
      filter: {
        available: availableOnly
      },
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error searching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tickets',
      message: error.message
    });
  }
});

// Create a single ticket for an event (JWT authenticated)
app.post('/api/events/:eventId/tickets', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
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
    } = req.body;
    
    // Validate required fields
    if (!description || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Description and price are required'
      });
    }
    
    if (parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Price must be a positive number'
      });
    }
    
    const ticketService = require('./services/ticketService');
    
    const ticketData = {
      description,
      location,
      table: table ? parseInt(table) : undefined,
      price: parseFloat(price),
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      salesEndDateTime
    };
    
    const newTicket = await ticketService.createTicket(eventId, ticketData, userId);
    
    // Map response to frontend format
    const mappedTicket = {
      id: newTicket.id,
      eventId: newTicket.eventId,
      description: newTicket.description,
      identificationNumber: newTicket.identificationNumber,
      location: newTicket.location,
      table: newTicket.table,
      price: parseFloat(newTicket.price) || 0,
      order: newTicket.order,
      buyer: newTicket.buyer,
      buyerDocument: newTicket.buyerDocument,
      buyerEmail: newTicket.buyerEmail,
      salesEndDateTime: newTicket.salesEndDateTime,
      created_at: newTicket.created_at,
      updated_at: newTicket.updated_at
    };
    
    res.status(201).json({
      success: true,
      ticket: mappedTicket,
      message: 'Ticket created successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ticket',
      message: error.message
    });
  }
});

// Create multiple tickets in batch for an event (JWT authenticated)
app.post('/api/events/:eventId/tickets/batch', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
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
      quantity
    } = req.body;
    
    // Validate required fields
    if (!description || price === undefined || price === null || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Description, price, and quantity are required'
      });
    }
    
    if (parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Price must be a positive number'
      });
    }
    
    if (parseInt(quantity) < 1 || parseInt(quantity) > 100) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Quantity must be between 1 and 100'
      });
    }
    
    const ticketService = require('./services/ticketService');
    
    const ticketData = {
      description,
      location,
      table: table ? parseInt(table) : undefined,
      price: parseFloat(price),
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      salesEndDateTime
    };
    
    const newTickets = await ticketService.createTicketsBatch(eventId, ticketData, parseInt(quantity), userId);
    
    // Map response to frontend format
    const mappedTickets = newTickets.map(ticket => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      salesEndDateTime: ticket.salesEndDateTime,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));
    
    res.status(201).json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      message: `${mappedTickets.length} tickets created successfully`,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error creating tickets batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tickets',
      message: error.message
    });
  }
});

// Get a specific ticket by ID (JWT authenticated)
app.get('/api/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
    const ticketService = require('./services/ticketService');
    
    const ticket = await ticketService.getTicketById(id, userId);
    
    // Map response to frontend format
    const mappedTicket = {
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      salesEndDateTime: ticket.salesEndDateTime,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    };
    
    res.json({
      success: true,
      ticket: mappedTicket,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket',
      message: error.message
    });
  }
});

// Update a ticket (JWT authenticated)
app.put('/api/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
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
    } = req.body;
    
    // Validate price if provided
    if (price !== undefined && price !== null && parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Price must be a positive number'
      });
    }
    
    const ticketService = require('./services/ticketService');
    
    const ticketData = {
      description,
      location,
      table: table !== undefined ? (table ? parseInt(table) : null) : undefined,
      price: price !== undefined ? parseFloat(price) : undefined,
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      salesEndDateTime
    };
    
    const updatedTicket = await ticketService.updateTicket(id, ticketData, userId);
    
    // Map response to frontend format
    const mappedTicket = {
      id: updatedTicket.id,
      eventId: updatedTicket.eventId,
      description: updatedTicket.description,
      identificationNumber: updatedTicket.identificationNumber,
      location: updatedTicket.location,
      table: updatedTicket.table,
      price: parseFloat(updatedTicket.price) || 0,
      order: updatedTicket.order,
      buyer: updatedTicket.buyer,
      buyerDocument: updatedTicket.buyerDocument,
      buyerEmail: updatedTicket.buyerEmail,
      salesEndDateTime: updatedTicket.salesEndDateTime,
      created_at: updatedTicket.created_at,
      updated_at: updatedTicket.updated_at
    };
    
    res.json({
      success: true,
      ticket: mappedTicket,
      message: 'Ticket updated successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket',
      message: error.message
    });
  }
});

// Delete a single ticket (JWT authenticated)
app.delete('/api/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
    const ticketService = require('./services/ticketService');
    
    const deletedTicket = await ticketService.deleteTicket(id, userId);
    
    res.json({
      success: true,
      message: 'Ticket deleted successfully',
      deletedTicket: { id: parseInt(id) },
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ticket',
      message: error.message
    });
  }
});

// Delete multiple tickets (JWT authenticated)
app.delete('/api/tickets/batch', requiresAuth, async (req, res) => {
  try {
    const { ticketIds } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;
    
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'ticketIds array is required and must not be empty'
      });
    }
    
    const ticketService = require('./services/ticketService');
    
    const result = await ticketService.deleteTickets(ticketIds, userId);
    
    res.json({
      success: true,
      message: `${result.count} tickets deleted successfully`,
      deletedCount: result.count,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error deleting tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tickets',
      message: error.message
    });
  }
});


// SPA catch-all route - serve index.html for client-side routing
app.get('*', (req, res, next) => {
  // Don't serve SPA for API routes that return 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API route not found',
      message: 'The requested API endpoint does not exist'
    });
  }
  
  // Serve the Vue SPA index.html for all other routes
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎫 Ticketeer SPA server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Vue.js SPA: http://localhost:${PORT}`);
  console.log(`🔐 Auth0 SPA authentication enabled`);
  console.log(`   Domain: ${AUTH0_DOMAIN}`);
  console.log(`   Audience: ${AUTH0_AUDIENCE}`);
});

module.exports = app;
