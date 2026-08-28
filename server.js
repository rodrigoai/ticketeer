const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const prisma = require('./config/prisma');
const { AUTH0_DOMAIN, AUTH0_AUDIENCE } = require('./config/auth');
const requiresAuth = require('./middleware/requiresAuth');
const createHealthRoutes = require('./routes/healthRoutes');
const createDashboardRoutes = require('./routes/dashboardRoutes');
const createCheckinRoutes = require('./routes/checkinRoutes');
const createWebhookRoutes = require('./routes/webhookRoutes');
const novaMoneyService = require('./services/novaMoneyService');
const { sanitizeEventDescription } = require('./utils/sanitizeEventDescription');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

const SALE_MODES = {
  CHECKOUT: 'checkout',
  SHOPPING_CART: 'shopping_cart'
};

const normalizeSaleMode = (value) => {
  return value === SALE_MODES.SHOPPING_CART ? SALE_MODES.SHOPPING_CART : SALE_MODES.CHECKOUT;
};

const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const validateEventSalesSettings = ({ saleMode, checkoutPageId, checkoutPageTitle, cartPaymentServiceId, reservationExpiresInMinutes }) => {
  if (saleMode === SALE_MODES.CHECKOUT) {
    if ((checkoutPageId && !checkoutPageTitle) || (!checkoutPageId && checkoutPageTitle)) {
      return 'Checkout page ID and title must be provided together';
    }
    return null;
  }

  if (!cartPaymentServiceId) {
    return 'Cart payment service ID is required for shopping cart sales';
  }

  const reservationMinutes = parseInt(reservationExpiresInMinutes, 10);
  if (!Number.isInteger(reservationMinutes) || reservationMinutes < 1 || reservationMinutes > 120) {
    return 'Reservation expiration must be between 1 and 120 minutes';
  }

  return null;
};

// CORS middleware with custom logic for public vs private endpoints
app.use((req, res, next) => {
  const origin = req.get('origin');

  // Check if this is a public API endpoint
  if (req.path.startsWith('/api/public/')) {
    // For public endpoints, allow any origin
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  } else {
    // For private endpoints, use restricted origins
    const allowedOrigins = [
      'http://localhost:5173',  // Vue development server
      'http://localhost:3000',  // Same origin
      'http://127.0.0.1:5173',  // Alternative localhost format
      'http://127.0.0.1:3000',  // Alternative localhost format
      'http://192.168.15.138:5173'  // Network IP access
    ];

    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }

  next();
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Vue.js SPA built files. The HTML entrypoint should always be
// revalidated after deploys, while hashed assets can be cached long-term.
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (path.basename(filePath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }

    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', createHealthRoutes({
  authConfig: {
    domain: AUTH0_DOMAIN,
    audience: AUTH0_AUDIENCE
  },
  requiresAuth
}));
app.use('/api/dashboard', createDashboardRoutes({ prisma, requiresAuth }));
app.use('/api', createCheckinRoutes({ requiresAuth }));
app.use('/api/webhooks', createWebhookRoutes({ prisma }));

// ==========================================
// USER PROFILE - NOVA.MONEY SETTINGS
// ==========================================

// Get Nova.Money settings for current user (JWT authenticated)
app.get('/api/profile/nova-money', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const userProfileService = require('./services/userProfileService');

    const profile = await userProfileService.getProfileByUserId(userId);

    res.json({
      success: true,
      profile: {
        novaMoneyTenant: profile?.nova_money_tenant || '',
        hasNovaMoneyApiKey: Boolean(profile?.nova_money_api_key)
      }
    });
  } catch (error) {
    console.error('Error fetching Nova.Money profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Nova.Money profile',
      message: error.message
    });
  }
});

// Update Nova.Money settings for current user (JWT authenticated)
app.put('/api/profile/nova-money', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const { novaMoneyTenant, novaMoneyApiKey } = req.body;
    const userProfileService = require('./services/userProfileService');

    if (!novaMoneyTenant) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Nova.Money tenant is required'
      });
    }

    const existingProfile = await userProfileService.getProfileByUserId(userId);
    const existingKey = existingProfile?.nova_money_api_key || '';
    const normalizedKey = novaMoneyApiKey ? String(novaMoneyApiKey).trim() : '';
    const resolvedKey = normalizedKey || existingKey;

    if (!resolvedKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Nova.Money API key is required'
      });
    }

    await userProfileService.upsertProfile(userId, {
      nova_money_api_key: resolvedKey,
      nova_money_tenant: String(novaMoneyTenant).trim()
    });

    res.json({
      success: true,
      profile: {
        novaMoneyTenant: String(novaMoneyTenant).trim(),
        hasNovaMoneyApiKey: true
      },
      message: 'Nova.Money settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving Nova.Money profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save Nova.Money profile',
      message: error.message
    });
  }
});

// ==========================================
// NOVA.MONEY API - CHECKOUT PAGES
// ==========================================

