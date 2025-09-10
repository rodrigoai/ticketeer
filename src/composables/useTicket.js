import { ref } from 'vue'
import { useApi } from './useApi'

export function useTicket() {
  const { get, post, put, delete: deleteApi } = useApi()
  
  const isLoading = ref(false)
  const error = ref(null)

  // Get all tickets for an event
  const getEventTickets = async (eventId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await get(`/api/events/${eventId}/tickets`)
      
      if (response.success) {
        return response.tickets || []
      } else {
        throw new Error(response.message || 'Failed to fetch tickets')
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch tickets'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get ticket statistics for an event
  const getEventTicketStats = async (eventId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await get(`/api/events/${eventId}/tickets/stats`)
      
      if (response.success) {
        return response.stats || null
      } else {
        throw new Error(response.message || 'Failed to fetch statistics')
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch statistics'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Create a single ticket
  const createTicket = async (eventId, ticketData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await post(`/api/events/${eventId}/tickets`, ticketData)
      
      if (response.success) {
        return response.ticket
      } else {
        throw new Error(response.message || 'Failed to create ticket')
      }
    } catch (err) {
      error.value = err.message || 'Failed to create ticket'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Create multiple tickets in batch
  const createTicketsBatch = async (eventId, ticketData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await post(`/api/events/${eventId}/tickets/batch`, ticketData)
      
      if (response.success) {
        return response.tickets || []
      } else {
        throw new Error(response.message || 'Failed to create tickets')
      }
    } catch (err) {
      error.value = err.message || 'Failed to create tickets'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get a specific ticket
  const getTicket = async (ticketId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await get(`/api/tickets/${ticketId}`)
      
      if (response.success) {
        return response.ticket
      } else {
        throw new Error(response.message || 'Failed to fetch ticket')
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch ticket'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update a ticket
  const updateTicket = async (ticketId, ticketData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await put(`/api/tickets/${ticketId}`, ticketData)
      
      if (response.success) {
        return response.ticket
      } else {
        throw new Error(response.message || 'Failed to update ticket')
      }
    } catch (err) {
      error.value = err.message || 'Failed to update ticket'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete a ticket
  const deleteTicket = async (ticketId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await deleteApi(`/api/tickets/${ticketId}`)
      
      if (response.success) {
        return response
      } else {
        throw new Error(response.message || 'Failed to delete ticket')
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete ticket'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete multiple tickets
  const deleteTickets = async (ticketIds) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await deleteApi('/api/tickets/batch', {
        body: JSON.stringify({ ticketIds })
      })
      
      if (response.success) {
        return response
      } else {
        throw new Error(response.message || 'Failed to delete tickets')
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete tickets'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    // State
    isLoading,
    error,
    
    // Methods
    getEventTickets,
    getEventTicketStats,
    createTicket,
    createTicketsBatch,
    getTicket,
    updateTicket,
    deleteTicket,
    deleteTickets,
    clearError
  }
}
