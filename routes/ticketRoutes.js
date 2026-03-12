const express = require('express');
const router = express.Router();
const { requiresAuth } = require('../middleware/auth');
const ticketService = require('../services/ticketService');
const eventService = require('../services/eventService');
const emailService = require('../services/emailService');
const checkinService = require('../services/checkinService');
const accessoryPickupService = require('../services/accessoryPickupService');
const orderService = require('../services/orderService');

// Get all tickets for an event (JWT authenticated)
router.get('/events/:eventId/tickets', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const tickets = await ticketService.getTicketsByEvent(eventId, userId);

    const mappedTickets = tickets.map(ticket => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      buyerPhone: ticket.buyerPhone,
      salesEndDateTime: ticket.salesEndDateTime,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      accessoryCollected: ticket.accessoryCollected,
      accessoryCollectedAt: ticket.accessoryCollectedAt,
      accessoryCollectedNotes: ticket.accessoryCollectedNotes,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));

    res.json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      eventId: parseInt(eventId),
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
      message: error.message
    });
  }
});

// Get ticket statistics for an event (JWT authenticated)
router.get('/events/:eventId/tickets/stats', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const stats = await ticketService.getEventTicketStats(eventId, userId);

    const mappedStats = {
      totalTickets: stats.totalTickets,
      totalRevenue: parseFloat(stats.totalRevenue) || 0,
      averagePrice: parseFloat(stats.averagePrice) || 0,
      minPrice: parseFloat(stats.minPrice) || 0,
      maxPrice: parseFloat(stats.maxPrice) || 0,
      checkedInTickets: stats.checkedInTickets || 0,
      totalSold: stats.totalSold || 0,
      totalConfirmed: stats.totalConfirmed || 0,
      totalRemaining: stats.totalRemaining || 0
    };

    res.json({
      success: true,
      stats: mappedStats,
      eventId: parseInt(eventId),
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket statistics',
      message: error.message
    });
  }
});

// Search tickets for an event with filtering and privacy protection (JWT authenticated)
router.get('/events/:eventId/tickets/search', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { available } = req.query;
    const userId = req.user.id;

    let availableOnly = false;
    if (available !== undefined) {
      if (available === 'true') { availableOnly = true; }
      else if (available === 'false') { availableOnly = false; }
      else { return res.status(400).json({ success: false, error: 'Validation failed', message: 'Available parameter must be "true" or "false"' }); }
    }

    const tickets = await ticketService.searchTicketsByEvent(eventId, userId, availableOnly);

    const mappedTickets = tickets.map(ticket => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      salesEndDateTime: ticket.salesEndDateTime,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));

    res.json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      eventId: parseInt(eventId),
      filter: { available: availableOnly },
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error searching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tickets',
      message: error.message
    });
  }
});

// Create a single ticket for an event (JWT authenticated)
router.post('/events/:eventId/tickets', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { description, location, table, price, order, buyer, buyerDocument, buyerEmail, salesEndDateTime } = req.body;

    if (!description || price === undefined || price === null) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'Description and price are required' });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'Price must be a positive number' });
    }

    const ticketData = { description, location, table: table ? parseInt(table) : undefined, price: parseFloat(price), order, buyer, buyerDocument, buyerEmail, salesEndDateTime };
    const newTicket = await ticketService.createTicket(eventId, ticketData, userId);

    const mappedTicket = {
      id: newTicket.id,
      eventId: newTicket.eventId,
      description: newTicket.description,
      identificationNumber: newTicket.identificationNumber,
      location: newTicket.location,
      table: newTicket.table,
      price: parseFloat(newTicket.price) || 0,
      order: newTicket.order,
      buyer: newTicket.buyer,
      buyerDocument: newTicket.buyerDocument,
      buyerEmail: newTicket.buyerEmail,
      buyerPhone: newTicket.buyerPhone,
      salesEndDateTime: newTicket.salesEndDateTime,
      checkedIn: newTicket.checkedIn,
      checkedInAt: newTicket.checkedInAt,
      accessoryCollected: newTicket.accessoryCollected,
      accessoryCollectedAt: newTicket.accessoryCollectedAt,
      accessoryCollectedNotes: newTicket.accessoryCollectedNotes,
      created_at: newTicket.created_at,
      updated_at: newTicket.updated_at
    };

    res.status(201).json({
      success: true,
      ticket: mappedTicket,
      message: 'Ticket created successfully',
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to create ticket', message: error.message });
  }
});

