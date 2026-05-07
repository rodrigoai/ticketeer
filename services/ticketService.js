const prisma = require('../config/prisma');
const { Decimal } = require('decimal.js');
const { v4: uuidv4 } = require('uuid');
const qrCodeHashUtil = require('../utils/qrCodeHash');

class TicketService {
  _buildGroupKey(description, table) {
    const normalizedDescription = description || '';
    return normalizedDescription;
  }

  async _ensureTicketGroup(tx, eventId, description, table) {
    const groupKey = this._buildGroupKey(description, table);

    return tx.ticketGroup.upsert({
      where: {
        eventId_groupKey: {
          eventId: parseInt(eventId),
          groupKey
        }
      },
      update: {
        description,
        table: null
      },
      create: {
        eventId: parseInt(eventId),
        groupKey,
        description,
        table: null
      }
    });
  }

  _generateQrCodeHashForTicket(ticket, userId) {
    return qrCodeHashUtil.generateQrCodeHash(userId, ticket.eventId, ticket.id);
  }

  _generateStoredQrCodeHash() {
    return qrCodeHashUtil.generateStoredQrCodeHash();
  }

  _isTicketSold(ticket) {
    return Boolean(ticket?.order && String(ticket.order).trim() !== '');
  }

  _isReservationActive(ticket, referenceDate = new Date()) {
    if (!ticket?.reservedUntil) return false;
    return new Date(ticket.reservedUntil).getTime() > referenceDate.getTime() && !this._isTicketSold(ticket);
  }

  _isTicketAvailable(ticket, referenceDate = new Date()) {
    const salesEndDateTime = ticket?.salesEndDateTime ? new Date(ticket.salesEndDateTime) : null;
    const salesStillOpen = !salesEndDateTime || salesEndDateTime.getTime() > referenceDate.getTime();
    return salesStillOpen && !this._isTicketSold(ticket) && !this._isReservationActive(ticket, referenceDate);
  }

  _buildAvailableTicketWhereClause(referenceDate = new Date()) {
    return {
      AND: [
        {
          OR: [
            { order: null },
            { order: '' }
          ]
        },
        {
          OR: [
            { salesEndDateTime: null },
            { salesEndDateTime: { gt: referenceDate } }
          ]
        },
        {
          OR: [
            { reservedUntil: null },
            { reservedUntil: { lte: referenceDate } }
          ]
        }
      ]
    };
  }

  _buildReservationUpdateData(reservationKey, reservedUntil) {
    return {
      reservationKey,
      reservedAt: new Date(),
      reservedUntil
    };
  }

  _clearReservationData() {
    return {
      reservationKey: null,
      reservedAt: null,
      reservedUntil: null
    };
  }

  _serializePricingTier(pricingTier) {
    if (!pricingTier) return null;

    return {
      id: pricingTier.id || null,
      name: pricingTier.name,
      startDateTime: pricingTier.start_at instanceof Date ? pricingTier.start_at.toISOString() : new Date(pricingTier.start_at).toISOString(),
      endDateTime: pricingTier.end_at instanceof Date ? pricingTier.end_at.toISOString() : new Date(pricingTier.end_at).toISOString(),
      price: parseFloat(pricingTier.price)
    };
  }

  _normalizePricingTiers(pricingTiers = []) {
    if (!Array.isArray(pricingTiers)) {
      throw new Error('Pricing tiers must be an array');
    }

    const normalizedTiers = pricingTiers.map((tier, index) => {
      const name = String(tier?.name || '').trim();
      const startAt = tier?.startDateTime ? new Date(tier.startDateTime) : null;
      const endAt = tier?.endDateTime ? new Date(tier.endDateTime) : null;
      const hasValidDates = startAt instanceof Date && !Number.isNaN(startAt.getTime()) && endAt instanceof Date && !Number.isNaN(endAt.getTime());

      if (!name) {
        throw new Error(`Pricing tier #${index + 1} must have a name`);
      }

      if (!hasValidDates) {
        throw new Error(`Pricing tier '${name}' must have valid start and end datetimes`);
      }

      if (startAt.getTime() >= endAt.getTime()) {
        throw new Error(`Pricing tier '${name}' must end after it starts`);
      }

      const priceDecimal = new Decimal(tier?.price);
      if (priceDecimal.lt(0)) {
        throw new Error(`Pricing tier '${name}' must have a positive price`);
      }

      return {
        name,
        startAt,
        endAt,
        priceDecimal
      };
    });

    normalizedTiers.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    for (let index = 1; index < normalizedTiers.length; index += 1) {
      const previousTier = normalizedTiers[index - 1];
      const currentTier = normalizedTiers[index];

      if (currentTier.startAt.getTime() < previousTier.endAt.getTime()) {
        throw new Error(`Pricing tiers '${previousTier.name}' and '${currentTier.name}' cannot overlap`);
      }
    }

    return normalizedTiers;
  }

  resolveTicketGroupPricing({ defaultPrice, pricingTiers = [], referenceDate = new Date() }) {
    const parsedDefaultPrice = parseFloat(defaultPrice) || 0;
    const activeTier = (pricingTiers || []).find((tier) => {
      const startAt = tier.start_at instanceof Date ? tier.start_at : new Date(tier.start_at);
      const endAt = tier.end_at instanceof Date ? tier.end_at : new Date(tier.end_at);

      return startAt.getTime() <= referenceDate.getTime() && referenceDate.getTime() < endAt.getTime();
    }) || null;

    const resolvedPrice = activeTier ? parseFloat(activeTier.price) || 0 : parsedDefaultPrice;

    return {
      defaultPrice: parsedDefaultPrice,
      activePrice: resolvedPrice,
      activePricingTier: this._serializePricingTier(activeTier),
      pricingTiers: (pricingTiers || []).map((tier) => this._serializePricingTier(tier))
    };
  }

