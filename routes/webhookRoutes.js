const express = require('express');
const router = express.Router();
const ticketService = require('../services/ticketService');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

router.post('/checkout/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const webhookPayload = req.body;
    if (!userId || typeof userId !== 'string') { return res.status(400).json({ success: false, error: 'Invalid userId parameter', message: 'userId parameter is required and must be a string' }); }
    try {
      const userExists = await prisma.event.findFirst({ where: { created_by: userId }, select: { id: true } });
      if (!userExists) { return res.status(404).json({ success: false, error: 'User not found', message: `User with ID '${userId}' does not exist or has no events` }); }
    } catch (dbError) {
      console.error('Database error during user validation:', dbError);
      return res.status(500).json({ success: false, error: 'Database validation error', message: 'Failed to validate user existence' });
    }
    if (!webhookPayload || !webhookPayload.event) { return res.status(400).json({ success: false, error: 'Invalid webhook payload', message: 'Missing event field in webhook payload' }); }
    if (webhookPayload.event !== 'order.paid') { return res.json({ success: true, message: `Webhook event '${webhookPayload.event}' acknowledged but not processed` }); }
    const result = await ticketService.processCheckoutWebhook(webhookPayload, userId);
    res.json({ success: true, message: result.message, userId: userId, data: { orderId: result.orderId, tableNumber: result.tableNumber, ticketIds: result.ticketIds, buyerAssigned: result.buyerAssigned, processedTickets: result.updatedTickets.length } });
  } catch (error) {
    console.error('Error processing checkout webhook:', error);
    res.status(400).json({ success: false, error: 'Failed to process webhook', message: error.message });
  }
});

module.exports = router;
