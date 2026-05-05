const express = require('express');

const createHealthRoutes = ({ authConfig, requiresAuth }) => {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Ticketeer SPA server is running!',
      timestamp: new Date().toISOString(),
      auth: {
        domain: authConfig.domain,
        audience: authConfig.audience
      }
    });
  });

  router.get('/test/simple', (req, res) => {
    res.json({
      success: true,
      message: 'Simple test endpoint working!',
      timestamp: new Date().toISOString()
    });
  });

  router.get('/test/protected', requiresAuth, (req, res) => {
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

  return router;
};

module.exports = createHealthRoutes;