  async _sendPostCheckoutEmails({
    customer,
    userId,
    ticketsToUpdate,
    updateResult,
    tableNumber,
    orderId
  }) {
    const isSingleTicket = ticketsToUpdate.length === 1 && !tableNumber;
    let emailSent = false;
    let qrEmailSent = false;
    let confirmationUrl = null;

    if (customer && customer.email) {
      const emailService = require('./emailService');

      if (isSingleTicket && updateResult.buyerInfo) {
        console.log('🎫 Single ticket purchase detected - sending QR code email directly');

        try {
          const ticketWithBuyerInfo = updateResult.updatedTickets[0];
          await emailService.sendTicketQrCodeEmail(
            updateResult.buyerInfo.buyerEmail,
            {
              id: ticketWithBuyerInfo.id,
              eventId: ticketsToUpdate[0].eventId,
              identificationNumber: ticketWithBuyerInfo.identificationNumber,
              buyer: ticketWithBuyerInfo.buyer,
              buyerEmail: ticketWithBuyerInfo.buyerEmail
            },
            {
              name: ticketsToUpdate[0].event.name,
              venue: ticketsToUpdate[0].event.venue,
              date: ticketsToUpdate[0].event.opening_datetime
            },
            userId
          );

          qrEmailSent = true;
          console.log(`QR code email sent to ${updateResult.buyerInfo.buyerEmail} for single ticket purchase`);
        } catch (emailError) {
          console.error('Failed to send QR code email for single ticket:', emailError);
        }
      } else {
        console.log(`🎟️ Multiple tickets/table purchase detected (${ticketsToUpdate.length} tickets, table: ${tableNumber}) - sending confirmation email`);

        try {
          const orderService = require('./orderService');
          confirmationUrl = orderService.generateConfirmationUrl(
            orderId.toString(),
            ticketsToUpdate[0].eventId
          );

          await emailService.sendConfirmationEmail(customer.email, {
            eventName: ticketsToUpdate[0].event.name,
            confirmationUrl,
            orderId: orderId.toString(),
            totalTickets: ticketsToUpdate.length
          });
          emailSent = true;
          console.log(`Confirmation email sent to ${customer.email} for multi-ticket/table purchase`);
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }
    }

    return {
      isSingleTicket,
      emailSent,
      qrEmailSent,
      confirmationUrl
    };
  }

  /**
   * Create a single ticket with atomic identification number assignment
   */
  async createTicket(eventId, ticketData, userId) {
    try {
      const {
        description,
        location,
        table,
        price,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        salesEndDateTime
      } = ticketData;

      // Validate required fields
      if (!description || price === undefined || price === null) {
        throw new Error('Description and price are required');
      }

      // Validate price is a positive number
      const priceDecimal = new Decimal(price);
      if (priceDecimal.lt(0)) {
        throw new Error('Price must be a positive number');
      }

      // Verify event exists and user owns it
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      // Use transaction to atomically assign identification number
      const ticket = await prisma.$transaction(async (tx) => {
        await this._ensureTicketGroup(tx, eventId, description, table);

        // Increment the counter and get the new value
        const updatedEvent = await tx.event.update({
          where: { id: parseInt(eventId) },
          data: {
            nextTicketNumber: { increment: 1 }
          },
          select: { nextTicketNumber: true }
        });

        const identificationNumber = updatedEvent.nextTicketNumber - 1;

        return await tx.ticket.create({
          data: {
            eventId: parseInt(eventId),
            description,
            identificationNumber,
            location: location || null,
            table: table ? parseInt(table) : null,
            price: priceDecimal.toString(),
            order: order || null,
            buyer: buyer || null,
            buyerDocument: buyerDocument || null,
            buyerEmail: buyerEmail || null,
            salesEndDateTime: salesEndDateTime ? new Date(salesEndDateTime) : null,
            qrCodeHash: this._generateStoredQrCodeHash()
          }
        });
      });

      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  /**
   * Create multiple tickets in batch with sequential identification numbers
   */
  async createTicketsBatch(eventId, ticketData, quantity, userId) {
    try {
      if (!quantity || quantity < 1 || quantity > 100) {
        throw new Error('Quantity must be between 1 and 100');
      }

      const {
        description,
        location,
        table,
        price,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        salesEndDateTime
      } = ticketData;

      // Validate required fields
      if (!description || price === undefined || price === null) {
        throw new Error('Description and price are required');
      }

      const priceDecimal = new Decimal(price);
      if (priceDecimal.lt(0)) {
        throw new Error('Price must be a positive number');
      }

      // Verify event exists and user owns it
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      // Use transaction to atomically assign sequential identification numbers
      const tickets = await prisma.$transaction(async (tx) => {
        await this._ensureTicketGroup(tx, eventId, description, table);

        // Increment the counter by quantity and get the new value
        const updatedEvent = await tx.event.update({
          where: { id: parseInt(eventId) },
          data: {
            nextTicketNumber: { increment: quantity }
          },
          select: { nextTicketNumber: true }
        });

        const startingNumber = updatedEvent.nextTicketNumber - quantity;

        // Create all tickets with sequential numbers
        const ticketsToCreate = [];
        for (let i = 0; i < quantity; i++) {
          ticketsToCreate.push({
            eventId: parseInt(eventId),
            description,
            identificationNumber: startingNumber + i,
            location: location || null,
            table: table ? parseInt(table) : null,
            price: priceDecimal.toString(),
            order: order || null,
            buyer: buyer || null,
            buyerDocument: buyerDocument || null,
            buyerEmail: buyerEmail || null,
            salesEndDateTime: salesEndDateTime ? new Date(salesEndDateTime) : null,
            qrCodeHash: this._generateStoredQrCodeHash()
          });
        }

        // Insert all tickets with QR hashes already present. This avoids an
        // extra update per ticket and keeps large batch transactions short.
        const createdTickets = [];
        for (const ticketData of ticketsToCreate) {
          const createdTicket = await tx.ticket.create({ data: ticketData });
          createdTickets.push(createdTicket);
        }

        return createdTickets;
      });

      return tickets;
    } catch (error) {
      console.error('Error creating tickets batch:', error);
      throw new Error(`Failed to create tickets: ${error.message}`);
    }
  }

  /**
   * Get all tickets for an event
   */
  async getTicketsByEvent(eventId, userId) {
    try {
      // Verify event exists and user owns it
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const tickets = await prisma.ticket.findMany({
        where: { eventId: parseInt(eventId) },
        orderBy: { identificationNumber: 'asc' }
      });

      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicketById(ticketId, userId) {
    try {
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: parseInt(ticketId)
        },
        include: {
          event: {
            select: { created_by: true }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Check if user owns the event
      if (ticket.event.created_by !== userId) {
        throw new Error('Access denied');
      }

      return ticket;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }
  }

  /**
   * Update a ticket (cannot change identification number)
   */
  async updateTicket(ticketId, ticketData, userId) {
    try {
      const {
        description,
        location,
        table,
        price,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        salesEndDateTime,
        checkedIn,
        checkedInAt,
        accessoryCollected,
        accessoryCollectedAt,
        accessoryCollectedNotes
      } = ticketData;

      // Get existing ticket and verify ownership
      const existingTicket = await this.getTicketById(ticketId, userId);

      // Validate price if provided
      let priceDecimal;
      if (price !== undefined && price !== null) {
        priceDecimal = new Decimal(price);
        if (priceDecimal.lt(0)) {
          throw new Error('Price must be a positive number');
        }
      }

      const updateData = {};
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location || null;
      if (table !== undefined) updateData.table = table ? parseInt(table) : null;
      if (price !== undefined) updateData.price = priceDecimal.toString();
      if (order !== undefined) updateData.order = order || null;
      if (buyer !== undefined) updateData.buyer = buyer || null;
      if (buyerDocument !== undefined) updateData.buyerDocument = buyerDocument || null;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail || null;
      if (salesEndDateTime !== undefined) updateData.salesEndDateTime = salesEndDateTime ? new Date(salesEndDateTime) : null;
      if (checkedIn !== undefined) updateData.checkedIn = Boolean(checkedIn);
      if (checkedInAt !== undefined) updateData.checkedInAt = checkedInAt ? new Date(checkedInAt) : null;
      if (accessoryCollected !== undefined) updateData.accessoryCollected = Boolean(accessoryCollected);
      if (accessoryCollectedAt !== undefined) updateData.accessoryCollectedAt = accessoryCollectedAt ? new Date(accessoryCollectedAt) : null;
      if (accessoryCollectedNotes !== undefined) updateData.accessoryCollectedNotes = accessoryCollectedNotes || null;

      const updatedTicket = await prisma.$transaction(async (tx) => {
        const nextDescription = description !== undefined ? description : existingTicket.description;
        const nextTable = table !== undefined ? (table ? parseInt(table) : null) : existingTicket.table;

        await this._ensureTicketGroup(tx, existingTicket.eventId, nextDescription, nextTable);

        return tx.ticket.update({
          where: { id: parseInt(ticketId) },
          data: updateData
        });
      });

      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId, userId) {
    try {
      // Verify ownership
      await this.getTicketById(ticketId, userId);

      const deletedTicket = await prisma.ticket.delete({
        where: { id: parseInt(ticketId) }
      });

      return deletedTicket;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  /**
   * Delete multiple tickets
   */
  async deleteTickets(ticketIds, userId) {
    try {
      if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        throw new Error('Ticket IDs array is required');
      }

      // Verify ownership of all tickets
      for (const ticketId of ticketIds) {
        await this.getTicketById(ticketId, userId);
      }

      const deletedTickets = await prisma.ticket.deleteMany({
        where: {
          id: {
            in: ticketIds.map(id => parseInt(id))
          }
        }
      });

      return deletedTickets;
    } catch (error) {
      console.error('Error deleting tickets:', error);
      throw new Error(`Failed to delete tickets: ${error.message}`);
    }
  }

  /**
   * Bulk update multiple tickets (only updates provided fields)
   */
  async bulkUpdateTickets(ticketIds, updateData, userId) {
    try {
      if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        throw new Error('Ticket IDs array is required');
      }

      // Verify ownership of all tickets
      for (const ticketId of ticketIds) {
        await this.getTicketById(ticketId, userId);
      }

      const {
        location,
        table,
        order,
        buyer,
        buyerDocument,
        buyerEmail,
        checkedIn,
        checkedInAt,
        accessoryCollected,
        accessoryCollectedAt,
        accessoryCollectedNotes
      } = updateData;

      // Build update object with only provided fields
      const updates = {};
      if (location !== undefined) updates.location = location || null;
      if (table !== undefined) updates.table = table ? parseInt(table) : null;
      if (order !== undefined) updates.order = order || null;
      if (buyer !== undefined) updates.buyer = buyer || null;
      if (buyerDocument !== undefined) updates.buyerDocument = buyerDocument || null;
      if (buyerEmail !== undefined) updates.buyerEmail = buyerEmail || null;
      if (checkedIn !== undefined) updates.checkedIn = Boolean(checkedIn);
      if (checkedInAt !== undefined) updates.checkedInAt = checkedInAt ? new Date(checkedInAt) : null;
      if (accessoryCollected !== undefined) updates.accessoryCollected = Boolean(accessoryCollected);
      if (accessoryCollectedAt !== undefined) updates.accessoryCollectedAt = accessoryCollectedAt ? new Date(accessoryCollectedAt) : null;
      if (accessoryCollectedNotes !== undefined) updates.accessoryCollectedNotes = accessoryCollectedNotes || null;

      // If no fields to update, return early
      if (Object.keys(updates).length === 0) {
        throw new Error('No fields provided for update');
      }

      // Update all tickets in a transaction
      const updatedTickets = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const ticketId of ticketIds) {
          const updated = await tx.ticket.update({
            where: { id: parseInt(ticketId) },
            data: updates
          });
          results.push(updated);
        }
        return results;
      });

      return updatedTickets;
    } catch (error) {
      console.error('Error bulk updating tickets:', error);
      throw new Error(`Failed to bulk update tickets: ${error.message}`);
    }
  }

  /**
   * Bulk delete multiple tickets (transaction-safe)
   */
  async bulkDeleteTickets(ticketIds, userId) {
    try {
      if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        throw new Error('Ticket IDs array is required');
      }

      const normalizedTicketIds = Array.from(
        new Set(ticketIds.map((id) => parseInt(id, 10)).filter(Number.isInteger))
      );

      if (normalizedTicketIds.length === 0) {
        throw new Error('Ticket IDs array is required');
      }

      await prisma.$transaction(async (tx) => {
        const ownedTickets = await tx.ticket.findMany({
          where: {
            id: { in: normalizedTicketIds },
            event: {
              created_by: userId
            }
          },
          select: {
            id: true
          }
        });

        if (ownedTickets.length !== normalizedTicketIds.length) {
          const ownedTicketIdSet = new Set(ownedTickets.map((ticket) => ticket.id));
          const invalidTicketIds = normalizedTicketIds.filter((id) => !ownedTicketIdSet.has(id));
          throw new Error(`Some tickets were not found or access was denied: ${invalidTicketIds.join(', ')}`);
        }

        await tx.ticket.deleteMany({
          where: {
            id: {
              in: normalizedTicketIds
            }
          }
        });
      });

      return { count: normalizedTicketIds.length };
    } catch (error) {
      console.error('Error bulk deleting tickets:', error);
      throw new Error(`Failed to bulk delete tickets: ${error.message}`);
    }
  }

  /**
   * Get ticket statistics for an event
   */
  async getEventTicketStats(eventId, userId) {
    try {
      // Verify event exists and user owns it
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const stats = await prisma.ticket.aggregate({
        where: { eventId: parseInt(eventId) },
        _count: { id: true },
        _sum: { price: true },
        _avg: { price: true },
        _min: { price: true },
        _max: { price: true }
      });

      // Count tickets that are checked in
      const checkedInCount = await prisma.ticket.count({
        where: {
          eventId: parseInt(eventId),
          checkedIn: true
        }
      });

      // Count tickets that are sold (have order field filled)
      const soldCount = await prisma.ticket.count({
        where: {
          eventId: parseInt(eventId),
          AND: [
            { order: { not: null } },
            { order: { not: '' } }
          ]
        }
      });

      // Count tickets with complete buyer information
      const confirmedCount = await prisma.ticket.count({
        where: {
          eventId: parseInt(eventId),
          AND: [
            { buyer: { not: null } },
            { buyer: { not: '' } },
            { buyerDocument: { not: null } },
            { buyerDocument: { not: '' } },
            { buyerEmail: { not: null } },
            { buyerEmail: { not: '' } }
          ]
        }
      });

      // Count tickets that are remaining (not sold yet - no order field)
      const remainingCount = await prisma.ticket.count({
        where: {
          eventId: parseInt(eventId),
          AND: this._buildAvailableTicketWhereClause().AND
        }
      });

      return {
        totalTickets: stats._count.id || 0,
        totalRevenue: stats._sum.price || '0',
        averagePrice: stats._avg.price || '0',
        minPrice: stats._min.price || '0',
        maxPrice: stats._max.price || '0',
        checkedInTickets: checkedInCount,
        totalSold: soldCount,
        totalConfirmed: confirmedCount,
        totalRemaining: remainingCount
      };
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      throw new Error(`Failed to fetch ticket statistics: ${error.message}`);
    }
  }

  async getTicketGroupsByEvent(eventId, userId) {
    try {
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const [tickets, storedGroups] = await Promise.all([
        prisma.ticket.findMany({
          where: { eventId: parseInt(eventId) },
          orderBy: { identificationNumber: 'asc' },
          select: {
            description: true,
            table: true,
            price: true,
            order: true,
            identificationNumber: true
          }
        }),
        prisma.ticketGroup.findMany({
          where: { eventId: parseInt(eventId) },
          include: {
            pricingTiers: {
              orderBy: { start_at: 'asc' }
            }
          }
        })
      ]);

      const storedGroupMap = new Map(storedGroups.map((group) => [group.groupKey, group]));
      const groups = new Map();

      tickets.forEach((ticket) => {
        const normalizedTable = ticket.table === undefined || ticket.table === null ? null : ticket.table;
        const groupKey = this._buildGroupKey(ticket.description, normalizedTable);

        if (!groups.has(groupKey)) {
          const storedGroup = storedGroupMap.get(groupKey);

          groups.set(groupKey, {
            id: storedGroup?.id || null,
            eventId: parseInt(eventId),
            groupKey,
            description: ticket.description,
            checkoutUrl: storedGroup?.checkout_url || '',
            productId: storedGroup?.product_id || null,
            color: storedGroup?.color || null,
            ticketCount: 0,
            availableCount: 0,
            firstOrder: ticket.identificationNumber || 0,
            price: ticket.price,
            activePrice: parseFloat(ticket.price) || 0,
            activePricingTier: null,
            pricingTiers: [],
            tables: []
          });
        }

        const group = groups.get(groupKey);
        group.ticketCount += 1;
        if (this._isTicketAvailable(ticket)) {
          group.availableCount += 1;
        }
        if (normalizedTable !== null && !group.tables.includes(normalizedTable)) {
          group.tables.push(normalizedTable);
        }
      });

      return Array.from(groups.values())
        .map((group) => {
          const storedGroup = storedGroupMap.get(group.groupKey);
          const resolvedPricing = this.resolveTicketGroupPricing({
            defaultPrice: group.price,
            pricingTiers: storedGroup?.pricingTiers || []
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
    } catch (error) {
      console.error('Error fetching ticket groups:', error);
      throw new Error(`Failed to fetch ticket groups: ${error.message}`);
    }
  }

  async updateTicketGroup(eventId, groupId, groupData, userId) {
    try {
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const existingGroup = await prisma.ticketGroup.findFirst({
        where: {
          id: parseInt(groupId),
          eventId: parseInt(eventId)
        }
      });

      if (!existingGroup) {
        throw new Error('Ticket group not found');
      }

      const normalizedPricingTiers = this._normalizePricingTiers(groupData.pricingTiers || []);
      const pricingTiersData = normalizedPricingTiers.map((tier) => ({
        name: tier.name,
        start_at: tier.startAt,
        end_at: tier.endAt,
        price: tier.priceDecimal.toString()
      }));

      const updateData = {
        checkout_url: groupData.checkoutUrl || null,
        product_id: Number.isInteger(Number(groupData.productId))
          ? parseInt(groupData.productId)
          : null,
        color: groupData.color ? String(groupData.color).trim() : null,
        pricingTiers: {
          deleteMany: {}
        }
      };

      if (pricingTiersData.length) {
        updateData.pricingTiers.create = pricingTiersData;
      }

      return prisma.ticketGroup.update({
        where: { id: parseInt(groupId) },
        data: updateData,
        include: {
          pricingTiers: {
            orderBy: { start_at: 'asc' }
          }
        }
      });
    } catch (error) {
      console.error('Error updating ticket group:', error);
      throw new Error(`Failed to update ticket group: ${error.message}`);
    }
  }

  /**
   * Search tickets by event with filtering and privacy protection
   * @param {number} eventId - Event ID to search tickets for
   * @param {string} userId - User ID for authorization
   * @param {boolean} availableOnly - If true, return only available tickets (no order + sales not ended)
   * @returns {Array} Filtered tickets without buyer information for privacy
   */
  async searchTicketsByEvent(eventId, userId, availableOnly = false) {
    try {
      // Verify event exists and user owns it
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      // Build where clause based on availability filter
      const whereClause = {
        eventId: parseInt(eventId)
      };

      if (availableOnly) {
        whereClause.AND = this._buildAvailableTicketWhereClause().AND;
      }

      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        orderBy: { identificationNumber: 'asc' },
        select: {
          // Include all fields except buyer information for privacy
          id: true,
          eventId: true,
          description: true,
          identificationNumber: true,
          location: true,
          table: true,
          price: true,
          order: true, // Keep order field as required
          reservedAt: true,
          reservedUntil: true,
          salesEndDateTime: true,
          created_at: true,
          updated_at: true,
          // Explicitly exclude buyer information for privacy
          // buyer: false,
          // buyerDocument: false,
          // buyerEmail: false,
        }
      });

      return tickets;
    } catch (error) {
      console.error('Error searching tickets:', error);
      throw new Error(`Failed to search tickets: ${error.message}`);
    }
  }

  async reserveTicketsForCart(eventId, ticketIds, customer, reservationExpiresInMinutes = 10) {
    const normalizedTicketIds = Array.from(new Set((ticketIds || []).map((id) => parseInt(id, 10)).filter(Number.isInteger)));

    if (!normalizedTicketIds.length) {
      throw new Error('Select at least one ticket');
    }

    const expiresInMinutes = Number.isFinite(Number(reservationExpiresInMinutes))
      ? Math.max(1, parseInt(reservationExpiresInMinutes, 10))
      : 10;

    const reservationKey = uuidv4();
    const now = new Date();
    const reservedUntil = new Date(now.getTime() + (expiresInMinutes * 60 * 1000));
    const availabilityWhere = this._buildAvailableTicketWhereClause(now);

    const result = await prisma.$transaction(async (tx) => {
      const tickets = await tx.ticket.findMany({
        where: {
          id: { in: normalizedTicketIds },
          eventId: parseInt(eventId)
        },
        orderBy: { identificationNumber: 'asc' }
      });

      if (tickets.length !== normalizedTicketIds.length) {
        throw new Error('Some selected tickets were not found');
      }

      for (const ticket of tickets) {
        if (!this._isTicketAvailable(ticket, now)) {
          throw new Error(`Ticket ${ticket.identificationNumber} is no longer available`);
        }
      }

      for (const ticketId of normalizedTicketIds) {
        const updateResult = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            eventId: parseInt(eventId),
            AND: availabilityWhere.AND
          },
          data: this._buildReservationUpdateData(reservationKey, reservedUntil)
        });

        if (updateResult.count !== 1) {
          throw new Error('One or more selected tickets are no longer available');
        }
      }

      const reservedTickets = await tx.ticket.findMany({
        where: {
          id: { in: normalizedTicketIds },
          eventId: parseInt(eventId)
        },
        orderBy: { identificationNumber: 'asc' }
      });

      return {
        reservationKey,
        reservedUntil,
        customer,
        tickets: reservedTickets
      };
    });

    return result;
  }

  async releaseTicketReservations({ eventId, ticketIds, reservationKey }) {
    const where = {
      eventId: parseInt(eventId),
      OR: [
        { order: null },
        { order: '' }
      ]
    };

    if (Array.isArray(ticketIds) && ticketIds.length) {
      where.id = {
        in: ticketIds.map((id) => parseInt(id, 10)).filter(Number.isInteger)
      };
    }

    if (reservationKey) {
      where.reservationKey = reservationKey;
    }

    return prisma.ticket.updateMany({
      where,
      data: this._clearReservationData()
    });
  }

  _extractCartWebhookMeta(webhookPayload) {
    const payload = webhookPayload?.payload || {};
    const meta = payload.meta || {};
    const ticketIds = Array.isArray(meta.ticketIds)
      ? meta.ticketIds.map((id) => parseInt(id, 10)).filter(Number.isInteger)
      : [];
    const eventId = parseInt(meta.eventId, 10);

    return {
      eventType: webhookPayload?.event || '',
      payload,
      meta,
      routeUserId: null,
      userId: meta.userId || null,
      eventId: Number.isInteger(eventId) ? eventId : null,
      ticketIds
    };
  }

  async processShoppingCartWebhook(webhookPayload, routeUserId) {
    const { eventType, payload, userId, eventId, ticketIds } = this._extractCartWebhookMeta(webhookPayload);

    if (!userId || !eventId || !ticketIds.length) {
      throw new Error('Invalid cart webhook payload: missing meta.userId, meta.eventId, or meta.ticketIds');
    }

    if (routeUserId !== userId) {
      throw new Error('Webhook user scope does not match cart metadata');
    }

    const orderId = payload.id ? String(payload.id) : null;
    const customer = payload.customer || {};

    const result = await prisma.$transaction(async (tx) => {
      const tickets = await tx.ticket.findMany({
        where: {
          id: { in: ticketIds },
          eventId
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              venue: true,
              opening_datetime: true,
              created_by: true
            }
          }
        },
        orderBy: { identificationNumber: 'asc' }
      });

      if (tickets.length !== ticketIds.length) {
        throw new Error('Cart webhook references unknown tickets');
      }

      const invalidScope = tickets.some((ticket) => ticket.event.created_by !== routeUserId || ticket.eventId !== eventId);
      if (invalidScope) {
        throw new Error('Cart webhook scope does not match ticket ownership');
      }

      if (eventType === 'payment.failed') {
        const result = await tx.ticket.updateMany({
          where: {
            id: { in: ticketIds },
            eventId,
            OR: [
              { order: null },
              { order: '' }
            ]
          },
          data: this._clearReservationData()
        });

        return {
          success: true,
          message: `Released ${result.count} reserved ticket(s) after payment failure.`,
          orderId,
          ticketIds,
          processedTickets: result.count,
          eventType
        };
      }

      if (eventType !== 'order.paid') {
        return {
          success: true,
          message: `Webhook event '${eventType}' acknowledged but not processed`,
          orderId,
          ticketIds,
          processedTickets: 0,
          eventType
        };
      }

      if (!orderId) {
        throw new Error('Invalid cart webhook payload: missing order ID');
      }

      const conflictingTickets = tickets.filter((ticket) => this._isTicketSold(ticket) && String(ticket.order) !== orderId);
      if (conflictingTickets.length) {
        throw new Error(`Some tickets are already associated with another order: ${conflictingTickets.map(ticket => ticket.id).join(', ')}`);
      }

      const allAlreadyProcessed = tickets.every((ticket) => String(ticket.order || '') === orderId);
      if (allAlreadyProcessed) {
        return {
          success: true,
          message: `Cart webhook already processed for order ${orderId}.`,
          orderId,
          ticketIds,
          buyerAssigned: tickets[0]?.buyer || customer.name || null,
          processedTickets: tickets.length,
          updatedTickets: tickets,
          ticketsToUpdate: tickets,
          buyerInfo: tickets[0]?.buyer || tickets[0]?.buyerEmail || tickets[0]?.buyerPhone
            ? {
                buyer: tickets[0]?.buyer || null,
                buyerDocument: tickets[0]?.buyerDocument || null,
                buyerEmail: tickets[0]?.buyerEmail || (customer.email ? String(customer.email).trim().toLowerCase() : null),
                buyerPhone: tickets[0]?.buyerPhone || customer.phone || null
              }
            : null,
          eventType
        };
      }

      const updateResult = await this._updateTicketsWithSelectiveBuyerInfo(
        tx,
        tickets,
        orderId,
        {
          name: customer.name || null,
          identification: customer.identification || null,
          email: customer.email ? String(customer.email).trim().toLowerCase() : null,
          phone: customer.phone || null
        }
      );

      for (const ticket of updateResult.updatedTickets) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: this._clearReservationData()
        });
      }

