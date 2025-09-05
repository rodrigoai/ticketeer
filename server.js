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
        sub: req.auth?.sub || 'N/A',
        email: req.auth?.email || 'N/A',
        name: req.auth?.name || 'N/A',
        picture: req.auth?.picture || 'N/A'
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
    const userId = req.auth.sub; // Get user ID from JWT token
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
      user: req.auth.email || req.auth.sub
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
    const { title, description, date, venue, price } = req.body;
    const userId = req.auth.sub; // Get user ID from JWT token
    
    // Validate required fields
    if (!title || !date || !venue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, date, and venue are required'
      });
    }
    
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
    
    const newEvent = await eventService.createEvent(eventData);
    
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
      user: req.auth.email || req.auth.sub
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

// Update event in database (JWT authenticated)
app.put('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, venue, price } = req.body;
    const userId = req.auth.sub; // Get user ID from JWT token
    
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
      user: req.auth.email || req.auth.sub
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
    const userId = req.auth.sub; // Get user ID from JWT token
    
    const eventService = require('./services/eventService');
    
    const deletedEvent = await eventService.deleteEvent(id, userId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully',
      deletedEvent: { id: parseInt(id) },
      user: req.auth.email || req.auth.sub
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