// Fetch Nova.Money checkout pages (JWT authenticated)
app.get('/api/nova/checkout-pages', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub;
    const userProfileService = require('./services/userProfileService');

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

// Get events from database (JWT authenticated)
app.get('/api/events', requiresAuth, async (req, res) => {
  try {
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    const eventService = require('./services/eventService');

    // Get events created by the authenticated user
    const events = await eventService.getEvents({
      created_by: userId,
      status: 'active'
    });

    // Map database fields to frontend expectations
    const mappedEvents = events.map(event => ({
      id: event.id,
      publicHash: event.public_hash,
      title: event.name,
      name: event.name,
      description: sanitizeEventDescription(event.description),
      additionalInformation: sanitizeEventDescription(event.additional_information),
      date: event.opening_datetime,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime,
      eventImageUrl: event.event_image_url,
      mobileEventImageUrl: event.mobile_event_image_url,
      eventMapUrl: event.map_image,
      venue: event.venue,
      price: 0, // We'll need to add price to schema or calculate from tickets
      status: event.status,
      saleMode: event.sale_mode,
      checkoutPageId: event.checkout_page_id,
      checkoutPageTitle: event.checkout_page_title,
      cartPaymentServiceId: event.cart_payment_service_id,
      reservationExpiresInMinutes: event.reservation_expires_in_minutes,
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

// Create event in database (JWT authenticated)
app.post('/api/events', requiresAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Event creation request received');
    console.log('📥 Request body:', req.body);
    console.log('👤 Auth data:', req.auth);

    const {
      title,
      description,
      additionalInformation,
      date,
      venue,
      price,
      eventImageUrl,
      mobileEventImageUrl,
      eventMapUrl,
      saleMode: rawSaleMode,
      checkoutPageId,
      checkoutPageTitle,
      cartPaymentServiceId,
      reservationExpiresInMinutes
    } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    const saleMode = normalizeSaleMode(rawSaleMode);

    console.log('🎯 Extracted data:', { title, description, date, venue, price, userId });

    // Validate required fields
    if (!title || !date || !venue) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, date, and venue are required'
      });
    }

    const salesSettingsError = validateEventSalesSettings({
      saleMode,
      checkoutPageId,
      checkoutPageTitle,
      cartPaymentServiceId,
      reservationExpiresInMinutes
    });

    if (salesSettingsError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sales configuration',
        message: salesSettingsError
      });
    }

    console.log('🛠️ Loading event service...');
    const eventService = require('./services/eventService');

    // Create event data for database
    const eventData = {
      name: title,
      description: sanitizeEventDescription(description),
      additional_information: sanitizeEventDescription(additionalInformation),
      event_image_url: eventImageUrl || null,
      mobile_event_image_url: mobileEventImageUrl || null,
      map_image: eventMapUrl || null,
      opening_datetime: date,
      closing_datetime: date, // For now, same as opening. TODO: Add separate closing time
      venue: venue,
      sale_mode: saleMode,
      checkout_page_id: saleMode === SALE_MODES.CHECKOUT ? (checkoutPageId || null) : null,
      checkout_page_title: saleMode === SALE_MODES.CHECKOUT ? (checkoutPageTitle || null) : null,
      cart_payment_service_id: saleMode === SALE_MODES.SHOPPING_CART ? String(cartPaymentServiceId).trim() : null,
      reservation_expires_in_minutes: saleMode === SALE_MODES.SHOPPING_CART
        ? parseInt(reservationExpiresInMinutes, 10)
        : 10,
      created_by: userId
    };

    console.log('📄 Event data for Prisma:', eventData);
    console.log('⚡ Calling eventService.createEvent...');
    const newEvent = await eventService.createEvent(eventData);
    console.log('✅ Event created successfully via service:', newEvent);

    // Map response to frontend format
    const mappedEvent = {
      id: newEvent.id,
      publicHash: newEvent.public_hash,
      title: newEvent.name,
      name: newEvent.name,
      description: newEvent.description,
      additionalInformation: newEvent.additional_information,
      date: newEvent.opening_datetime,
      eventImageUrl: newEvent.event_image_url,
      mobileEventImageUrl: newEvent.mobile_event_image_url,
      eventMapUrl: newEvent.map_image,
      venue: newEvent.venue,
      price: parseFloat(price) || 0,
      saleMode: newEvent.sale_mode,
      checkoutPageId: newEvent.checkout_page_id,
      checkoutPageTitle: newEvent.checkout_page_title,
      cartPaymentServiceId: newEvent.cart_payment_service_id,
      reservationExpiresInMinutes: newEvent.reservation_expires_in_minutes,
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

// Get individual event by ID (JWT authenticated)
app.get('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const eventService = require('./services/eventService');

    const event = await eventService.getEventById(id, userId);

    // Map database fields to frontend expectations
    const mappedEvent = {
      id: event.id,
      publicHash: event.public_hash,
      title: event.name,
      name: event.name,
      description: sanitizeEventDescription(event.description),
      additionalInformation: sanitizeEventDescription(event.additional_information),
      date: event.opening_datetime,
      opening_datetime: event.opening_datetime,
      closing_datetime: event.closing_datetime,
      eventImageUrl: event.event_image_url,
      mobileEventImageUrl: event.mobile_event_image_url,
      eventMapUrl: event.map_image,
      venue: event.venue,
      status: event.status,
      saleMode: event.sale_mode,
      checkoutPageId: event.checkout_page_id,
      checkoutPageTitle: event.checkout_page_title,
      cartPaymentServiceId: event.cart_payment_service_id,
      reservationExpiresInMinutes: event.reservation_expires_in_minutes,
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

// Update event in database (JWT authenticated)
app.put('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      additionalInformation,
      date,
      venue,
      price,
      eventImageUrl,
      mobileEventImageUrl,
      eventMapUrl,
      saleMode: rawSaleMode,
      checkoutPageId,
      checkoutPageTitle,
      cartPaymentServiceId,
      reservationExpiresInMinutes
    } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token
    const saleMode = normalizeSaleMode(rawSaleMode);

    const eventService = require('./services/eventService');

    const salesSettingsError = validateEventSalesSettings({
      saleMode,
      checkoutPageId,
      checkoutPageTitle,
      cartPaymentServiceId,
      reservationExpiresInMinutes
    });

    if (salesSettingsError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sales configuration',
        message: salesSettingsError
      });
    }

    // Update event data
    const eventData = {
      name: title,
      description: sanitizeEventDescription(description),
      additional_information: sanitizeEventDescription(additionalInformation),
      event_image_url: eventImageUrl || null,
      mobile_event_image_url: mobileEventImageUrl || null,
      map_image: eventMapUrl || null,
      opening_datetime: date || undefined,
      closing_datetime: date || undefined, // TODO: Add separate closing time
      venue: venue,
      sale_mode: saleMode,
      checkout_page_id: saleMode === SALE_MODES.CHECKOUT ? (checkoutPageId || null) : null,
      checkout_page_title: saleMode === SALE_MODES.CHECKOUT ? (checkoutPageTitle || null) : null,
      cart_payment_service_id: saleMode === SALE_MODES.SHOPPING_CART ? String(cartPaymentServiceId).trim() : null,
      reservation_expires_in_minutes: saleMode === SALE_MODES.SHOPPING_CART
        ? parseInt(reservationExpiresInMinutes, 10)
        : 10
    };

    const updatedEvent = await eventService.updateEvent(id, eventData, userId);

    // Map response to frontend format
    const mappedEvent = {
      id: updatedEvent.id,
      publicHash: updatedEvent.public_hash,
      title: updatedEvent.name,
      name: updatedEvent.name,
      description: updatedEvent.description,
      additionalInformation: updatedEvent.additional_information,
      date: updatedEvent.opening_datetime,
      eventImageUrl: updatedEvent.event_image_url,
      mobileEventImageUrl: updatedEvent.mobile_event_image_url,
      eventMapUrl: updatedEvent.map_image,
      venue: updatedEvent.venue,
      price: parseFloat(price) || 0,
      saleMode: updatedEvent.sale_mode,
      checkoutPageId: updatedEvent.checkout_page_id,
      checkoutPageTitle: updatedEvent.checkout_page_title,
      cartPaymentServiceId: updatedEvent.cart_payment_service_id,
      reservationExpiresInMinutes: updatedEvent.reservation_expires_in_minutes,
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

// Delete event from database (JWT authenticated)
app.delete('/api/events/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub; // Get user ID from JWT token

    const eventService = require('./services/eventService');

    const deletedEvent = await eventService.deleteEvent(id, userId);

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

// ==========================================
// TICKET API ENDPOINTS
// ==========================================

// Public event landing data (no auth required)
app.get('/api/public/events/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const eventService = require('./services/eventService');
    const userProfileService = require('./services/userProfileService');
    const ticketService = require('./services/ticketService');

    const event = await eventService.getEventByPublicHash(hash);

    if (!event || event.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: 'Event does not exist or is not available'
      });
    }

    const profile = await userProfileService.getProfileByUserId(event.created_by);
    const checkoutUrl = event.sale_mode === SALE_MODES.CHECKOUT
      ? buildNovaCheckoutUrl(profile?.nova_money_tenant, event.checkout_page_id, event.id)
      : null;
    const checkoutBaseUrl = event.sale_mode === SALE_MODES.CHECKOUT
      ? buildNovaCheckoutUrl(profile?.nova_money_tenant, event.checkout_page_id, null)
      : null;
    const landingTickets = await ticketService.getLandingTicketsByEvent(event.id);
    const storedGroups = await prisma.ticketGroup.findMany({
      where: { eventId: event.id, active: true },
      include: {
        pricingTiers: {
          orderBy: [{ position: 'asc' }, { id: 'asc' }]
        }
      }
    });
    const soldCounts = await ticketService.getTicketGroupSoldCounts(event.id);
    const storedGroupMap = new Map(storedGroups.map((group) => [group.groupKey, group]));
    const tickets = landingTickets.map((ticket) => ({
      id: ticket.id,
      eventId: ticket.eventId,
      description: ticket.description,
      identificationNumber: ticket.identificationNumber,
      location: ticket.location,
      table: ticket.table,
      price: parseFloat(ticket.price) || 0,
      order: ticket.order,
      reservedUntil: ticket.reservedUntil,
      salesEndDateTime: ticket.salesEndDateTime,
      isAvailable: ticketService._isTicketAvailable(ticket),
      isReserved: ticketService._isReservationActive(ticket),
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    }));
    const ticketGroupsMap = new Map();

    tickets.forEach((ticket) => {
      const normalizedTable = ticket.table === undefined || ticket.table === null ? null : ticket.table;
      const groupKey = ticket.description || '';

      if (!ticketGroupsMap.has(groupKey)) {
        const storedGroup = storedGroupMap.get(groupKey);
        ticketGroupsMap.set(groupKey, {
          id: storedGroup?.id || null,
          key: groupKey,
          description: ticket.description || 'Ticket',
          salesDescription: storedGroup?.sales_description || '',
          price: ticket.price ?? null,
          activePrice: parseFloat(ticket.price) || 0,
          activePricingTier: null,
          pricingTiers: [],
          totalCount: 0,
          soldCount: soldCounts.get(groupKey) || 0,
          availableCount: 0,
          checkoutUrl: storedGroup?.checkout_url || '',
          productId: storedGroup?.product_id || null,
          color: storedGroup?.color || null,
          active: storedGroup?.active !== false,
          firstOrder: ticket.identificationNumber || 0,
          tables: []
        });
      }

      const group = ticketGroupsMap.get(groupKey);
      group.totalCount += 1;
      if (ticket.isAvailable) {
        group.availableCount += 1;
      }
      if (normalizedTable !== null && !group.tables.includes(normalizedTable)) {
        group.tables.push(normalizedTable);
      }
    });

    const ticketGroups = Array.from(ticketGroupsMap.values())
      .map((group) => {
        const storedGroup = storedGroupMap.get(group.key);
        const resolvedPricing = ticketService.resolveTicketGroupPricing({
          defaultPrice: group.price,
          pricingTiers: storedGroup?.pricingTiers || [],
          soldCount: group.soldCount
        });

        return {
          ...group,
          activePrice: resolvedPricing.activePrice,
          activePricingTier: resolvedPricing.activePricingTier,
          pricingTiers: resolvedPricing.pricingTiers,
          tables: group.tables.sort((a, b) => a - b)
        };
      })
      .sort((a, b) => a.firstOrder - b.firstOrder);

    res.json({
      success: true,
      event: {
        id: event.id,
        publicHash: event.public_hash,
        title: event.name,
        name: event.name,
        description: sanitizeEventDescription(event.description),
        additionalInformation: sanitizeEventDescription(event.additional_information),
        date: event.opening_datetime,
        opening_datetime: event.opening_datetime,
        closing_datetime: event.closing_datetime,
        eventImageUrl: event.event_image_url,
        mobileEventImageUrl: event.mobile_event_image_url,
        eventMapUrl: event.map_image,
        venue: event.venue,
        saleMode: event.sale_mode,
        checkoutPageId: event.checkout_page_id,
        checkoutPageTitle: event.checkout_page_title,
        cartPaymentServiceId: event.cart_payment_service_id,
        reservationExpiresInMinutes: event.reservation_expires_in_minutes,
        created_by: event.created_by
      },
      checkoutUrl,
      checkoutBaseUrl,
      tickets,
      ticketGroups
    });
  } catch (error) {
    console.error('Error fetching public event:', error);
    if (error.message && error.message.includes('Event not found')) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: 'Event does not exist or is not available'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

app.post('/api/public/events/:id/cart-checkout', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { ticketIds, customer } = req.body || {};
    const eventService = require('./services/eventService');
    const userProfileService = require('./services/userProfileService');
    const ticketService = require('./services/ticketService');

    const event = await eventService.getEventById(eventId);
    if (!event || event.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: 'Event does not exist or is not available'
      });
    }

    if (event.sale_mode !== SALE_MODES.SHOPPING_CART) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sales mode',
        message: 'This event does not use the shopping cart flow'
      });
    }

    const name = String(customer?.name || '').trim();
    const email = String(customer?.email || '').trim().toLowerCase();
    const phoneDigits = normalizePhoneDigits(customer?.phone);

    if (!name || name.length < 2 || !isValidEmail(email) || phoneDigits.length !== 11) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer information',
        message: 'Name, email, and a valid Brazilian phone number are required'
      });
    }

    const normalizedTicketIds = Array.from(new Set((ticketIds || []).map((id) => parseInt(id, 10)).filter(Number.isInteger)));
    if (!normalizedTicketIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cart',
        message: 'Select at least one ticket before continuing'
      });
    }

    const profile = await userProfileService.getProfileByUserId(event.created_by);
    const tenant = novaMoneyService.normalizeTenant(profile?.nova_money_tenant || '');
    const apiKey = profile?.nova_money_api_key || '';

    if (!tenant || !apiKey || !event.cart_payment_service_id) {
      return res.status(400).json({
        success: false,
        error: 'Nova.Money integration not configured',
        message: 'The organizer has not configured shopping cart payments correctly'
      });
    }

    const storedGroups = await prisma.ticketGroup.findMany({
      where: { eventId: event.id },
      include: {
        pricingTiers: {
          orderBy: [{ position: 'asc' }, { id: 'asc' }]
        }
      }
    });
    const storedGroupMap = new Map(storedGroups.map((group) => [group.groupKey, group]));

    const reservation = await ticketService.reserveTicketsForCart(
      event.id,
      normalizedTicketIds,
      { name, email, phone: phoneDigits },
      event.reservation_expires_in_minutes
    );

    try {
      const itemsMap = new Map();
      let total = 0;

      const soldCounts = await ticketService.getTicketGroupSoldCounts(event.id);
      const cartGroupOffsets = new Map();

      for (const ticket of reservation.tickets) {
        const groupKey = ticket.description || '';
        const group = storedGroupMap.get(groupKey);
        const productId = group?.product_id;
        const resolvedPricing = ticketService.resolveTicketGroupPricing({
          defaultPrice: ticket.price,
          pricingTiers: group?.pricingTiers || [],
          soldCount: (soldCounts.get(groupKey) || 0) + (cartGroupOffsets.get(groupKey) || 0)
        });
        const activePrice = resolvedPricing.activePrice;
        cartGroupOffsets.set(groupKey, (cartGroupOffsets.get(groupKey) || 0) + 1);

        if (!productId) {
          throw new Error(`Ticket group '${ticket.description}' is missing a product ID`);
        }

        total += activePrice;

        const itemKey = `${productId}:${activePrice}`;
        if (!itemsMap.has(itemKey)) {
          itemsMap.set(itemKey, {
            id: productId,
            name: ticket.description || 'Ingresso',
            quantity: 0,
            value: activePrice
          });
        }

        itemsMap.get(itemKey).quantity += 1;
      }

      const payload = {
        payment_method: 'credit_card',
        total: Number(total.toFixed(2)),
        customer: {
          email,
          phone: phoneDigits,
          name
        },
        items: Array.from(itemsMap.values()),
        meta: {
          userId: event.created_by,
          eventId: event.id,
          ticketIds: reservation.tickets.map((ticket) => ticket.id)
        }
      };

      const novaCart = await novaMoneyService.createCart({
        tenant,
        apiKey,
        cartPaymentServiceId: event.cart_payment_service_id,
        payload
      });

      return res.status(201).json({
        success: true,
        cart: novaCart,
        reservation: {
          key: reservation.reservationKey,
          reservedUntil: reservation.reservedUntil
        }
      });
    } catch (error) {
      await ticketService.releaseTicketReservations({
        eventId: event.id,
        ticketIds: reservation.tickets.map((ticket) => ticket.id),
        reservationKey: reservation.reservationKey
      });
      throw error;
    }
  } catch (error) {
    console.error('Error creating shopping cart checkout:', error);
    res.status(error.status || 500).json({
      success: false,
      error: 'Failed to create shopping cart checkout',
      message: error.message,
      details: error.data
    });
  }
});

