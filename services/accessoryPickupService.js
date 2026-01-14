const { PrismaClient } = require('../generated/prisma');
const qrCodeHashUtil = require('../utils/qrCodeHash');

const prisma = new PrismaClient();

class AccessoryPickupService {

    /**
     * Find ticket by QR code hash
     * Since hashes are deterministic but not reversible, we need to search through possible matches
     * 
     * @param {string} hash - The QR code hash from the URL
     * @returns {Object} - Ticket information with event details
     */
    async findTicketByHash(hash) {
        try {
            if (!hash || typeof hash !== 'string') {
                throw new Error('Invalid hash format');
            }

            // Get all tickets that could potentially match this hash
            // We'll need to check each ticket against the hash
            const allTickets = await prisma.ticket.findMany({
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

            // Check each ticket to see if its hash matches
            for (const ticket of allTickets) {
                const expectedHash = qrCodeHashUtil.generateQrCodeHash(
                    ticket.event.created_by,
                    ticket.eventId,
                    ticket.id
                );

                if (expectedHash === hash) {
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
                        hash: hash
                    };
                }
            }

            throw new Error('Ticket not found for the provided hash');
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
            const ticket = await this.findTicketByHash(hash);

            // Check if accessory already collected
            if (ticket.accessoryCollected) {
                return {
                    success: false,
                    alreadyCollected: true,
                    message: 'This accessory has already been collected',
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
                        venue: ticket.event.venue
                    }
                };
            }

            // Process the pickup
            const collectedAt = new Date();
            const updatedTicket = await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    accessoryCollected: true,
                    accessoryCollectedAt: collectedAt,
                    accessoryCollectedNotes: notes || null
                },
                include: {
                    event: {
                        select: {
                            id: true,
                            name: true,
                            venue: true,
                            opening_datetime: true,
                            closing_datetime: true
                        }
                    }
                }
            });

            return {
                success: true,
                message: 'Accessory pickup completed successfully',
                ticket: {
                    id: updatedTicket.id,
                    identificationNumber: updatedTicket.identificationNumber,
                    description: updatedTicket.description,
                    location: updatedTicket.location,
                    table: updatedTicket.table,
                    buyer: updatedTicket.buyer,
                    buyerDocument: updatedTicket.buyerDocument,
                    accessoryCollected: updatedTicket.accessoryCollected,
                    accessoryCollectedAt: updatedTicket.accessoryCollectedAt,
                    accessoryCollectedNotes: updatedTicket.accessoryCollectedNotes
                },
                event: {
                    name: updatedTicket.event.name,
                    venue: updatedTicket.event.venue,
                    opening_datetime: updatedTicket.event.opening_datetime,
                    closing_datetime: updatedTicket.event.closing_datetime
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

            return qrCodeHashUtil.generateQrCodeHash(
                ticket.event.created_by,
                ticket.eventId,
                ticket.id
            );
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