// Create multiple tickets in batch for an event (JWT authenticated)
router.post('/events/:eventId/tickets/batch', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { description, location, table, price, order, buyer, buyerDocument, buyerEmail, salesEndDateTime, quantity } = req.body;

    if (!description || price === undefined || price === null || !quantity) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'Description, price, and quantity are required' });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'Price must be a positive number' });
    }

    if (parseInt(quantity) < 1 || parseInt(quantity) > 100) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'Quantity must be between 1 and 100' });
    }

    const ticketData = { description, location, table: table ? parseInt(table) : undefined, price: parseFloat(price), order, buyer, buyerDocument, buyerEmail, salesEndDateTime };
    const newTickets = await ticketService.createTicketsBatch(eventId, ticketData, parseInt(quantity), userId);

    const mappedTickets = newTickets.map(ticket => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      buyerPhone: ticket.buyerPhone,
      salesEndDateTime: ticket.salesEndDateTime,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));

    res.status(201).json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      message: `${mappedTickets.length} tickets created successfully`,
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error creating tickets batch:', error);
    res.status(500).json({ success: false, error: 'Failed to create tickets', message: error.message });
  }
});

// Get a specific ticket by ID (JWT authenticated)
router.get('/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const ticket = await ticketService.getTicketById(id, userId);

    const mappedTicket = {
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      buyerPhone: ticket.buyerPhone,
      salesEndDateTime: ticket.salesEndDateTime,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      accessoryCollected: ticket.accessoryCollected,
      accessoryCollectedAt: ticket.accessoryCollectedAt,
      accessoryCollectedNotes: ticket.accessoryCollectedNotes,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    };

    res.json({
      success: true,
      ticket: mappedTicket,
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket', message: error.message });
  }
});

// Update a ticket (JWT authenticated)
router.put('/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { description, location, table, price, order, buyer, buyerDocument, buyerEmail, salesEndDateTime, checkedIn, checkedInAt, accessoryCollected, accessoryCollectedAt, accessoryCollectedNotes } = req.body;

    if (price !== undefined && price !== null && parseFloat(price) < 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'Price must be a positive number' });
    }

    const ticketData = { description, location, table: table !== undefined ? (table ? parseInt(table) : null) : undefined, price: price !== undefined ? parseFloat(price) : undefined, order, buyer, buyerDocument, buyerEmail, salesEndDateTime, checkedIn, checkedInAt, accessoryCollected, accessoryCollectedAt, accessoryCollectedNotes };
    const updatedTicket = await ticketService.updateTicket(id, ticketData, userId);

    const mappedTicket = {
      id: updatedTicket.id,
      eventId: updatedTicket.eventId,
      description: updatedTicket.description,
      identificationNumber: updatedTicket.identificationNumber,
      location: updatedTicket.location,
      table: updatedTicket.table,
      price: parseFloat(updatedTicket.price) || 0,
      order: updatedTicket.order,
      buyer: updatedTicket.buyer,
      buyerDocument: updatedTicket.buyerDocument,
      buyerEmail: updatedTicket.buyerEmail,
      buyerPhone: updatedTicket.buyerPhone,
      salesEndDateTime: updatedTicket.salesEndDateTime,
      checkedIn: updatedTicket.checkedIn,
      checkedInAt: updatedTicket.checkedInAt,
      accessoryCollected: updatedTicket.accessoryCollected,
      accessoryCollectedAt: updatedTicket.accessoryCollectedAt,
      accessoryCollectedNotes: updatedTicket.accessoryCollectedNotes,
      created_at: updatedTicket.created_at,
      updated_at: updatedTicket.updated_at
    };

    res.json({
      success: true,
      ticket: mappedTicket,
      message: 'Ticket updated successfully',
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to update ticket', message: error.message });
  }
});

