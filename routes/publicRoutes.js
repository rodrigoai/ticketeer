const express = require('express');
const router = express.Router();
const ticketService = require('../services/ticketService');
const eventService = require('../services/eventService');
const userProfileService = require('../services/userProfileService');
const orderService = require('../services/orderService');
const checkinService = require('../services/checkinService');
const accessoryPickupService = require('../services/accessoryPickupService');

const normalizeNovaTenant = (tenant) => {
  if (!tenant) return '';
  let cleaned = tenant.trim();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/\/.*$/, '');
  cleaned = cleaned.replace(/\.?pay\.nova\.money$/i, '');
  cleaned = cleaned.replace(/\.$/, '');
  return cleaned;
};

const buildNovaCheckoutUrl = (tenant, checkoutPageId, eventId) => {
  const normalizedTenant = normalizeNovaTenant(tenant);
  if (!normalizedTenant || !checkoutPageId) return null;
  const baseUrl = `https://${normalizedTenant}.pay.nova.money/checkout/${checkoutPageId}`;
  if (!eventId) return baseUrl;
  const encodedEventId = Buffer.from(String(eventId)).toString('base64').replace(/=+$/, '');
  return `${baseUrl}?meta.eventId=${encodedEventId}`;
};

router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventService.getEventById(id);
    if (!event || event.status !== 'active') {
      return res.status(404).json({ success: false, error: 'Event not found', message: 'Event does not exist or is not available' });
    }
    const profile = await userProfileService.getProfileByUserId(event.created_by);
    const checkoutUrl = buildNovaCheckoutUrl(profile?.nova_money_tenant, event.checkout_page_id, event.id);
    const checkoutBaseUrl = buildNovaCheckoutUrl(profile?.nova_money_tenant, event.checkout_page_id, null);
    const landingTickets = await ticketService.getLandingTicketsByEvent(event.id);
    const tickets = landingTickets.map((ticket) => ({ id: ticket.id, eventId: ticket.eventId, description: ticket.description, identificationNumber: ticket.identificationNumber, table: ticket.table, price: parseFloat(ticket.price) || 0, order: ticket.order, salesEndDateTime: ticket.salesEndDateTime, created_at: ticket.created_at, updated_at: ticket.updated_at }));
    res.json({ success: true, event: { id: event.id, title: event.name, name: event.name, description: event.description, date: event.opening_datetime, opening_datetime: event.opening_datetime, closing_datetime: event.closing_datetime, eventImageUrl: event.event_image_url, venue: event.venue, checkoutPageId: event.checkout_page_id, checkoutPageTitle: event.checkout_page_title, created_by: event.created_by }, checkoutUrl, checkoutBaseUrl, tickets });
  } catch (error) {
    console.error('Error fetching public event:', error);
    if (error.message && error.message.includes('Event not found')) {
      return res.status(404).json({ success: false, error: 'Event not found', message: 'Event does not exist or is not available' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch event', message: error.message });
  }
});

router.get('/tickets/search', async (req, res) => {
  try {
    const { userId, eventId, available } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'userId parameter is required' });
    }
    if (!eventId) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'eventId parameter is required' });
    }
    if (isNaN(parseInt(eventId))) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'eventId must be a valid number' });
    }
    let availableOnly = false;
    if (available !== undefined) {
      if (available === 'true') { availableOnly = true; }
      else if (available === 'false') { availableOnly = false; }
      else { return res.status(400).json({ success: false, error: 'Validation failed', message: 'Available parameter must be "true" or "false"' }); }
    }
    const result = await ticketService.searchTicketsPublic(eventId, userId, availableOnly);
    const mappedTickets = result.tickets.map(ticket => ({ id: ticket.id, eventId: ticket.eventId, description: ticket.description, identificationNumber: ticket.identificationNumber, location: ticket.location, table: ticket.table, price: parseFloat(ticket.price) || 0, order: ticket.order, salesEndDateTime: ticket.salesEndDateTime, checkedIn: ticket.checkedIn, checkedInAt: ticket.checkedInAt, accessoryCollected: ticket.accessoryCollected, accessoryCollectedAt: ticket.accessoryCollectedAt, created_at: ticket.created_at, updated_at: ticket.updated_at }));
    res.json({ success: true, tickets: mappedTickets, count: mappedTickets.length, eventId: parseInt(eventId), userId: userId, filter: { available: availableOnly } });
  } catch (error) {
    console.error('Error in public ticket search:', error);
    if (error.message.includes('does not exist or has no events')) { return res.status(404).json({ success: false, error: 'User not found', message: error.message }); }
    if (error.message.includes('Event not found or does not belong to user')) { return res.status(404).json({ success: false, error: 'Event not found', message: error.message }); }
    res.status(500).json({ success: false, error: 'Failed to search tickets', message: error.message });
  }
});