// Get all tickets for an event (JWT authenticated)
app.get('/api/events/:eventId/tickets', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const ticketService = require('./services/ticketService');

    const tickets = await ticketService.getTicketsByEvent(eventId, userId);

    // Map tickets to frontend format
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
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
app.get('/api/events/:eventId/tickets/stats', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const ticketService = require('./services/ticketService');

    const stats = await ticketService.getEventTicketStats(eventId, userId);

    // Convert decimal strings to numbers for frontend
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
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

// Get ticket groups for an event (JWT authenticated)
app.get('/api/events/:eventId/groups', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const ticketService = require('./services/ticketService');

    const groups = await ticketService.getTicketGroupsByEvent(eventId, userId);

    res.json({
      success: true,
      groups: groups.map((group) => ({
        id: group.id,
        eventId: group.eventId,
        groupKey: group.groupKey,
        description: group.description,
        salesDescription: group.salesDescription || '',
        checkoutUrl: group.checkoutUrl || '',
        productId: group.productId,
        color: group.color || null,
        active: group.active !== false,
        ticketCount: group.ticketCount,
        soldCount: group.soldCount,
        availableCount: group.availableCount,
        price: parseFloat(group.price) || 0,
        activePrice: parseFloat(group.activePrice) || 0,
        activePricingTier: group.activePricingTier || null,
        pricingTiers: group.pricingTiers || [],
        tables: group.tables || []
      })),
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching ticket groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket groups',
      message: error.message
    });
  }
});

