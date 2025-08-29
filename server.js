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
