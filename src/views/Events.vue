<template>
  <div class="container py-5">
    <div class="row">
      <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Events Management</h2>
          <button class="btn btn-primary" @click="showCreateModal">
            <i class="fas fa-plus"></i> Create Event
          </button>
        </div>
      </div>
    </div>

    <!-- Events List -->
    <div class="row">
      <div class="col-12">
        <div v-if="isLoading" class="text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading events...</span>
          </div>
        </div>

        <div v-else-if="events.length === 0" class="text-center py-5">
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
                <div class="mb-3">
                  <small class="text-muted">
                    <i class="fas fa-dollar-sign"></i> ${{ event.price }}
                  </small>
                </div>
              </div>
              <div class="card-footer">
                <div class="btn-group w-100" role="group">
                  <button class="btn btn-outline-primary btn-sm" @click="editEvent(event)">
                    Edit
                  </button>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteEvent(event.id)">
                    Delete
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
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="eventDate" class="form-label">Date</label>
                    <input type="datetime-local" class="form-control" id="eventDate" v-model="eventForm.date" required>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="eventPrice" class="form-label">Price</label>
                    <input type="number" step="0.01" class="form-control" id="eventPrice" v-model="eventForm.price" required>
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

// API composable
const { isLoading, error, get, post, put, delete: deleteApi } = useApi()

// Events data
const events = ref([])
const isEditing = ref(false)
const currentEventId = ref(null)

// Event form
const eventForm = reactive({
  title: '',
  description: '',
  date: '',
  venue: '',
  price: 0
})

// Load events
const loadEvents = async () => {
  try {
    const data = await get('/api/events')
    events.value = data.events || []
  } catch (err) {
    console.error('Failed to load events:', err)
    events.value = []
  }
}

// Show create modal
const showCreateModal = () => {
  isEditing.value = false
  currentEventId.value = null
  resetForm()
  const modal = new bootstrap.Modal(document.getElementById('eventModal'))
  modal.show()
}

// Edit event
const editEvent = (event) => {
  isEditing.value = true
  currentEventId.value = event.id
  Object.assign(eventForm, event)
  const modal = new bootstrap.Modal(document.getElementById('eventModal'))
  modal.show()
}

// Save event
const saveEvent = async () => {
  try {
    if (isEditing.value) {
      await put(`/api/events/${currentEventId.value}`, eventForm)
    } else {
      await post('/api/events', eventForm)
    }
    
    // Close modal and reload events
    const modal = bootstrap.Modal.getInstance(document.getElementById('eventModal'))
    modal.hide()
    await loadEvents()
  } catch (err) {
    console.error('Failed to save event:', err)
  }
}

// Delete event
const deleteEvent = async (eventId) => {
  if (!confirm('Are you sure you want to delete this event?')) return
  
  try {
    await deleteApi(`/api/events/${eventId}`)
    await loadEvents()
  } catch (err) {
    console.error('Failed to delete event:', err)
  }
}

// Reset form
const resetForm = () => {
  Object.assign(eventForm, {
    title: '',
    description: '',
    date: '',
    venue: '',
    price: 0
  })
}

// Format date for display
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
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