// Update a ticket group checkout URL (JWT authenticated)
app.put('/api/events/:eventId/groups/:groupId', requiresAuth, async (req, res) => {
  try {
    const { eventId, groupId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const { salesDescription, checkoutUrl, productId, color, active, pricingTiers } = req.body;
    const ticketService = require('./services/ticketService');

    const updatedGroup = await ticketService.updateTicketGroup(eventId, groupId, { salesDescription, checkoutUrl, productId, color, active, pricingTiers }, userId);
    const resolvedPricing = ticketService.resolveTicketGroupPricing({
      defaultPrice: 0,
      pricingTiers: updatedGroup.pricingTiers || []
    });

    res.json({
      success: true,
      group: {
        id: updatedGroup.id,
        eventId: updatedGroup.eventId,
        groupKey: updatedGroup.groupKey,
        description: updatedGroup.description,
        salesDescription: updatedGroup.sales_description || '',
        checkoutUrl: updatedGroup.checkout_url || '',
        productId: updatedGroup.product_id || null,
        color: updatedGroup.color || null,
        active: updatedGroup.active !== false,
        activePricingTier: resolvedPricing.activePricingTier || null,
        pricingTiers: resolvedPricing.pricingTiers || []
      },
      message: 'Ticket group updated successfully',
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error updating ticket group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket group',
      message: error.message
    });
  }
});

// Search tickets for an event with filtering and privacy protection (JWT authenticated)
app.get('/api/events/:eventId/tickets/search', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { available } = req.query;
    const userId = req.auth.payload?.sub || req.auth.sub;

    // Validate available parameter if provided
    let availableOnly = false;
    if (available !== undefined) {
      if (available === 'true') {
        availableOnly = true;
      } else if (available === 'false') {
        availableOnly = false;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Available parameter must be "true" or "false"'
        });
      }
    }

    const ticketService = require('./services/ticketService');

    const tickets = await ticketService.searchTicketsByEvent(eventId, userId, availableOnly);

    // Map tickets to frontend format (privacy-protected - no buyer information)
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
      // Note: buyer, buyerDocument, buyerEmail are excluded for privacy
    }));

    res.json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      eventId: parseInt(eventId),
      filter: {
        available: availableOnly
      },
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
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

