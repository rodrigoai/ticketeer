<template>
  <div class="container py-5">
    <div class="row">
      <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Events Management</h2>
            <small class="text-muted" v-if="isAuthenticated">
              <i class="fas fa-user"></i> {{ userName }} ({{ userEmail }})
            </small>
          </div>
          <button class="btn btn-primary" @click="showCreateModal" v-if="isAuthenticated">
            <i class="fas fa-plus"></i> Create Event
          </button>
        </div>
      </div>
    </div>
    
    <!-- Authentication Warning -->
    <div v-if="!isAuthenticated && !isLoading" class="alert alert-warning" role="alert">
      <i class="fas fa-exclamation-triangle"></i>
      <strong>Please log in</strong> to view and manage your events.
    </div>

    <!-- Events List -->
    <div class="row" v-if="isAuthenticated">
      <div class="col-12">
        <div v-if="isLoading" class="text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading events...</span>
          </div>
        </div>

        <div v-else-if="events.length === 0 && isAuthenticated" class="text-center py-5">
          <div class="mb-4">
            <span class="display-1">🎪</span>
          </div>
          <h4>No Events Yet</h4>
          <p class="text-muted">Create your first event to get started!</p>
          <button class="btn btn-primary" @click="showCreateModal">Create Event</button>
        </div>

        <div v-else class="row g-4">
          <div v-for="event in events" :key="event.id" class="col-md-6 col-lg-4">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">{{ event.title }}</h5>
                <p class="card-text">{{ event.description }}</p>
                <div class="mb-2">
                  <small class="text-muted">
                    <i class="fas fa-calendar"></i> {{ formatDate(event.date) }}
                  </small>
                </div>
                <div class="mb-2">
                  <small class="text-muted">
                    <i class="fas fa-map-marker-alt"></i> {{ event.venue }}
                  </small>
                </div>
              </div>
              <div class="card-footer">
                <div class="d-flex gap-2 mb-2">
                  <router-link :to="`/events/${event.id}`" class="btn btn-success btn-sm flex-fill">
                    <i class="fas fa-ticket-alt"></i> Manage Tickets
                  </router-link>
                </div>
                <div class="btn-group w-100" role="group">
                  <button class="btn btn-outline-primary btn-sm" @click="editEvent(event)">
                    <i class="fas fa-edit"></i> Edit
                  </button>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteEvent(event.id)">
                    <i class="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="alert alert-danger mt-3" role="alert">
          <strong>Error:</strong> {{ error }}
          <button class="btn btn-sm btn-outline-danger ms-2" @click="loadEvents">Retry</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Event Modal -->
    <div class="modal fade" id="eventModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? 'Edit Event' : 'Create Event' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveEvent">
              <div class="mb-3">
                <label for="eventTitle" class="form-label">Title</label>
                <input type="text" class="form-control" id="eventTitle" v-model="eventForm.title" required>
              </div>
              <div class="mb-3">
                <label for="eventDescription" class="form-label">Description</label>
                <textarea class="form-control" id="eventDescription" rows="3" v-model="eventForm.description"></textarea>
              </div>
              <div class="row">
                <div class="col-md-12">
                  <div class="mb-3">
                    <label for="eventDate" class="form-label">Date</label>
                    <input type="datetime-local" class="form-control" id="eventDate" v-model="eventForm.date" required>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="eventVenue" class="form-label">Venue</label>
                <input type="text" class="form-control" id="eventVenue" v-model="eventForm.venue" required>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveEvent" :disabled="isLoading">
              {{ isLoading ? 'Saving...' : 'Save Event' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useUser } from '@/composables/useUser'


// Import Bootstrap for modal functionality
import { Modal } from 'bootstrap'
if (typeof window !== 'undefined' && !window.bootstrap) {
  window.bootstrap = { Modal }
}

// API composable
const { isLoading, error, get, post, put, delete: deleteApi } = useApi()

// User composable
const { userId, user, userName, userEmail, isAuthenticated } = useUser()

// Events data
const events = ref([])
const isEditing = ref(false)
const currentEventId = ref(null)

// Event form
const eventForm = reactive({
  title: '',
  description: '',
  date: '',
  venue: ''
})

// Load events
const loadEvents = async () => {
  try {
    const data = await get('/api/events')
    events.value = data.events || []
    
    // Clear any previous errors
    error.value = null
  } catch (err) {
    console.error('Failed to load events:', err)
    events.value = []
    error.value = err.message || 'Failed to load events'
  }
}

// Show create modal
const showCreateModal = () => {
  isEditing.value = false
  currentEventId.value = null
  resetForm()
  const modalElement = document.getElementById('eventModal')
  const modal = new Modal(modalElement)
  modal.show()
}

// Edit event
const editEvent = (event) => {
  isEditing.value = true
  currentEventId.value = event.id
  
  // Map database fields to form fields
  Object.assign(eventForm, {
    title: event.title || event.name,
    description: event.description || '',
    date: event.date ? formatDateForInput(event.date) : '',
    venue: event.venue || '',
    createdBy: userId
  })
  
  const modalElement = document.getElementById('eventModal')
  const modal = new Modal(modalElement)
  modal.show()
}

// Save event
const saveEvent = async () => {
  if (!eventForm.title || !eventForm.date || !eventForm.venue) {
    error.value = 'Please fill in all required fields'
    return
  }
  
  if (!isAuthenticated.value) {
    error.value = 'You must be logged in to create events'
    return
  }
  
  try {
    if (isEditing.value) {
      const result = await put(`/api/events/${currentEventId.value}`, eventForm)
      console.log('Event updated:', result)
    } else {
      // Note: created_by is automatically set by the server from JWT token
      const result = await post('/api/events', eventForm)
      console.log('Event created:', result)
    }
    
    // Close modal and reload events
    const modalElement = document.getElementById('eventModal')
    const modal = Modal.getInstance(modalElement) || new Modal(modalElement)
    modal.hide()
    resetForm()
    await loadEvents()
    
    // Clear any error
    error.value = null
  } catch (err) {
    console.error('Failed to save event:', err)
    error.value = err.message || `Failed to ${isEditing.value ? 'update' : 'create'} event`
  }
}

// Delete event
const deleteEvent = async (eventId) => {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return
  
  try {
    const result = await deleteApi(`/api/events/${eventId}`)
    console.log('Event deleted:', result)
    
    await loadEvents()
    
    // Clear any error
    error.value = null
  } catch (err) {
    console.error('Failed to delete event:', err)
    error.value = err.message || 'Failed to delete event'
  }
}

// Reset form
const resetForm = () => {
  Object.assign(eventForm, {
    title: '',
    description: '',
    date: '',
    venue: ''
  })
}

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'No date'
  return new Date(dateString).toLocaleString()
}

// Format date for input field (datetime-local)
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:MM
}

// Load events on component mount
onMounted(loadEvents)
</script>

<style scoped>
.card {
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-5px);
}
</style>
