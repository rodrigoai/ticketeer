const express = require('express');
const ticketService = require('../services/ticketService');

function createWebhookRoutes({ prisma }) {
  const router = express.Router();

  router.post('/checkout/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const webhookPayload = req.body;

      console.log(`Received checkout webhook for userId: ${userId}`, JSON.stringify(webhookPayload, null, 2));

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid userId parameter',
          message: 'userId parameter is required and must be a string'
        });
      }

      try {
        const userExists = await prisma.event.findFirst({
          where: { created_by: userId },
          select: { id: true }
        });

        if (!userExists) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            message: `User with ID '${userId}' does not exist or has no events`
          });
        }
      } catch (dbError) {
        console.error('Database error during user validation:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database validation error',
          message: 'Failed to validate user existence'
        });
      }

      if (!webhookPayload || !webhookPayload.event) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook payload',
          message: 'Missing event field in webhook payload'
        });
      }

      const isShoppingCartWebhook = Array.isArray(webhookPayload?.payload?.meta?.ticketIds)
        && webhookPayload?.payload?.meta?.userId
        && webhookPayload?.payload?.meta?.eventId;

      if (!isShoppingCartWebhook && webhookPayload.event !== 'order.paid') {
        console.log(`Ignoring webhook event: ${webhookPayload.event}`);
        return res.json({
          success: true,
          message: `Webhook event '${webhookPayload.event}' acknowledged but not processed`
        });
      }

      console.log('userID: ', userId);
      const result = isShoppingCartWebhook
        ? await ticketService.processShoppingCartWebhook(webhookPayload, userId)
        : await ticketService.processCheckoutWebhook(webhookPayload, userId);

      console.log('Webhook processed successfully:', result);

      res.json({
        success: true,
        message: result.message,
        userId,
        data: {
          orderId: result.orderId,
          tableNumber: result.tableNumber,
          ticketIds: result.ticketIds,
          buyerAssigned: result.buyerAssigned,
          processedTickets: result.updatedTickets.length
        }
      });
    } catch (error) {
      console.error('Error processing checkout webhook:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createWebhookRoutes;
