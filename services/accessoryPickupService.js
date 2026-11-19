const prisma = require('../config/prisma');
const qrCodeHashUtil = require('../utils/qrCodeHash');
const ticketQrLookupService = require('./ticketQrLookupService');

class AccessoryPickupService {

    /**
     * Find ticket by QR code hash
     * 
     * @param {string} hash - The QR code hash from the URL
     * @returns {Object} - Ticket information with event details
     */
    async findTicketByHash(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Invalid hash format');
            }

            const ticket = await ticketQrLookupService.findTicketByHash(hash, {
                include: {
                    event: {
                        select: {
                            id: true,
                            name: true,
                            venue: true,
                            opening_datetime: true,
                            closing_datetime: true,
                            created_by: true
                        }
                    }
                }
            });

            if (!ticket) {
                throw new Error('Ticket not found for the provided hash');
            }

            return {
                id: ticket.id,
                eventId: ticket.eventId,
                description: ticket.description,
                identificationNumber: ticket.identificationNumber,
                location: ticket.location,
                table: ticket.table,
                price: parseFloat(ticket.price) || 0,
                buyer: ticket.buyer,
                buyerDocument: ticket.buyerDocument,
                buyerEmail: ticket.buyerEmail,
                checkedIn: ticket.checkedIn,
                checkedInAt: ticket.checkedInAt,
                accessoryCollected: ticket.accessoryCollected,
                accessoryCollectedAt: ticket.accessoryCollectedAt,
                accessoryCollectedNotes: ticket.accessoryCollectedNotes,
                event: {
                    id: ticket.event.id,
                    name: ticket.event.name,
                    venue: ticket.event.venue,
                    opening_datetime: ticket.event.opening_datetime,
                    closing_datetime: ticket.event.closing_datetime,
                    created_by: ticket.event.created_by
                },
                hash: ticket.qrCodeHash
            };
        } catch (error) {
            console.error('Error finding ticket by hash:', error);
            throw new Error(`Failed to find ticket: ${error.message}`);
        }
    }

    /**
     * Get accessory pickup status for a ticket by hash
     * 
     * @param {string} hash - The QR code hash from the URL
     * @returns {Object} - Pickup status information
     */
    async getPickupStatus(hash) {
        try {
            const ticket = await this.findTicketByHash(hash);

            return {
                success: true,
                ticket: {
                    id: ticket.id,
                    identificationNumber: ticket.identificationNumber,
                    description: ticket.description,
                    location: ticket.location,
                    table: ticket.table,
                    buyer: ticket.buyer,
                    buyerDocument: ticket.buyerDocument,
                    accessoryCollected: ticket.accessoryCollected,
                    accessoryCollectedAt: ticket.accessoryCollectedAt,
                    accessoryCollectedNotes: ticket.accessoryCollectedNotes
                },
                event: {
                    name: ticket.event.name,
                    venue: ticket.event.venue,
                    opening_datetime: ticket.event.opening_datetime,
                    closing_datetime: ticket.event.closing_datetime
                },
                canPickup: !ticket.accessoryCollected,
                hash: hash
            };
        } catch (error) {
            console.error('Error getting accessory pickup status:', error);
            throw new Error(`Failed to get pickup status: ${error.message}`);
        }
    }

    /**
     * Process accessory pickup
     * 
     * @param {string} hash - The QR code hash from the URL
     * @param {string} notes - Optional notes about the pickup
     * @returns {Object} - Pickup result
     */
    async processPickup(hash, notes = '') {
        try {
            let ticket = await this.findTicketByHash(hash);
            let updatedTicket;

            if (!ticket.accessoryCollected) {
                try {
                    updatedTicket = await prisma.ticket.update({
                        where: { id: ticket.id, accessoryCollected: false },
                        data: {
                            accessoryCollected: true,
                            accessoryCollectedAt: new Date(),
                            accessoryCollectedNotes: notes || null
                        },
                        include: {
                            event: {
                                select: {
                                    name: true,
                                    venue: true,
                                    opening_datetime: true,
                                    closing_datetime: true
                                }
                            }
                        }
                    });
                } catch (error) {
                    if (error.code !== 'P2025') throw error;
                    ticket = await this.findTicketByHash(hash);
                    if (!ticket.accessoryCollected) throw error;
                }
            }

            const result = updatedTicket || ticket;
            return {
                success: Boolean(updatedTicket),
                ...(updatedTicket ? {} : { alreadyCollected: true }),
                message: updatedTicket ? 'Accessory pickup completed successfully' : 'This accessory has already been collected',
                ticket: {
                    id: result.id,
                    identificationNumber: result.identificationNumber,
                    description: result.description,
                    location: result.location,
                    table: result.table,
                    buyer: result.buyer,
                    buyerDocument: result.buyerDocument,
                    accessoryCollected: result.accessoryCollected,
                    accessoryCollectedAt: result.accessoryCollectedAt,
                    accessoryCollectedNotes: result.accessoryCollectedNotes
                },
                event: {
                    name: result.event.name,
                    venue: result.event.venue,
                    ...(updatedTicket ? {
                        opening_datetime: result.event.opening_datetime,
                        closing_datetime: result.event.closing_datetime
                    } : {})
                }
            };
        } catch (error) {
            console.error('Error processing accessory pickup:', error);
            throw new Error(`Failed to process pickup: ${error.message}`);
        }
    }

    /**
     * Generate accessory pickup hash for a ticket (for testing purposes)
     * 
     * @param {number} ticketId - The ticket ID
     * @param {string} userId - The user ID who owns the event
     * @returns {string} - The pickup hash
     */
    async generatePickupHash(ticketId, userId) {
        try {
            const ticket = await prisma.ticket.findFirst({
                where: {
                    id: parseInt(ticketId),
                    event: {
                        created_by: userId
                    }
                },
                include: {
                    event: {
                        select: {
                            id: true,
                            created_by: true
                        }
                    }
                }
            });

            if (!ticket) {
                throw new Error('Ticket not found or access denied');
            }

            const qrCodeHash = ticket.qrCodeHash || qrCodeHashUtil.generateQrCodeHash(
                ticket.event.created_by,
                ticket.eventId,
                ticket.id
            );

            if (!ticket.qrCodeHash) {
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { qrCodeHash }
                });
            }

            return qrCodeHash;
        } catch (error) {
            console.error('Error generating pickup hash:', error);
            throw new Error(`Failed to generate pickup hash: ${error.message}`);
        }
    }

    /**
     * Get accessory pickup statistics for an event
     * 
     * @param {number} eventId - The event ID
     * @param {string} userId - The user ID who owns the event
     * @returns {Object} - Pickup statistics
     */
    async getEventPickupStats(eventId, userId) {
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

            const stats = await prisma.ticket.groupBy({
                by: ['accessoryCollected'],
                where: { eventId: parseInt(eventId) },
                _count: {
                    id: true
                }
            });

            let totalTickets = 0;
            let collectedTickets = 0;

            stats.forEach(stat => {
                if (stat.accessoryCollected) {
                    collectedTickets = stat._count.id;
                }
                totalTickets += stat._count.id;
            });

            const notCollected = totalTickets - collectedTickets;

            return {
                success: true,
                eventId: parseInt(eventId),
                stats: {
                    totalTickets,
                    collectedTickets,
                    notCollected,
                    collectedPercentage: totalTickets > 0 ? Math.round((collectedTickets / totalTickets) * 100) : 0
                }
            };
        } catch (error) {
            console.error('Error getting event accessory pickup stats:', error);
            throw new Error(`Failed to get pickup stats: ${error.message}`);
        }
    }
}

module.exports = new AccessoryPickupService();
