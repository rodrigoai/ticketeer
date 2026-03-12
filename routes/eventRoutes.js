const express = require('express');
const router = express.Router();
const { requiresAuth } = require('../middleware/auth');
const eventService = require('../services/eventService');
const userProfileService = require('../services/userProfileService');
const fetch = require('node-fetch');

const normalizeNovaTenant = (tenant) => {
  if (!tenant) return '';
  let cleaned = tenant.trim();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/\/.*$/, '');
  cleaned = cleaned.replace(/\.?pay\.nova\.money$/i, '');
  cleaned = cleaned.replace(/\.$/, '');
  return cleaned;
};

router.get('/', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const events = await eventService.getEvents({
      created_by: userId,
      status: 'active'
    });

    const mappedEvents = events.map(event => ({
      id: event.id,
      title: event.name,
      name: event.name,
      description: event.description,
      date: event.opening_datetime,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime,
      eventImageUrl: event.event_image_url,
      venue: event.venue,
      price: 0,
      status: event.status,
      checkoutPageId: event.checkout_page_id,
      checkoutPageTitle: event.checkout_page_title,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));

    res.json({
      success: true,
      events: mappedEvents,
      count: mappedEvents.length,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

router.post('/', requiresAuth, async (req, res) => {
  try {
    const { title, description, date, venue, price, eventImageUrl, checkoutPageId, checkoutPageTitle } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;

    if (!title || !date || !venue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, date, and venue are required'
      });
    }

    if ((checkoutPageId && !checkoutPageTitle) || (!checkoutPageId && checkoutPageTitle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkout page selection',
        message: 'Checkout page ID and title must be provided together'
      });
    }

    const eventData = {
      name: title,
      description: description || '',
      event_image_url: eventImageUrl || null,
      opening_datetime: new Date(date),
      closing_datetime: new Date(date),
      venue: venue,
      checkout_page_id: checkoutPageId || null,
      checkout_page_title: checkoutPageTitle || null,
      created_by: userId
    };

    const newEvent = await eventService.createEvent(eventData);

    const mappedEvent = {
      id: newEvent.id,
      title: newEvent.name,
      name: newEvent.name,
      description: newEvent.description,
      date: newEvent.opening_datetime,
      eventImageUrl: newEvent.event_image_url,
      venue: newEvent.venue,
      price: parseFloat(price) || 0,
      checkoutPageId: newEvent.checkout_page_id,
      checkoutPageTitle: newEvent.checkout_page_title,
      created_by: newEvent.created_by
    };

    res.status(201).json({
      success: true,
      event: mappedEvent,
      message: 'Event created successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

router.get('/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const event = await eventService.getEventById(id, userId);

    const mappedEvent = {
      id: event.id,
      title: event.name,
      name: event.name,
      description: event.description,
      date: event.opening_datetime,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime,
      eventImageUrl: event.event_image_url,
      venue: event.venue,
      status: event.status,
      checkoutPageId: event.checkout_page_id,
      checkoutPageTitle: event.checkout_page_title,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at
    };

    res.json({
      success: true,
      event: mappedEvent,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

router.put('/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, venue, price, eventImageUrl, checkoutPageId, checkoutPageTitle } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;

    if ((checkoutPageId && !checkoutPageTitle) || (!checkoutPageId && checkoutPageTitle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkout page selection',
        message: 'Checkout page ID and title must be provided together'
      });
    }

    const eventData = {
      name: title,
      description: description || '',
      event_image_url: eventImageUrl || null,
      opening_datetime: date ? new Date(date) : undefined,
      closing_datetime: date ? new Date(date) : undefined,
      venue: venue,
      checkout_page_id: checkoutPageId || null,
      checkout_page_title: checkoutPageTitle || null
    };

    const updatedEvent = await eventService.updateEvent(id, eventData, userId);

    const mappedEvent = {
      id: updatedEvent.id,
      title: updatedEvent.name,
      name: updatedEvent.name,
      description: updatedEvent.description,
      date: updatedEvent.opening_datetime,
      eventImageUrl: updatedEvent.event_image_url,
      venue: updatedEvent.venue,
      price: parseFloat(price) || 0,
      checkoutPageId: updatedEvent.checkout_page_id,
      checkoutPageTitle: updatedEvent.checkout_page_title,
      created_by: updatedEvent.created_by
    };

    res.json({
      success: true,
      event: mappedEvent,
      message: 'Event updated successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message
    });
  }
});

router.delete('/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    await eventService.deleteEvent(id, userId);

    res.json({
      success: true,
      message: 'Event deleted successfully',
      deletedEvent: { id: parseInt(id) },
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

router.get('/nova/checkout-pages', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const profile = await userProfileService.getProfileByUserId(userId);
    const tenant = normalizeNovaTenant(profile?.nova_money_tenant || '');
    const apiKey = profile?.nova_money_api_key || '';

    if (!tenant || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Nova.Money integration not configured',
        message: 'Please configure your Nova.Money tenant and API key in your profile first'
      });
    }

    const url = `https://${tenant}.pay.nova.money/api/v1/checkout_pages`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Api-Key': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'Failed to fetch checkout pages',
        message: data?.message || data?.error || 'Nova.Money API request failed',
        details: data
      });
    }

    const pages = Array.isArray(data)
      ? data
      : (data?.data || data?.checkout_pages || data?.items || []);

    res.json({
      success: true,
      pages
    });
  } catch (error) {
    console.error('Error fetching Nova.Money checkout pages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch checkout pages',
      message: error.message
    });
  }
});

module.exports = router;
