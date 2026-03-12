const express = require('express');
const router = express.Router();
const { requiresAuth } = require('../middleware/auth');
const eventService = require('../services/eventService');

router.get('/stats', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const stats = await eventService.getDashboardStats(userId);
    res.json({ success: true, stats, timestamp: new Date().toISOString(), user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub });
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics', message: error.message });
  }
});

router.get('/recent-purchases', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const purchases = await eventService.getRecentPurchases(userId);
    res.json({ success: true, purchases, count: purchases.length, timestamp: new Date().toISOString(), user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub });
  } catch (error) {
    console.error('Error fetching recent purchases:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent purchases', message: error.message });
  }
});

module.exports = router;
