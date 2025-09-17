const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Serve Vue.js SPA built files
app.use(express.static(path.join(__dirname, 'dist')));

// Mock API endpoints for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test Ticketeer server is running!',
    timestamp: new Date().toISOString()
  });
});

// Mock authentication status (not authenticated for testing)
app.get('/api/auth/status', (req, res) => {
  res.json({
    isAuthenticated: false,
    user: null
  });
});

// Mock events endpoint
app.get('/api/events', (req, res) => {
  res.json({
    success: true,
    events: [
      {
        id: 1,
        title: 'Sample Concert',
        description: 'A great musical event',
        date: '2024-12-01T19:00:00Z',
        venue: 'Music Hall',
        price: 50
      },
      {
        id: 2,
        title: 'Tech Conference 2024',
        description: 'Latest in technology trends',
        date: '2024-11-15T09:00:00Z',
        venue: 'Convention Center',
        price: 150
      }
    ],
    count: 2
  });
});

// Mock stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    totalEvents: 2,
    activeEvents: 2,
    ticketsSold: 25,
    revenue: 1250
  });
});

// Mock sales endpoint
app.get('/api/sales', (req, res) => {
  res.json({
    sales: [
      {
        id: 'order-1',
        eventTitle: 'Sample Concert',
        customerName: 'John Doe',
        quantity: 2,
        amount: 100,
        date: '2024-09-02T15:30:00Z',
        status: 'completed'
      },
      {
        id: 'order-2',
        eventTitle: 'Tech Conference 2024',
        customerName: 'Jane Smith',
        quantity: 1,
        amount: 150,
        date: '2024-09-01T10:15:00Z',
        status: 'completed'
      }
    ],
    stats: {
      totalSales: 2,
      totalRevenue: 250,
      todaySales: 0,
      averageTicketPrice: 125
    }
  });
});

// SPA catch-all route - serve index.html for client-side routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎫 Test Ticketeer server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Vue.js interface: http://localhost:${PORT}`);
});

module.exports = app;
