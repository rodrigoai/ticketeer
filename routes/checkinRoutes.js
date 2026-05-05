const express = require('express');
const accessoryPickupService = require('../services/accessoryPickupService');
const checkinService = require('../services/checkinService');

function getAuthenticatedUserId(req) {
  return req.auth.payload?.sub || req.auth.sub;
}

function getAuthenticatedUserLabel(req) {
  return req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub;
}

function isInvalidTicketHashError(error) {
  return error.message.includes('Invalid hash format') ||
    error.message.includes('Ticket not found');
}

function isAccessDeniedError(error) {
  return error.message.includes('Event not found') ||
    error.message.includes('access denied');
}

function isTicketAccessDeniedError(error) {
  return error.message.includes('Ticket not found') ||
    error.message.includes('access denied');
}

function validateHash(hash, res) {
  if (!hash || typeof hash !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Invalid hash format',
      message: 'Hash parameter is required and must be a string'
    });
    return false;
  }

  return true;
}

function createCheckinRoutes({ requiresAuth }) {
  const router = express.Router();

  router.get('/public/checkin/:hash', async (req, res) => {
    try {
      const { hash } = req.params;

      if (!validateHash(hash, res)) return;

      const status = await checkinService.getCheckinStatus(hash);

      res.json(status);
    } catch (error) {
      console.error('Error getting check-in status:', error);

      if (isInvalidTicketHashError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'No ticket found for the provided hash'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get check-in status',
        message: error.message
      });
    }
  });

  router.post('/public/checkin/:hash', async (req, res) => {
    try {
      const { hash } = req.params;

      if (!validateHash(hash, res)) return;

      const result = await checkinService.processCheckin(hash);

      if (!result.success && result.alreadyCheckedIn) {
        return res.status(409).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error processing check-in:', error);

      if (isInvalidTicketHashError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'No ticket found for the provided hash'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process check-in',
        message: error.message
      });
    }
  });

  router.get('/events/:eventId/checkin/stats', requiresAuth, async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = getAuthenticatedUserId(req);

      const stats = await checkinService.getEventCheckinStats(eventId, userId);

      res.json({
        ...stats,
        user: getAuthenticatedUserLabel(req)
      });
    } catch (error) {
      console.error('Error getting check-in stats:', error);

      if (isAccessDeniedError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
          message: 'Event not found or you do not have access to it'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get check-in statistics',
        message: error.message
      });
    }
  });

  router.get('/tickets/:ticketId/checkin-hash', requiresAuth, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const userId = getAuthenticatedUserId(req);

      const hash = await checkinService.generateCheckinHash(ticketId, userId);

      res.json({
        success: true,
        ticketId: parseInt(ticketId),
        hash,
        checkinUrl: `${req.protocol}://${req.get('host')}/checkin/${hash}`,
        user: getAuthenticatedUserLabel(req)
      });
    } catch (error) {
      console.error('Error generating check-in hash:', error);

      if (isTicketAccessDeniedError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'Ticket not found or you do not have access to it'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to generate check-in hash',
        message: error.message
      });
    }
  });

  router.get('/public/accessory-pickup/:hash', async (req, res) => {
    try {
      const { hash } = req.params;

      if (!validateHash(hash, res)) return;

      const status = await accessoryPickupService.getPickupStatus(hash);

      res.json(status);
    } catch (error) {
      console.error('Error getting accessory pickup status:', error);

      if (isInvalidTicketHashError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'No ticket found for the provided hash'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get accessory pickup status',
        message: error.message
      });
    }
  });

  router.post('/public/accessory-pickup/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      const { notes } = req.body;

      if (!validateHash(hash, res)) return;

      const result = await accessoryPickupService.processPickup(hash, notes);

      if (!result.success && result.alreadyCollected) {
        return res.status(409).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error processing accessory pickup:', error);

      if (isInvalidTicketHashError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'No ticket found for the provided hash'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process accessory pickup',
        message: error.message
      });
    }
  });

  router.get('/events/:eventId/accessory-pickup/stats', requiresAuth, async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = getAuthenticatedUserId(req);

      const stats = await accessoryPickupService.getEventPickupStats(eventId, userId);

      res.json({
        ...stats,
        user: getAuthenticatedUserLabel(req)
      });
    } catch (error) {
      console.error('Error getting accessory pickup stats:', error);

      if (isAccessDeniedError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
          message: 'Event not found or you do not have access to it'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get accessory pickup statistics',
        message: error.message
      });
    }
  });

  router.get('/tickets/:ticketId/accessory-pickup-hash', requiresAuth, async (req, res) => {
    try {
      const { ticketId } = req.params;
      const userId = getAuthenticatedUserId(req);

      const hash = await accessoryPickupService.generatePickupHash(ticketId, userId);

      res.json({
        success: true,
        ticketId: parseInt(ticketId),
        hash,
        pickupUrl: `${req.protocol}://${req.get('host')}/accessory-pickup/${hash}`,
        user: getAuthenticatedUserLabel(req)
      });
    } catch (error) {
      console.error('Error generating accessory pickup hash:', error);

      if (isTicketAccessDeniedError(error)) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          message: 'Ticket not found or you do not have access to it'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to generate accessory pickup hash',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createCheckinRoutes;
