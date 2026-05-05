const express = require('express');

const createDashboardRoutes = ({ prisma, requiresAuth }) => {
  const router = express.Router();

  router.get('/stats', requiresAuth, async (req, res) => {
    try {
      const userId = req.auth.payload?.sub || req.auth.sub;

      // Get user's events count (active only)
      const totalActiveEvents = await prisma.event.count({
        where: {
          status: 'active',
          created_by: userId
        }
      });

      // Get total tickets sold for user's events (tickets with orders)
      const userEvents = await prisma.event.findMany({
        where: { created_by: userId },
        select: { id: true }
      });

      const userEventIds = userEvents.map(event => event.id);

      const totalTicketsSold = await prisma.ticket.count({
        where: {
          eventId: { in: userEventIds },
          order: {
            not: null
          },
          NOT: {
            order: ''
          }
        }
      });

      // Get total revenue from sold tickets for user's events
      const revenueStats = await prisma.ticket.aggregate({
        where: {
          eventId: { in: userEventIds },
          order: {
            not: null
          },
          NOT: {
            order: ''
          }
        },
        _sum: {
          price: true
        }
      });

      // Get user's upcoming events count
      const upcomingEvents = await prisma.event.count({
        where: {
          status: 'active',
          created_by: userId,
          opening_datetime: {
            gte: new Date()
          }
        }
      });

      res.json({
        success: true,
        stats: {
          totalActiveEvents,
          totalTicketsSold,
          totalRevenue: parseFloat(revenueStats._sum.price || 0),
          upcomingEvents
        },
        timestamp: new Date().toISOString(),
        user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
      });
    } catch (error) {
      console.error('Error fetching user dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
        message: error.message
      });
    }
  });

  router.get('/recent-purchases', requiresAuth, async (req, res) => {
    try {
      const userId = req.auth.payload?.sub || req.auth.sub;

      // Get user's events
      const userEvents = await prisma.event.findMany({
        where: { created_by: userId },
        select: { id: true }
      });

      const userEventIds = userEvents.map(event => event.id);

      // Get last 10 tickets that have been purchased for user's events
      const recentPurchases = await prisma.ticket.findMany({
        where: {
          eventId: { in: userEventIds },
          order: {
            not: null
          },
          NOT: {
            order: ''
          }
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              opening_datetime: true
            }
          }
        },
        orderBy: {
          updated_at: 'desc'
        },
        take: 10
      });

      // Map to safe format (show buyer information since user owns the events)
      const userPurchases = recentPurchases.map(ticket => ({
        id: ticket.id,
        eventName: ticket.event.name,
        venue: ticket.event.venue,
        eventDate: ticket.event.opening_datetime,
        description: ticket.description,
        identificationNumber: ticket.identificationNumber,
        location: ticket.location,
        table: ticket.table,
        price: parseFloat(ticket.price || 0),
        // Show buyer information since user owns the event
        buyerDisplayName: ticket.buyer || 'Anonymous',
        buyerEmail: ticket.buyerEmail,
        buyerDocument: ticket.buyerDocument,
        purchaseDate: ticket.updated_at
      }));

      res.json({
        success: true,
        purchases: userPurchases,
        count: userPurchases.length,
        timestamp: new Date().toISOString(),
        user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
      });
    } catch (error) {
      console.error('Error fetching recent purchases:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent purchases',
        message: error.message
      });
    }
  });

  return router;
};

module.exports = createDashboardRoutes;
