const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auth0 configuration for JWT validation
const AUTH0_DOMAIN = 'novamoney.us.auth0.com';
const AUTH0_AUDIENCE = 'https://ticket.nova.money';

// Create JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Function to get signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, getKey, {
    audience: AUTH0_AUDIENCE,
    issuer: `https://${AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
  });
};

// Optional middleware - only verify if token is present
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  verifyToken(req, res, next);
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

// Authentication status endpoint (client-side auth, no server session)
app.get('/api/auth/status', optionalAuth, (req, res) => {
  res.json({
    isAuthenticated: !!req.user,
    user: req.user || null
  });
});

// User profile endpoint (for JWT authenticated users)
app.get('/api/auth/profile', verifyToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Mock Events API (with JWT authentication)
app.get('/api/events', verifyToken, (req, res) => {
  const userId = req.user.sub;
  
  res.json({
    success: true,
    events: [
      {
        id: 1,
        name: 'Sample Concert',
        title: 'Sample Concert',
        description: 'A great musical event',
        opening_datetime: '2024-12-01T19:00:00Z',
        closing_datetime: '2024-12-01T23:00:00Z',
        date: '2024-12-01T19:00:00Z',
        venue: 'Music Hall',
        price: 50,
        created_by: userId
      },
      {
        id: 2,
        name: 'Tech Conference 2024',
        title: 'Tech Conference 2024',
        description: 'Latest in technology trends',
        opening_datetime: '2024-11-15T09:00:00Z',
        closing_datetime: '2024-11-15T17:00:00Z',
        date: '2024-11-15T09:00:00Z',
        venue: 'Convention Center',
        price: 150,
        created_by: userId
      }
    ],
    count: 2,
    user: req.user?.email || req.user?.name
  });
});

// Mock event creation (protected)
app.post('/api/events', verifyToken, (req, res) => {
  const { title, description, date, venue, price } = req.body;
  const userId = req.user.sub;
  
  // Validate required fields
  if (!title || !date || !venue) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Title, date, and venue are required'
    });
  }
  
  res.status(201).json({
    success: true,
    event: {
      id: Date.now(),
      title,
      description,
      date,
      venue,
      price: parseFloat(price) || 0,
      created_by: userId
    },
    message: 'Event created successfully',
    user: req.user?.email || req.user?.name
  });
});

// Mock event update (protected)
app.put('/api/events/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, description, date, venue, price } = req.body;
  const userId = req.user.sub;
  
  res.json({
    success: true,
    event: {
      id: parseInt(id),
      title,
      description,
      date,
      venue,
      price: parseFloat(price) || 0,
      created_by: userId
    },
    message: 'Event updated successfully',
    user: req.user?.email || req.user?.name
  });
});

// Mock event deletion (protected)
app.delete('/api/events/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    message: 'Event deleted successfully',
    deletedEvent: { id: parseInt(id) },
    user: req.user?.email || req.user?.name
  });
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