// Public search tickets endpoint (no authentication required)
app.get('/api/public/tickets/search', async (req, res) => {
  try {
    const { userId, eventId, available } = req.query;

    // Validate required parameters
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'userId parameter is required'
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'eventId parameter is required'
      });
    }

    // Validate eventId is a number
    if (isNaN(parseInt(eventId))) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'eventId must be a valid number'
      });
    }

    // Validate available parameter if provided
    let availableOnly = false;
    if (available !== undefined) {
      if (available === 'true') {
        availableOnly = true;
      } else if (available === 'false') {
        availableOnly = false;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Available parameter must be "true" or "false"'
        });
      }
    }

    const ticketService = require('./services/ticketService');

    const result = await ticketService.searchTicketsPublic(eventId, userId, availableOnly);

    // Map tickets to frontend format (privacy-protected - no buyer information)
    const mappedTickets = result.tickets.map(ticket => ({
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
      accessoryCollected: ticket.accessoryCollected,
      accessoryCollectedAt: ticket.accessoryCollectedAt,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
      // Note: buyer, buyerDocument, buyerEmail are excluded for privacy
    }));

    res.json({
      success: true,
      tickets: mappedTickets,
      count: mappedTickets.length,
      eventId: parseInt(eventId),
      userId: userId,
      filter: {
        available: availableOnly
      }
    });
  } catch (error) {
    console.error('Error in public ticket search:', error);

    // Handle user not found error specifically
    if (error.message.includes('does not exist or has no events')) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: error.message
      });
    }

    // Handle event not found error
    if (error.message.includes('Event not found or does not belong to user')) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to search tickets',
      message: error.message
    });
  }
});

