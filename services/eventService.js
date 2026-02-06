const { PrismaClient } = require('../generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

class EventService {
  
  // Create a new event
  async createEvent(eventData) {
    try {
      const {
        name,
        event_image_url,
        promotional_image,
        opening_datetime,
        closing_datetime,
        map_image,
        description,
        venue,
        checkout_page_id,
        checkout_page_title,
        created_by
      } = eventData;

      const event = await prisma.event.create({
        data: {
          name,
          event_image_url,
          promotional_image,
          opening_datetime: new Date(opening_datetime),
          closing_datetime: new Date(closing_datetime),
          map_image,
          description,
          venue,
          checkout_page_id,
          checkout_page_title,
          created_by
        }
      });

      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event: ' + error.message);
    }
  }

  // Get all events with optional filters
  async getEvents(filters = {}) {
    try {
      const {
        status = 'active',
        created_by,
        upcoming
      } = filters;

      const where = { status };
      
      if (created_by) {
        where.created_by = created_by;
      }

      if (upcoming) {
        where.opening_datetime = {
          gte: new Date()
        };
      }

      const events = await prisma.event.findMany({
        where,
        orderBy: {
          opening_datetime: 'asc'
        }
      });

      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events: ' + error.message);
    }
  }

  // Get a single event by ID
  async getEventById(id, userId = null) {
    try {
      const where = { id: parseInt(id) };
      
      // If userId is provided, only return events owned by that user
      if (userId) {
        where.created_by = userId;
      }

      const event = await prisma.event.findFirst({
        where
      });

      if (!event) {
        throw new Error('Event not found');
      }

      return event;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw new Error('Failed to fetch event: ' + error.message);
    }
  }

  // Update an event
  async updateEvent(id, eventData, userId) {
    try {
      const {
        name,
        event_image_url,
        promotional_image,
        opening_datetime,
        closing_datetime,
        map_image,
        description,
        venue,
        status,
        checkout_page_id,
        checkout_page_title
      } = eventData;

      // First check if the event exists and user owns it
      const existingEvent = await this.getEventById(id, userId);

      // Remove old images if they're being replaced
      if (promotional_image && existingEvent.promotional_image && 
          promotional_image !== existingEvent.promotional_image) {
        this.removeFile(existingEvent.promotional_image);
      }
      
      if (map_image && existingEvent.map_image && 
          map_image !== existingEvent.map_image) {
        this.removeFile(existingEvent.map_image);
      }

      const updatedEvent = await prisma.event.update({
        where: {
          id: parseInt(id),
          created_by: userId
        },
        data: {
          name,
          event_image_url,
          promotional_image,
          opening_datetime: opening_datetime ? new Date(opening_datetime) : undefined,
          closing_datetime: closing_datetime ? new Date(closing_datetime) : undefined,
          map_image,
          description,
          venue,
          status,
          checkout_page_id,
          checkout_page_title
        }
      });

      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event: ' + error.message);
    }
  }

  // Delete an event
  async deleteEvent(id, userId) {
    try {
      // First get the event to remove associated files
      const event = await this.getEventById(id, userId);

      // Remove associated files
      if (event.promotional_image) {
        this.removeFile(event.promotional_image);
      }
      if (event.map_image) {
        this.removeFile(event.map_image);
      }

      const deletedEvent = await prisma.event.delete({
        where: {
          id: parseInt(id),
          created_by: userId
        }
      });

      return deletedEvent;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event: ' + error.message);
    }
  }

  // Helper method to safely remove files
  removeFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Removed file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error);
    }
  }

  // Get event statistics
  async getEventStats(userId) {
    try {
      const totalEvents = await prisma.event.count({
        where: { created_by: userId }
      });

      const activeEvents = await prisma.event.count({
        where: { 
          created_by: userId,
          status: 'active'
        }
      });

      const upcomingEvents = await prisma.event.count({
        where: {
          created_by: userId,
          status: 'active',
          opening_datetime: {
            gte: new Date()
          }
        }
      });

      const pastEvents = await prisma.event.count({
        where: {
          created_by: userId,
          closing_datetime: {
            lt: new Date()
          }
        }
      });

      return {
        totalEvents,
        activeEvents,
        upcomingEvents,
        pastEvents
      };
    } catch (error) {
      console.error('Error fetching event stats:', error);
      throw new Error('Failed to fetch event statistics: ' + error.message);
    }
  }

  // Close the Prisma connection
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = new EventService();
