const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { requiresAuth, AUTH0_DOMAIN, AUTH0_AUDIENCE } = require('./middleware/auth');
const corsMiddleware = require('./middleware/cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const profileRoutes = require('./routes/profileRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const publicRoutes = require('./routes/publicRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', ticketRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ticketeer SPA server is running!',
    timestamp: new Date().toISOString(),
    auth: { domain: AUTH0_DOMAIN, audience: AUTH0_AUDIENCE }
  });
});

app.get('/api/test/simple', (req, res) => {
  res.json({ success: true, message: 'Simple test endpoint working!', timestamp: new Date().toISOString() });
});

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
    res.status(500).json({ error: 'Failed to process request', message: error.message });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found', message: 'The requested API endpoint does not exist' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal server error', message: 'Something went wrong on the server' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎫 Ticketeer SPA server is running on http://localhost:${PORT}`);
});

module.exports = app;