// Create a single ticket for an event (JWT authenticated)
app.post('/api/events/:eventId/tickets', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const {
      description,
      location,
      table,
      price,
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      buyerPhone,
      salesEndDateTime
    } = req.body;

    // Validate required fields
    if (!description || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Description and price are required'
      });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Price must be a positive number'
      });
    }

    const ticketService = require('./services/ticketService');

    const ticketData = {
      description,
      location,
      table: table ? parseInt(table) : undefined,
      price: parseFloat(price),
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      buyerPhone,
      salesEndDateTime
    };

    const newTicket = await ticketService.createTicket(eventId, ticketData, userId);

    // Map response to frontend format
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ticket',
      message: error.message
    });
  }
});

// Create multiple tickets in batch for an event (JWT authenticated)
app.post('/api/events/:eventId/tickets/batch', requiresAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const {
      description,
      location,
      table,
      price,
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      buyerPhone,
      salesEndDateTime,
      quantity
    } = req.body;

    // Validate required fields
    if (!description || price === undefined || price === null || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Description, price, and quantity are required'
      });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Price must be a positive number'
      });
    }

    if (parseInt(quantity) < 1 || parseInt(quantity) > 100) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Quantity must be between 1 and 100'
      });
    }

    const ticketService = require('./services/ticketService');

    const ticketData = {
      description,
      location,
      table: table ? parseInt(table) : undefined,
      price: parseFloat(price),
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      buyerPhone,
      salesEndDateTime
    };

    const newTickets = await ticketService.createTicketsBatch(eventId, ticketData, parseInt(quantity), userId);

    // Map response to frontend format
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error creating tickets batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tickets',
      message: error.message
    });
  }
});

// Get a specific ticket by ID (JWT authenticated)
app.get('/api/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const ticketService = require('./services/ticketService');

    const ticket = await ticketService.getTicketById(id, userId);

    // Map response to frontend format
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket',
      message: error.message
    });
  }
});

// Update a ticket (JWT authenticated)
app.put('/api/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const {
      description,
      location,
      table,
      price,
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      buyerPhone,
      salesEndDateTime,
      checkedIn,
      checkedInAt,
      accessoryCollected,
      accessoryCollectedAt,
      accessoryCollectedNotes
    } = req.body;

    // Validate price if provided
    if (price !== undefined && price !== null && parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Price must be a positive number'
      });
    }

    const ticketService = require('./services/ticketService');

    const ticketData = {
      description,
      location,
      table: table !== undefined ? (table ? parseInt(table) : null) : undefined,
      price: price !== undefined ? parseFloat(price) : undefined,
      order,
      buyer,
      buyerDocument,
      buyerEmail,
      buyerPhone,
      salesEndDateTime,
      checkedIn,
      checkedInAt,
      accessoryCollected,
      accessoryCollectedAt,
      accessoryCollectedNotes
    };

    const updatedTicket = await ticketService.updateTicket(id, ticketData, userId);

    // Map response to frontend format
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket',
      message: error.message
    });
  }
});

