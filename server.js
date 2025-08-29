const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'qlByYcSCiSr8zYCHL5-P-NjP5cYu6YeItjQRDWdi5WWxNFuwOL4YgvhCx97cGsz0',
  baseURL: 'http://localhost:3000',
  clientID: '1PlShClpoRxkSeKWZtgq4vVnUxLg40F4',
  issuerBaseURL: 'https://novamoney.us.auth0.com'
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// req.isAuthenticated is provided from the auth router
app.get('/', (req, res) => {
  res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
});


// Middleware to serve static files (HTML, CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname)));

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the callback page
app.get('/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'callback.html'));
});

// API Routes for future development
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ticketeer server is running!',
    timestamp: new Date().toISOString()
  });
});

// Future API endpoints for ticket management
app.get('/api/events', (req, res) => {
  res.json({ 
    events: [],
    message: 'Events endpoint - ready for implementation'
  });
});

app.get('/api/sales', (req, res) => {
  res.json({ 
    sales: [],
    totalRevenue: 0,
    message: 'Sales endpoint - ready for implementation'
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalEvents: 0,
    ticketsSold: 0,
    revenue: 0,
    activeEvents: 0,
    message: 'Stats endpoint - ready for implementation'
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