// Resend email for a ticket (JWT authenticated)
router.post('/tickets/:id/resend-email', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const ticket = await ticketService.getTicketById(id, userId);

    if (!ticket.buyer || !ticket.buyerEmail) {
      return res.status(400).json({ success: false, error: 'Cannot resend email', message: 'Ticket must have buyer name and email information' });
    }

    const event = await eventService.getEventById(ticket.eventId, userId);
    const emailResult = await emailService.sendTicketQrCodeEmail(
      ticket.buyerEmail,
      { id: ticket.id, identificationNumber: ticket.identificationNumber, buyer: ticket.buyer, description: ticket.description, eventId: ticket.eventId },
      { name: event.name, venue: event.venue, date: event.opening_datetime },
      userId
    );

    res.json({
      success: true,
      message: 'Email resent successfully',
      email: ticket.buyerEmail,
      ticketId: parseInt(id),
      messageId: emailResult.messageId,
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error resending email:', error);
    if (error.message.includes('Ticket not found') || error.message.includes('access denied')) {
      return res.status(404).json({ success: false, error: 'Ticket not found', message: 'Ticket not found or you do not have access to it' });
    }
    res.status(500).json({ success: false, error: 'Failed to resend email', message: error.message });
  }
});

// Delete a single ticket (JWT authenticated)
router.delete('/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await ticketService.deleteTicket(id, userId);
    res.json({
      success: true,
      message: 'Ticket deleted successfully',
      deletedTicket: { id: parseInt(id) },
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to delete ticket', message: error.message });
  }
});

// Delete multiple tickets (JWT authenticated)
router.delete('/tickets/batch', requiresAuth, async (req, res) => {
  try {
    const { ticketIds } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'ticketIds array is required and must not be empty' });
    }
    const result = await ticketService.deleteTickets(ticketIds, userId);
    res.json({
      success: true,
      message: `${result.count} tickets deleted successfully`,
      deletedCount: result.count,
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error deleting tickets:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tickets', message: error.message });
  }
});

// Bulk update multiple tickets (JWT authenticated)
router.post('/tickets/bulk-edit', requiresAuth, async (req, res) => {
  try {
    const { ticketIds, updates } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'ticketIds array is required and must not be empty' });
    }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'updates object is required' });
    }
    const updatedTickets = await ticketService.bulkUpdateTickets(ticketIds, updates, userId);
    const mappedTickets = updatedTickets.map(ticket => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      buyer: ticket.buyer,
      buyerDocument: ticket.buyerDocument,
      buyerEmail: ticket.buyerEmail,
      buyerPhone: ticket.buyerPhone,
      salesEndDateTime: ticket.salesEndDateTime,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));
    res.json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      message: `${mappedTickets.length} tickets updated successfully`,
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error bulk updating tickets:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update tickets', message: error.message });
  }
});

// Bulk delete multiple tickets (JWT authenticated)
router.post('/tickets/bulk-delete', requiresAuth, async (req, res) => {
  try {
    const { ticketIds } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', message: 'ticketIds array is required and must not be empty' });
    }
    const result = await ticketService.bulkDeleteTickets(ticketIds, userId);
    res.json({
      success: true,
      message: `${result.count} tickets deleted successfully`,
      deletedCount: result.count,
      user: req.user.email || req.user.id
    });
  } catch (error) {
    console.error('Error bulk deleting tickets:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk delete tickets', message: error.message });
  }
});