// Resend email for a ticket (JWT authenticated)
app.post('/api/tickets/:id/resend-email', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const ticketService = require('./services/ticketService');
    const emailResult = await ticketService.resendTicketEmail(id, userId);

    res.json({
      success: true,
      message: 'Email resent successfully',
      email: emailResult.email,
      ticketId: parseInt(id),
      messageId: emailResult.messageId,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error resending email:', error);

    if (error.message.includes('Ticket not found') ||
      error.message.includes('access denied') ||
      error.message.includes('access was denied')) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
        message: 'Ticket not found or you do not have access to it'
      });
    }

    if (error.message.includes('buyer name and email information')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot resend email',
        message: 'Ticket must have buyer name and email information'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to resend email',
      message: error.message
    });
  }
});

// Get a print-ready ticket using the same template sent in the QR code email.
app.get('/api/tickets/:id/printable', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const ticketService = require('./services/ticketService');
    const emailService = require('./services/emailService');
    const qrCodeService = require('./services/qrCodeService');
    const ticket = await ticketService.getTicketById(id, userId);

    // A ticket is considered sold when checkout has assigned it an order.
    if (!ticket.order) {
      return res.status(400).json({
        success: false,
        error: 'Ticket is not sold',
        message: 'Only sold tickets can be printed'
      });
    }

    const qrCode = await qrCodeService.generateQrCodeDataUrl(ticket, userId);
    const html = emailService.generateQrCodeEmailTemplate({
      eventName: ticket.event.name,
      eventVenue: ticket.event.venue,
      eventDate: ticket.event.opening_datetime,
      ticketNumber: ticket.identificationNumber,
      ticketName: ticket.description,
      ticketTable: ticket.table,
      buyerName: ticket.buyer || 'Participante',
      qrCodeDataUrl: qrCode.dataUrl,
      qrCodeHash: qrCode.hash
    });

    res.json({ success: true, html, ticketId: ticket.id });
  } catch (error) {
    console.error('Error generating printable ticket:', error);

    if (error.message.includes('Ticket not found') || error.message.includes('Access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
        message: 'Ticket not found or you do not have access to it'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate printable ticket',
      message: error.message
    });
  }
});

// Resend buyer confirmation email for a ticket order (JWT authenticated)
app.post('/api/tickets/:id/resend-confirmation-email', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const ticketService = require('./services/ticketService');
    const emailResult = await ticketService.resendOrderConfirmationEmailForTicket(id, userId);

    res.json({
      success: true,
      message: 'Confirmation email resent successfully',
      email: emailResult.email,
      ticketId: parseInt(id),
      orderId: emailResult.orderId,
      messageId: emailResult.messageId,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error resending confirmation email:', error);

    if (error.message.includes('Ticket not found') ||
      error.message.includes('access denied') ||
      error.message.includes('access was denied')) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
        message: 'Ticket not found or you do not have access to it'
      });
    }

    if (error.message.includes('buyer email information') ||
      error.message.includes('does not belong to an order') ||
      error.message.includes('already been confirmed')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot resend confirmation email',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to resend confirmation email',
      message: error.message
    });
  }
});

// Resend emails for selected tickets (JWT authenticated)
app.post('/api/tickets/bulk-resend-email', requiresAuth, async (req, res) => {
  try {
    const { ticketIds } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'ticketIds array is required and must not be empty'
      });
    }

    const ticketService = require('./services/ticketService');
    const result = await ticketService.resendTicketEmails(ticketIds, userId);

    res.json({
      success: true,
      message: `${result.totalSent} ticket email(s) sent successfully`,
      ...result,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error bulk resending ticket emails:', error);

    if (error.message.includes('not found') || error.message.includes('access was denied')) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
        message: 'One or more tickets were not found or you do not have access to them'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to resend ticket emails',
      message: error.message
    });
  }
});

// Delete a single ticket (JWT authenticated)
app.delete('/api/tickets/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;

    const ticketService = require('./services/ticketService');

    const deletedTicket = await ticketService.deleteTicket(id, userId);

    res.json({
      success: true,
      message: 'Ticket deleted successfully',
      deletedTicket: { id: parseInt(id) },
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ticket',
      message: error.message
    });
  }
});

// Delete multiple tickets (JWT authenticated)
app.delete('/api/tickets/batch', requiresAuth, async (req, res) => {
  try {
    const { ticketIds } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'ticketIds array is required and must not be empty'
      });
    }

    const ticketService = require('./services/ticketService');

    const result = await ticketService.deleteTickets(ticketIds, userId);

    res.json({
      success: true,
      message: `${result.count} tickets deleted successfully`,
      deletedCount: result.count,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error deleting tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tickets',
      message: error.message
    });
  }
});

// Bulk update multiple tickets (JWT authenticated)
app.post('/api/tickets/bulk-edit', requiresAuth, async (req, res) => {
  try {
    const { ticketIds, updates } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'ticketIds array is required and must not be empty'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'updates object is required'
      });
    }

    const ticketService = require('./services/ticketService');

    const updatedTickets = await ticketService.bulkUpdateTickets(ticketIds, updates, userId);

    // Map response to frontend format
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
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error bulk updating tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update tickets',
      message: error.message
    });
  }
});