router.get('/orders/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const orderDetails = await orderService.getOrderByHash(hash);
    res.json({ success: true, order: orderDetails });
  } catch (error) {
    console.error('Error fetching order by hash:', error);
    if (error.message.includes('Invalid hash format')) { return res.status(400).json({ success: false, error: 'Invalid hash format', message: 'The provided hash is not valid' }); }
    if (error.message.includes('Order not found')) { return res.status(404).json({ success: false, error: 'Order not found', message: 'No order found for the provided hash' }); }
    res.status(500).json({ success: false, error: 'Failed to fetch order', message: error.message });
  }
});

router.post('/orders/:hash/buyers', async (req, res) => {
  try {
    const { hash } = req.params;
    const { buyers } = req.body;
    if (!buyers || !Array.isArray(buyers)) { return res.status(400).json({ success: false, error: 'Invalid request', message: 'Buyers data must be provided as an array' }); }
    const result = await orderService.saveBuyersForOrder(hash, buyers);
    res.json({ success: true, message: result.message, orderId: result.orderId, updatedTickets: result.updatedTickets });
  } catch (error) {
    console.error('Error saving buyers for order:', error);
    if (error.message.includes('Invalid hash format')) { return res.status(400).json({ success: false, error: 'Invalid hash format', message: 'The provided hash is not valid' }); }
    if (error.message.includes('Order not found')) { return res.status(404).json({ success: false, error: 'Order not found', message: 'No order found for the provided hash' }); }
    if (error.message.includes('already been completed')) { return res.status(409).json({ success: false, error: 'Order already completed', message: 'This order has already been completed and cannot be modified' }); }
    if (error.message.includes('All fields are required') || error.message.includes('Invalid') || error.message.includes('already used')) { return res.status(400).json({ success: false, error: 'Validation failed', message: error.message }); }
    res.status(500).json({ success: false, error: 'Failed to save buyers', message: error.message });
  }
});

router.get('/checkin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash || typeof hash !== 'string') { return res.status(400).json({ success: false, error: 'Invalid hash format', message: 'Hash parameter is required and must be a string' }); }
    const status = await checkinService.getCheckinStatus(hash);
    res.json(status);
  } catch (error) {
    console.error('Error getting check-in status:', error);
    if (error.message.includes('Invalid hash format') || error.message.includes('Ticket not found')) { return res.status(404).json({ success: false, error: 'Ticket not found', message: 'No ticket found for the provided hash' }); }
    res.status(500).json({ success: false, error: 'Failed to get check-in status', message: error.message });
  }
});

router.post('/checkin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash || typeof hash !== 'string') { return res.status(400).json({ success: false, error: 'Invalid hash format', message: 'Hash parameter is required and must be a string' }); }
    const result = await checkinService.processCheckin(hash);
    if (!result.success && result.alreadyCheckedIn) { return res.status(409).json(result); }
    res.json(result);
  } catch (error) {
    console.error('Error processing check-in:', error);
    if (error.message.includes('Invalid hash format') || error.message.includes('Ticket not found')) { return res.status(404).json({ success: false, error: 'Ticket not found', message: 'No ticket found for the provided hash' }); }
    res.status(500).json({ success: false, error: 'Failed to process check-in', message: error.message });
  }
});

router.get('/accessory-pickup/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash || typeof hash !== 'string') { return res.status(400).json({ success: false, error: 'Invalid hash format', message: 'Hash parameter is required and must be a string' }); }
    const status = await accessoryPickupService.getPickupStatus(hash);
    res.json(status);
  } catch (error) {
    console.error('Error getting accessory pickup status:', error);
    if (error.message.includes('Invalid hash format') || error.message.includes('Ticket not found')) { return res.status(404).json({ success: false, error: 'Ticket not found', message: 'No ticket found for the provided hash' }); }
    res.status(500).json({ success: false, error: 'Failed to get accessory pickup status', message: error.message });
  }
});

router.post('/accessory-pickup/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { notes } = req.body;
    if (!hash || typeof hash !== 'string') { return res.status(400).json({ success: false, error: 'Invalid hash format', message: 'Hash parameter is required and must be a string' }); }
    const result = await accessoryPickupService.processPickup(hash, notes);
    if (!result.success && result.alreadyCollected) { return res.status(409).json(result); }
    res.json(result);
  } catch (error) {
    console.error('Error processing accessory pickup:', error);
    if (error.message.includes('Invalid hash format') || error.message.includes('Ticket not found')) { return res.status(404).json({ success: false, error: 'Ticket not found', message: 'No ticket found for the provided hash' }); }
    res.status(500).json({ success: false, error: 'Failed to process accessory pickup', message: error.message });
  }
});

module.exports = router;
