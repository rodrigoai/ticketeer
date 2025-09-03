const express = require('express');
const path = require('path');
const { auth, requiresAuth } = require('express-openid-connect');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auth0 Configuration for express-openid-connect
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_CLIENT_SECRET || 'qlByYcSCiSr8zYCHL5-P-NjP5cYu6YeItjQRDWdi5WWxNFuwOL4YgvhCx97cGsz0',
  baseURL: process.env.BASE_URL || `http://localhost:${PORT}`,
  clientID: process.env.AUTH0_CLIENT_ID || '1PlShClpoRxkSeKWZtgq4vVnUxLg40F4',
  issuerBaseURL: process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : 'https://novamoney.us.auth0.com',
  routes: {
    login: '/login',
    logout: '/logout',
    callback: '/callback'
  }
};

// Auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// Middleware to serve static files (HTML, CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname)));

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Dashboard route (protected)
app.get('/dashboard', requiresAuth(), (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Events page route (protected)
app.get('/events', requiresAuth(), (req, res) => {
  res.sendFile(path.join(__dirname, 'events.html'));
});

// Note: /login, /logout, and /callback routes are handled by express-openid-connect automatically

// Authentication status endpoint
app.get('/api/auth/status', (req, res) => {
  res.json({
    isAuthenticated: req.oidc.isAuthenticated(),
    user: req.oidc.isAuthenticated() ? req.oidc.user : null
  });
});

// User profile endpoint (protected)
app.get('/api/auth/profile', requiresAuth(), (req, res) => {
  res.json({
    user: req.oidc.user,
    claims: req.oidc.idTokenClaims
  });
});

// Import Event service and upload middleware
const eventService = require('./services/eventService');
const { eventImageUpload, handleUploadErrors, getFilePaths } = require('./middleware/upload');

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes for future development
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ticketeer server is running!',
    timestamp: new Date().toISOString(),
    auth: {
      domain: process.env.AUTH0_DOMAIN || 'Not configured',
      clientId: process.env.AUTH0_CLIENT_ID || 'Not configured'
    }
  });
});

// Event CRUD API endpoints (protected)

// GET /api/events - List all events for the authenticated user
app.get('/api/events', requiresAuth(), async (req, res) => {
  try {
    const userId = req.oidc.user.sub; // Auth0 user ID
    const { status, upcoming } = req.query;
    
    const filters = {
      created_by: userId,
      status: status || 'active',
      upcoming: upcoming === 'true'
    };
    
    const events = await eventService.getEvents(filters);
    
    res.json({
      success: true,
      events,
      count: events.length,
      user: req.oidc.user?.email
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

// GET /api/events/:id - Get a specific event
app.get('/api/events/:id', requiresAuth(), async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const { id } = req.params;
    
    const event = await eventService.getEventById(id, userId);
    
    res.json({
      success: true,
      event,
      user: req.oidc.user?.email
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

// POST /api/events - Create a new event
app.post('/api/events', requiresAuth(), eventImageUpload, async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const {
      name,
      opening_datetime,
      closing_datetime,
      description,
      venue
    } = req.body;
    
    // Validate required fields
    if (!name || !opening_datetime || !closing_datetime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Event name, opening date/time, and closing date/time are required'
      });
    }
    
    // Validate dates
    const openDate = new Date(opening_datetime);
    const closeDate = new Date(closing_datetime);
    
    if (openDate >= closeDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dates',
        message: 'Opening date must be before closing date'
      });
    }
    
    // Get file paths from uploaded files
    const filePaths = getFilePaths(req.files || {});
    
    const eventData = {
      name,
      opening_datetime,
      closing_datetime,
      description,
      venue,
      created_by: userId,
      ...filePaths
    };
    
    const event = await eventService.createEvent(eventData);
    
    res.status(201).json({
      success: true,
      event,
      message: 'Event created successfully',
      user: req.oidc.user?.email
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

// PUT /api/events/:id - Update an existing event
app.put('/api/events/:id', requiresAuth(), eventImageUpload, async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const { id } = req.params;
    const {
      name,
      opening_datetime,
      closing_datetime,
      description,
      venue,
      status
    } = req.body;
    
    // Validate dates if provided
    if (opening_datetime && closing_datetime) {
      const openDate = new Date(opening_datetime);
      const closeDate = new Date(closing_datetime);
      
      if (openDate >= closeDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid dates',
          message: 'Opening date must be before closing date'
        });
      }
    }
    
    // Get file paths from uploaded files (only update if new files uploaded)
    const filePaths = getFilePaths(req.files || {});
    
    const eventData = {
      name,
      opening_datetime,
      closing_datetime,
      description,
      venue,
      status,
      ...filePaths
    };
    
    // Remove undefined values to avoid overwriting with undefined
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === undefined) {
        delete eventData[key];
      }
    });
    
    const event = await eventService.updateEvent(id, eventData, userId);
    
    res.json({
      success: true,
      event,
      message: 'Event updated successfully',
      user: req.oidc.user?.email
    });
  } catch (error) {
    console.error('Error updating event:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update event',
      message: error.message
    });
  }
});

// DELETE /api/events/:id - Delete an event
app.delete('/api/events/:id', requiresAuth(), async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const { id } = req.params;
    
    const event = await eventService.deleteEvent(id, userId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully',
      deletedEvent: event,
      user: req.oidc.user?.email
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

app.get('/api/sales', requiresAuth(), (req, res) => {
  res.json({ 
    sales: [],
    totalRevenue: 0,
    message: 'Sales endpoint - ready for implementation',
    user: req.oidc.user?.email || 'Unknown user'
  });
});

app.get('/api/stats', requiresAuth(), async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const stats = await eventService.getEventStats(userId);
    
    res.json({
      success: true,
      ...stats,
      ticketsSold: 0, // TODO: Implement when ticket system is added
      revenue: 0, // TODO: Implement when payment system is added
      user: req.oidc.user?.email
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// Public API endpoints (no authentication required)
app.get('/api/public/events', (req, res) => {
  res.json({ 
    events: [
      {
        id: 1,
        title: 'Sample Concert',
        date: '2024-12-01',
        venue: 'Music Hall',
        ticketsAvailable: 100,
        price: 50
      },
      {
        id: 2,
        title: 'Tech Conference',
        date: '2024-11-15',
        venue: 'Convention Center',
        ticketsAvailable: 500,
        price: 150
      }
    ],
    message: 'Public events (no authentication required)'
  });
});

// 404 handler (apply to all unmatched routes)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Upload error handling middleware
app.use(handleUploadErrors);

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
  console.log(`🎫 Ticketeer server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
});

module.exports = app;