// Bulk delete multiple tickets (JWT authenticated)
app.post('/api/tickets/bulk-delete', requiresAuth, async (req, res) => {
  try {
    const { ticketIds } = req.body;
    const userId = req.auth.payload?.sub || req.auth.sub;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'ticketIds array is required and must not be empty'
      });
    }

    const ticketService = require('./services/ticketService');

    const result = await ticketService.bulkDeleteTickets(ticketIds, userId);

    res.json({
      success: true,
      message: `${result.count} tickets deleted successfully`,
      deletedCount: result.count,
      user: req.auth.payload?.email || req.auth.payload?.sub || req.auth.email || req.auth.sub
    });
  } catch (error) {
    console.error('Error bulk deleting tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete tickets',
      message: error.message
    });
  }
});

// ==========================================
// BUYER CONFIRMATION PUBLIC API ENDPOINTS
// ==========================================

// Get order details by hash for buyer confirmation (public endpoint)
app.get('/api/public/orders/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    const orderService = require('./services/orderService');
    const orderDetails = await orderService.getOrderByHash(hash);

    res.json({
      success: true,
      order: orderDetails
    });
  } catch (error) {
    console.error('Error fetching order by hash:', error);

    if (error.message.includes('Invalid hash format')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hash format',
        message: 'The provided hash is not valid'
      });
    }

    if (error.message.includes('Order not found')) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found for the provided hash'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
      message: error.message
    });
  }
});

// Get order confirmation hash by order ID (JWT authenticated)
app.get('/api/orders/:orderId/confirmation-hash', requiresAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.auth.payload?.sub || req.auth.sub;
    const eventIdRaw = req.query.eventId;
    const eventId = eventIdRaw ? parseInt(eventIdRaw, 10) : null;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
        message: 'Order ID is required and must be a string'
      });
    }
    if (eventIdRaw && (Number.isNaN(eventId) || eventId <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
        message: 'eventId must be a positive integer'
      });
    }

    const orderService = require('./services/orderService');
    const hash = await orderService.getConfirmationHashByOrderId(orderId, userId, eventId);

    res.json({
      success: true,
      hash: hash,
      orderId: orderId
    });
  } catch (error) {
    console.error('Error fetching confirmation hash:', error);

    if (error.message.includes('Order not found')) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found with the provided ID or you do not have access to it'
      });
    }

    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this order'
      });
    }
    if (error.message.includes('Ambiguous order')) {
      return res.status(400).json({
        success: false,
        error: 'Ambiguous order',
        message: 'Multiple events found for this orderId; provide eventId to disambiguate'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get confirmation hash',
      message: error.message
    });
  }
});

// Save buyer information for order tickets (public endpoint)
app.post('/api/public/orders/:hash/buyers', async (req, res) => {
  try {
    const { hash } = req.params;
    const { buyers } = req.body;

    if (!buyers || !Array.isArray(buyers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Buyers data must be provided as an array'
      });
    }

    const orderService = require('./services/orderService');
    const result = await orderService.saveBuyersForOrder(hash, buyers);

    res.json({
      success: true,
      message: result.message,
      orderId: result.orderId,
      updatedTickets: result.updatedTickets
    });
  } catch (error) {
    console.error('Error saving buyers for order:', error);

    if (error.message.includes('Invalid hash format')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hash format',
        message: 'The provided hash is not valid'
      });
    }

    if (error.message.includes('Order not found')) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'No order found for the provided hash'
      });
    }

    if (error.message.includes('already been completed')) {
      return res.status(409).json({
        success: false,
        error: 'Order already completed',
        message: 'This order has already been completed and cannot be modified'
      });
    }

    if (error.message.includes('All fields are required') ||
      error.message.includes('Invalid') ||
      error.message.includes('already used')) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save buyers',
      message: error.message
    });
  }
});


// Confirmation routes are handled by Vue SPA router
// No server-side route needed - Vue will handle /confirmation/:hash

// SPA catch-all route - serve index.html for client-side routing
app.get('*', (req, res, next) => {
  // Don't serve SPA for API routes that return 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API route not found',
      message: 'The requested API endpoint does not exist'
    });
  }

  // Missing static assets should stay missing. Returning index.html for an old
  // hashed JS/CSS asset causes browsers to reject it with a strict MIME error.
  if (path.extname(req.path)) {
    return res.status(404).type('text/plain').send('Static asset not found');
  }

  res.setHeader('Cache-Control', 'no-cache');

  // Serve the Vue SPA index.html for all routes (including /confirmation/:hash)
  // Vue Router will handle client-side routing
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// Start the server only when this file is run directly.
// Tests import the Express app without binding a network port.
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎫 Ticketeer SPA server is running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Vue.js SPA: http://localhost:${PORT}`);
    console.log(`🔐 Auth0 SPA authentication enabled`);
    console.log(`   Domain: ${AUTH0_DOMAIN}`);
    console.log(`   Audience: ${AUTH0_AUDIENCE}`);
  });
}

module.exports = app;
