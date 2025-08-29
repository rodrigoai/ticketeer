const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { auth, requiresAuth } = require('express-openid-connect');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auth0 Configuration
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_CLIENT_SECRET || 'your-long-random-string-for-development',
  baseURL: process.env.BASE_URL || `http://localhost:${PORT}`,
  clientID: process.env.AUTH0_CLIENT_ID || 'your-client-id',
  issuerBaseURL: process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : 'https://your-domain.auth0.com',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || 'your-client-secret',
  routes: {
    login: false, // We'll handle login through SPA
    logout: '/auth/logout',
    callback: '/auth/callback'
  }
};

// Auth router attaches authentication routes
app.use(auth(config));

// Middleware to serve static files (HTML, CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname)));

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT verification middleware for API endpoints
const verifyApiToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const token = authHeader.substring(7);
  
  // In production, you should verify the JWT against Auth0's public key
  // For development, we'll do basic validation
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token format');
    }
    req.user = decoded.payload;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the callback page
app.get('/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'callback.html'));
});

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

// Protected API endpoints for ticket management (require authentication)
app.get('/api/events', requiresAuth(), (req, res) => {
  res.json({ 
    events: [],
    message: 'Events endpoint - ready for implementation',
    user: req.oidc.user?.email || 'Unknown user'
  });
});

app.post('/api/events', requiresAuth(), (req, res) => {
  res.json({ 
    message: 'Create event endpoint - ready for implementation',
    user: req.oidc.user?.email || 'Unknown user',
    eventData: req.body
  });
});

app.get('/api/sales', requiresAuth(), (req, res) => {
  res.json({ 
    sales: [],
    totalRevenue: 0,
    message: 'Sales endpoint - ready for implementation',
    user: req.oidc.user?.email || 'Unknown user'
  });
});

app.get('/api/stats', requiresAuth(), (req, res) => {
  res.json({
    totalEvents: 0,
    ticketsSold: 0,
    revenue: 0,
    activeEvents: 0,
    message: 'Stats endpoint - ready for implementation',
    user: req.oidc.user?.email || 'Unknown user'
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

// 404 handler (apply to all unmatched routes)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
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
  console.log(`🎫 Ticketeer server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
});

module.exports = app;