      return {
        success: true,
        message: `Shopping cart webhook processed successfully for order ${orderId}.`,
        orderId,
        ticketIds: updateResult.ticketIds,
        buyerAssigned: updateResult.buyerInfo ? (updateResult.buyerInfo.buyer || 'N/A') : null,
        processedTickets: updateResult.updatedTickets.length,
        updatedTickets: updateResult.updatedTickets.map((ticket) => ({
          ...ticket,
          ...this._clearReservationData()
        })),
        ticketsToUpdate: tickets,
        buyerInfo: updateResult.buyerInfo,
        eventType
      };
    });

    if (eventType !== 'order.paid' || !result.ticketsToUpdate?.length) {
      const { ticketsToUpdate: _ticketsToUpdate, buyerInfo: _buyerInfo, ...publicResult } = result;
      return publicResult;
    }

    const postCheckoutEmailResult = await this._sendPostCheckoutEmails({
      customer,
      userId: routeUserId,
      ticketsToUpdate: result.ticketsToUpdate,
      updateResult: {
        updatedTickets: result.updatedTickets,
        buyerInfo: result.buyerInfo
      },
      tableNumber: result.ticketsToUpdate[0]?.table ?? null,
      orderId: result.orderId
    });

    const { ticketsToUpdate: _ticketsToUpdate, buyerInfo: _buyerInfo, ...publicResult } = result;

    return {
      ...publicResult,
      confirmationUrl: !postCheckoutEmailResult.isSingleTicket && postCheckoutEmailResult.emailSent ? postCheckoutEmailResult.confirmationUrl : null,
      emailSent: postCheckoutEmailResult.emailSent,
      qrEmailSent: postCheckoutEmailResult.qrEmailSent,
      isSingleTicket: postCheckoutEmailResult.isSingleTicket
    };
  }

  /**
   * Process checkout webhook to confirm ticket purchases
   * Uses quantity-based selection or table-based selection depending on payload
   * 
   * IMPORTANT REQUIREMENTS:
   * - For quantity-based selection (no table): eventId and userId are REQUIRED
   * - For table-based selection: eventId is optional (can filter across all user events)
   * 
   * BEHAVIOR:
   * - Only the first ticket gets buyer information, all tickets get order field
   * - Supports Base64-encoded eventId in meta.eventId and tableNumber in meta.tableNumber
   * 
   * @param {Object} webhookPayload - The webhook payload from payment system
   * @param {string} userId - The user ID to validate ticket ownership (REQUIRED)
   * @returns {Object} - Processing result with updated tickets info
   */
  async processCheckoutWebhook(webhookPayload, userId) {
    try {
      // Validate webhook payload structure
      if (!webhookPayload.payload) {
        throw new Error('Invalid webhook payload: missing payload object');
      }

      const { payload } = webhookPayload;
      const { meta, customer, id: orderId, items } = payload;

      // Validate required fields
      if (!orderId) {
        throw new Error('Invalid webhook payload: missing order ID');
      }

      // NEW: Decode Base64 eventId from meta.eventId
      let decodedEventId = null;
      console.log('🔍 [DEBUG] Starting eventId processing...');
      console.log('🔍 [DEBUG] meta object:', JSON.stringify(meta, null, 2));

      if (meta && meta.eventId) {
        try {
          // Decode Base64 eventId
          const base64EventId = meta.eventId;
          decodedEventId = Buffer.from(base64EventId, 'base64').toString('utf8');
          console.log(`🔍 [DEBUG] Decoded eventId: ${decodedEventId} (from Base64: ${base64EventId})`);

          // Validate that decoded eventId is a valid number
          const eventIdNumber = parseInt(decodedEventId, 10);
          if (isNaN(eventIdNumber) || eventIdNumber <= 0) {
            throw new Error(`Invalid decoded eventId: ${decodedEventId}`);
          }

          decodedEventId = eventIdNumber;
          console.log(`🔍 [DEBUG] Final decodedEventId: ${decodedEventId} (type: ${typeof decodedEventId})`);
        } catch (decodeError) {
          console.error('❌ [DEBUG] Failed to decode Base64 eventId:', decodeError);
          throw new Error(`Failed to decode eventId from Base64: ${meta.eventId}`);
        }
      } else {
        console.log('🔍 [DEBUG] No eventId provided in meta, will search across all user events');
      }

      // Parse table number if present (also base64-encoded)
      let tableNumber = null;
      if (meta && meta.tableNumber) {
        try {
          // Decode Base64 tableNumber
          const base64TableNumber = meta.tableNumber;
          const decodedTableNumber = Buffer.from(base64TableNumber, 'base64').toString('utf8');
          console.log(`🔍 [DEBUG] Decoded tableNumber: ${decodedTableNumber} (from Base64: ${base64TableNumber})`);

          tableNumber = parseInt(decodedTableNumber, 10);
          if (isNaN(tableNumber)) {
            throw new Error(`Invalid decoded table number: ${decodedTableNumber}`);
          }
          console.log(`🔍 [DEBUG] Final tableNumber: ${tableNumber} (type: ${typeof tableNumber})`);
        } catch (decodeError) {
          console.error('❌ [DEBUG] Failed to decode Base64 tableNumber:', decodeError);
          throw new Error(`Failed to decode tableNumber from Base64: ${meta.tableNumber}`);
        }
      }

      // Validate that the decoded eventId belongs to the user (if provided)
      if (decodedEventId) {
        console.log(`🔍 [DEBUG] Validating eventId ${decodedEventId} for user ${userId}`);
        const event = await prisma.event.findFirst({
          where: {
            id: decodedEventId,
            created_by: userId
          },
          select: {
            id: true,
            name: true,
            created_by: true
          }
        });

        console.log(`🔍 [DEBUG] Event validation result:`, JSON.stringify(event, null, 2));

        if (!event) {
          console.error(`❌ [DEBUG] Event with ID ${decodedEventId} not found or does not belong to user ${userId}`);
          throw new Error(`Event with ID ${decodedEventId} not found or does not belong to user ${userId}`);
        }

        console.log(`✅ [DEBUG] Event validated: ${event.name} (ID: ${event.id}) for user ${userId}`);
      }

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        let ticketsToUpdate;
        let selectionMethod;

        if (tableNumber !== null) {
          // CASE 1: Table-based selection - update all tickets for this table
          selectionMethod = 'table-based';

          // Build where clause with optional eventId filter
          const whereClause = {
            table: tableNumber,
            event: {
              created_by: userId
            }
          };

          // If eventId is provided, filter by specific event
          if (decodedEventId) {
            whereClause.eventId = decodedEventId;
          }

          ticketsToUpdate = await tx.ticket.findMany({
            where: whereClause,
            include: {
              event: {
                select: {
                  id: true,
                  created_by: true,
                  name: true,
                  venue: true,
                  opening_datetime: true
                }
              }
            },
            orderBy: {
              identificationNumber: 'asc'
            }
          });

          if (ticketsToUpdate.length === 0) {
            const eventFilter = decodedEventId ? ` for event ${decodedEventId}` : '';
            throw new Error(`No tickets found for table ${tableNumber}${eventFilter} belonging to user ${userId}`);
          }

        } else {
          // CASE 2: Quantity-based selection - find N unsold tickets without table numbers
          selectionMethod = 'quantity-based';

          // IMPORTANT: For individual ticket sales, eventId is REQUIRED
          if (!decodedEventId) {
            throw new Error('eventId is required for individual ticket purchases (quantity-based selection)');
          }

          // Determine quantity from items array
          let quantity = 0;
          if (items && Array.isArray(items)) {
            quantity = items.reduce((total, item) => total + (item.quantity || 0), 0);
          }

          if (quantity <= 0) {
            throw new Error('Invalid webhook payload: no valid quantity found in items');
          }

          // Build where clause for unsold tickets without table numbers
          // eventId is REQUIRED for quantity-based selection (validated above)
          console.log(`🔍 [DEBUG] Building WHERE clause for quantity-based selection...`);
          console.log(`🔍 [DEBUG] quantity: ${quantity}, userId: ${userId}, eventId: ${decodedEventId}`);

          const whereClause = {
            AND: [
              {
                eventId: decodedEventId  // REQUIRED for individual ticket sales
              },
              {
                event: {
                  created_by: userId
                }
              },
              {
                OR: [
                  { table: null },
                  { table: 0 }
                ]
              },
              {
                OR: [
                  { order: null },
                  { order: '' }
                ]
              }
            ]
          };

          console.log(`✅ [DEBUG] WHERE clause with required eventId:`, JSON.stringify(whereClause, null, 2));

          // Find unsold tickets
          console.log(`🔍 [DEBUG] Searching for tickets with Prisma query...`);
          ticketsToUpdate = await tx.ticket.findMany({
            where: whereClause,
            include: {
              event: {
                select: {
                  id: true,
                  created_by: true,
                  name: true,
                  venue: true,
                  opening_datetime: true
                }
              }
            },
            orderBy: {
              identificationNumber: 'asc'
            },
            take: Math.floor(quantity)
          });

          console.log(`🔍 [DEBUG] Found ${ticketsToUpdate.length} tickets`);
          if (ticketsToUpdate.length > 0) {
            console.log(`🔍 [DEBUG] First ticket details:`);
            console.log(`  - ID: ${ticketsToUpdate[0].id}`);
            console.log(`  - Event ID: ${ticketsToUpdate[0].eventId}`);
            console.log(`  - Event Name: ${ticketsToUpdate[0].event.name}`);
            console.log(`  - Identification Number: ${ticketsToUpdate[0].identificationNumber}`);
            console.log(`  - Order: ${ticketsToUpdate[0].order || 'null'}`);
          }

          if (ticketsToUpdate.length === 0) {
            throw new Error(`No available tickets without table numbers found for event ${decodedEventId} and user ${userId}`);
          }

          if (ticketsToUpdate.length < Math.floor(quantity)) {
            throw new Error(`Not enough available tickets for event ${decodedEventId}: requested ${Math.floor(quantity)}, found ${ticketsToUpdate.length}`);
          }
        }

        // Validate user ownership (additional safety check)
        const invalidTickets = ticketsToUpdate.filter(t => t.event.created_by !== userId);
        if (invalidTickets.length > 0) {
          const invalidIds = invalidTickets.map(t => t.id);
          throw new Error(`Tickets do not belong to user ${userId}: ${invalidIds.join(', ')}`);
        }

        // For table-based updates, check if any tickets are already sold (only if not table-based)
        if (selectionMethod !== 'table-based') {
          const soldTickets = ticketsToUpdate.filter(t => t.order && t.order.trim() !== '');
          if (soldTickets.length > 0) {
            const soldIds = soldTickets.map(t => t.id);
            throw new Error(`Some tickets are already sold: ${soldIds.join(', ')}`);
          }
        }

        // Process selective buyer assignment using helper method
        const updateResult = await this._updateTicketsWithSelectiveBuyerInfo(tx, ticketsToUpdate, orderId.toString(), customer);

        return {
          success: true,
          message: `Checkout webhook processed successfully. Order ${orderId} assigned to ${tableNumber ? `table ${tableNumber}` : `${ticketsToUpdate.length} tickets`} with ${updateResult.ticketsUpdated} tickets updated.`,
          orderId: orderId.toString(),
          tableNumber: tableNumber,
          ticketIds: updateResult.ticketIds,
          buyerAssigned: updateResult.buyerInfo ? (updateResult.buyerInfo.buyer || 'N/A') : null,
          processedTickets: updateResult.ticketsUpdated,
          updatedTickets: updateResult.updatedTickets,
          ticketsToUpdate,
          buyerInfo: updateResult.buyerInfo,
          selectionMethod,
          quantity: selectionMethod === 'quantity-based' ? Math.floor(items.reduce((total, item) => total + (item.quantity || 0), 0)) : undefined,
          customerEmail: customer?.email || null
        };
      });

      const postCheckoutEmailResult = await this._sendPostCheckoutEmails({
        customer,
        userId,
        ticketsToUpdate: result.ticketsToUpdate,
        updateResult: {
          updatedTickets: result.updatedTickets,
          buyerInfo: result.buyerInfo
        },
        tableNumber,
        orderId: result.orderId
      });

      const { ticketsToUpdate: _ticketsToUpdate, buyerInfo: _buyerInfo, ...publicResult } = result;

      return {
        ...publicResult,
        confirmationUrl: !postCheckoutEmailResult.isSingleTicket && postCheckoutEmailResult.emailSent ? postCheckoutEmailResult.confirmationUrl : null,
        emailSent: postCheckoutEmailResult.emailSent,
        qrEmailSent: postCheckoutEmailResult.qrEmailSent,
        isSingleTicket: postCheckoutEmailResult.isSingleTicket
      };

    } catch (error) {
      console.error('Error processing checkout webhook:', error);
      throw error;
    }
  }

  /**
   * Helper method to update tickets with selective buyer information assignment
   * NEW BEHAVIOR: Only the first ticket (by identificationNumber asc) gets buyer info
   * All tickets get the order field filled
   * @param {Object} tx - Prisma transaction object
   * @param {Array} ticketsToUpdate - Array of tickets to update (already sorted by identificationNumber asc)
   * @param {string} orderId - Order ID to assign to all tickets
   * @param {Object} customer - Customer object from webhook payload
   * @returns {Object} - Result with updated tickets info
   */
  async _updateTicketsWithSelectiveBuyerInfo(tx, ticketsToUpdate, orderId, customer) {
    try {
      if (!ticketsToUpdate || ticketsToUpdate.length === 0) {
        throw new Error('No tickets provided for update');
      }

      // Prepare buyer information from customer object
      let buyerInfo = null;
      if (customer) {
        buyerInfo = {
          buyer: customer.name || null,
          buyerDocument: customer.identification || null,
          buyerEmail: customer.email || null,
          buyerPhone: customer.phone || null
        };
      }

      const updatedTickets = [];
      const ticketIds = ticketsToUpdate.map(t => t.id);

      // Process each ticket
      for (let i = 0; i < ticketsToUpdate.length; i++) {
        const ticket = ticketsToUpdate[i];
        const isFirstTicket = i === 0;

        // Base update data - all tickets get order field
        const updateData = {
          order: orderId
        };

        if (!ticket.qrCodeHash && ticket.event?.created_by) {
          updateData.qrCodeHash = this._generateQrCodeHashForTicket(ticket, ticket.event.created_by);
        }

        // Only the first ticket gets buyer information
        if (isFirstTicket && buyerInfo) {
          Object.assign(updateData, buyerInfo);
        }

        // Update the ticket
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: updateData
        });

        updatedTickets.push(updatedTicket);
      }

      return {
        ticketIds,
        updatedTickets,
        ticketsUpdated: updatedTickets.length,
        buyerInfo: buyerInfo,
        firstTicketId: ticketsToUpdate[0].id,
        orderAssignedToAll: true
      };

    } catch (error) {
      console.error('Error in selective buyer info assignment:', error);
      throw new Error(`Failed to update tickets with selective buyer info: ${error.message}`);
    }
  }

  /**
   * Public search tickets by event and user with filtering and privacy protection
   * This method validates userId separately and is designed for public API access
   * @param {number} eventId - Event ID to search tickets for
   * @param {string} userId - User ID to validate and filter tickets
   * @param {boolean} availableOnly - If true, return only available tickets (no order + sales not ended)
   * @returns {Object} Result with tickets and validation info
   */
  async searchTicketsPublic(eventId, userId, availableOnly = false) {
    try {
      // First, validate that the userId exists in the database (has created events)
      const userEvents = await prisma.event.findFirst({
        where: {
          created_by: userId
        },
        select: { id: true }
      });

      if (!userEvents) {
        throw new Error(`User with ID '${userId}' does not exist or has no events`);
      }

      // Verify the specific event exists and belongs to the specified userId
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          created_by: userId
        }
      });

      if (!event) {
        throw new Error(`Event not found or does not belong to user '${userId}'`);
      }

      // Build where clause based on availability filter
      const whereClause = {
        eventId: parseInt(eventId)
      };

      if (availableOnly) {
        whereClause.AND = this._buildAvailableTicketWhereClause().AND;
      }

      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        orderBy: { identificationNumber: 'asc' },
        select: {
          // Include all fields except buyer information for privacy
          id: true,
          eventId: true,
          description: true,
          identificationNumber: true,
          location: true,
          table: true,
          price: true,
          order: true, // Keep order field as required
          reservedAt: true,
          reservedUntil: true,
          salesEndDateTime: true,
          created_at: true,
          updated_at: true,
          // Explicitly exclude buyer information for privacy
          // buyer: false,
          // buyerDocument: false,
          // buyerEmail: false,
        }
      });

      return {
        success: true,
        tickets,
        eventId: parseInt(eventId),
        userId,
        filter: {
          available: availableOnly
        }
      };
    } catch (error) {
      console.error('Error in public ticket search:', error);
      throw error;
    }
  }

  /**
   * Get tickets for public event landing page (sales still open)
   * Excludes already sold tickets so bought seats do not appear publicly.
   * @param {number} eventId - Event ID to fetch tickets for
   * @returns {Array} Tickets with sales still open (privacy-protected)
   */
  async getLandingTicketsByEvent(eventId) {
    try {
      const currentDateTime = new Date();

      const tickets = await prisma.ticket.findMany({
        where: {
          eventId: parseInt(eventId),
          AND: [
            {
              OR: [
                { order: null },
                { order: '' }
              ]
            },
            {
              OR: [
                { salesEndDateTime: null },
                { salesEndDateTime: { gt: currentDateTime } }
              ]
            }
          ]
        },
        orderBy: { identificationNumber: 'asc' },
        select: {
          id: true,
          eventId: true,
          description: true,
          identificationNumber: true,
          location: true,
          table: true,
          price: true,
          order: true,
          reservedAt: true,
          reservedUntil: true,
          salesEndDateTime: true,
          created_at: true,
          updated_at: true
        }
      });

      return tickets;
    } catch (error) {
      console.error('Error fetching landing tickets:', error);
      throw new Error(`Failed to fetch landing tickets: ${error.message}`);
    }
  }

  /**
   * Close the Prisma connection
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = new TicketService();