// Get check-in statistics for an event (JWT authenticated)
router.get('/events/:eventId/checkin/stats', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const stats = await checkinService.getEventCheckinStats(eventId, userId);
    res.json({ ...stats, user: req.user.email || req.user.id });
  } catch (error) {
    console.error('Error getting check-in stats:', error);
    if (error.message.includes('Event not found') || error.message.includes('access denied')) {
      return res.status(404).json({ success: false, error: 'Event not found', message: 'Event not found or you do not have access to it' });
    }
    res.status(500).json({ success: false, error: 'Failed to get check-in statistics', message: error.message });
  }
});

// Generate check-in hash for a ticket (JWT authenticated - for testing)
router.get('/tickets/:ticketId/checkin-hash', requiresAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const hash = await checkinService.generateCheckinHash(ticketId, userId);
    res.json({ success: true, ticketId: parseInt(ticketId), hash, checkinUrl: `${req.protocol}://${req.get('host')}/checkin/${hash}`, user: req.user.email || req.user.id });
  } catch (error) {
    console.error('Error generating check-in hash:', error);
    if (error.message.includes('Ticket not found') || error.message.includes('access denied')) {
      return res.status(404).json({ success: false, error: 'Ticket not found', message: 'Ticket not found or you do not have access to it' });
    }
    res.status(500).json({ success: false, error: 'Failed to generate check-in hash', message: error.message });
  }
});

// Get accessory pickup statistics for an event (JWT authenticated)
router.get('/events/:eventId/accessory-pickup/stats', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const stats = await accessoryPickupService.getEventPickupStats(eventId, userId);
    res.json({ ...stats, user: req.user.email || req.user.id });
  } catch (error) {
    console.error('Error getting accessory pickup stats:', error);
    if (error.message.includes('Event not found') || error.message.includes('access denied')) {
      return res.status(404).json({ success: false, error: 'Event not found', message: 'Event not found or you do not have access to it' });
    }
    res.status(500).json({ success: false, error: 'Failed to get accessory pickup statistics', message: error.message });
  }
});

// Generate accessory pickup hash for a ticket (JWT authenticated - for testing)
router.get('/tickets/:ticketId/accessory-pickup-hash', requiresAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const hash = await accessoryPickupService.generatePickupHash(ticketId, userId);
    res.json({ success: true, ticketId: parseInt(ticketId), hash, pickupUrl: `${req.protocol}://${req.get('host')}/accessory-pickup/${hash}`, user: req.user.email || req.user.id });
  } catch (error) {
    console.error('Error generating accessory pickup hash:', error);
    if (error.message.includes('Ticket not found') || error.message.includes('access denied')) {
      return res.status(404).json({ success: false, error: 'Ticket not found', message: 'Ticket not found or you do not have access to it' });
    }
    res.status(500).json({ success: false, error: 'Failed to generate accessory pickup hash', message: error.message });
  }
});

// Get order confirmation hash by order ID (JWT authenticated)
router.get('/orders/:orderId/confirmation-hash', requiresAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const eventIdRaw = req.query.eventId;
    const eventId = eventIdRaw ? parseInt(eventIdRaw, 10) : null;
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid order ID', message: 'Order ID is required and must be a string' });
    }
    if (eventIdRaw && (Number.isNaN(eventId) || eventId <= 0)) {
      return res.status(400).json({ success: false, error: 'Invalid event ID', message: 'eventId must be a positive integer' });
    }
    const hash = await orderService.getConfirmationHashByOrderId(orderId, userId, eventId);
    res.json({ success: true, hash, orderId });
  } catch (error) {
    console.error('Error fetching confirmation hash:', error);
    if (error.message.includes('Order not found')) {
      return res.status(404).json({ success: false, error: 'Order not found', message: 'No order found with the provided ID or you do not have access to it' });
    }
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, error: 'Access denied', message: 'You do not have permission to access this order' });
    }
    if (error.message.includes('Ambiguous order')) {
      return res.status(400).json({ success: false, error: 'Ambiguous order', message: 'Multiple events found for this orderId; provide eventId to disambiguate' });
    }
    res.status(500).json({ success: false, error: 'Failed to get confirmation hash', message: error.message });
  }
});

module.exports = router;
