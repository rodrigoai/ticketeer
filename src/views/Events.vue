<template>
  <div class="max-w-6xl mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header class="rounded-3xl bg-white border border-slate-100 px-6 py-6 shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.4em] text-slate-400">Events</p>
        <h1 class="text-3xl font-semibold text-slate-900">Event Management</h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ isAuthenticated ? `${userName || user?.name || 'Organizer'} — ${userEmail || ''}` : 'Authentication required to manage events.' }}
        </p>
      </div>
      <div class="flex gap-3 flex-wrap items-center">
        <button
          v-if="isAuthenticated"
          class="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition"
          @click="showCreateModal"
        >
          <i class="fas fa-plus"></i>
          Create Event
        </button>
        <router-link v-else to="/" class="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
          <i class="fas fa-lock"></i>
          Login to Manage
        </router-link>
      </div>
    </header> 

    <div v-if="!isAuthenticated && !isLoading" class="rounded-3xl border border-amber-300 bg-amber-50 px-6 py-5 text-sm text-amber-700 shadow-sm flex items-start gap-3">
      <i class="fas fa-exclamation-triangle text-amber-600 text-lg mt-0.5"></i>
      <p>Please log in to view and manage your events. You can only create or edit events after authentication.</p>
    </div>

    <section v-if="isAuthenticated" class="space-y-5">
      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 flex items-center justify-between gap-3">
        <div>
          <strong>Error:</strong> {{ error }}
        </div>
        <button class="text-xs font-semibold text-rose-600 underline" @click="loadEvents">Retry</button>
      </div>

      <div v-if="isLoading" class="rounded-3xl border border-slate-100 bg-white px-6 py-8 text-center text-slate-500 shadow-sm">
        <div class="inline-flex items-center gap-2 text-slate-600">
          <span class="w-4 h-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
          Loading events...
        </div>
      </div>

      <div v-else-if="events.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center space-y-3">
        <div class="text-4xl">🎪</div>
        <h3 class="text-xl font-semibold text-slate-900">No events yet</h3>
        <p class="text-sm text-slate-500">Create your first event and start selling tickets in minutes.</p>
        <button class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition" @click="showCreateModal">
          Create Event
        </button>
      </div>

      <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="event in events"
          :key="event.id"
          class="flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden"
        >
          <div class="px-5 py-6 flex-1 space-y-3">
            <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              <span>{{ formatDate(event.date) }}</span>
            </div>
            <div>
              <h3 class="text-2xl font-semibold text-slate-900">{{ event.title }}</h3>
              <p class="text-sm text-slate-500 mt-1 max-h-16 overflow-hidden">{{ event.description || 'No description yet.' }}</p>
            </div>
            <div class="text-sm text-slate-600 flex flex-wrap gap-3 mt-3">
              <span class="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500">
                <i class="fas fa-map-marker-alt"></i>
                {{ event.venue || 'Venue TBD' }}
              </span>
            </div>
          </div>
          <div class="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
            <router-link
              :to="`/events/${event.id}`"
              class="inline-flex items-center justify-center w-full rounded-full border border-emerald-500 bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
            >
              <i class="fas fa-ticket-alt mr-2"></i> Manage Tickets
            </router-link>
            <div class="flex gap-2">
              <button class="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition" @click="editEvent(event)">
                <i class="fas fa-edit mr-2"></i>Edit
              </button>
              <button class="flex-1 rounded-full border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition" @click="deleteEvent(event.id)">
                <i class="fas fa-trash mr-2"></i>Delete
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Bootstrap modal remains unchanged -->
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
