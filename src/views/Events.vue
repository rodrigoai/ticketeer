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

    <div v-if="isEventModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="closeEventModal">
      <div class="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h5 class="text-lg font-semibold text-slate-900">{{ isEditing ? 'Edit Event' : 'Create Event' }}</h5>
          <button class="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100" @click="closeEventModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6">
          <form class="space-y-4" @submit.prevent="saveEvent">
            <div>
              <label for="eventTitle" class="block text-sm font-semibold text-slate-700 mb-2">Title</label>
              <input type="text" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventTitle" v-model="eventForm.title" required>
            </div>
            <div>
              <label for="eventDescription" class="block text-sm font-semibold text-slate-700 mb-2">Description</label>
              <textarea class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventDescription" rows="3" v-model="eventForm.description"></textarea>
            </div>
            <div>
              <label for="eventDate" class="block text-sm font-semibold text-slate-700 mb-2">Date</label>
              <input type="datetime-local" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventDate" v-model="eventForm.date" required>
            </div>
            <div>
              <label for="eventVenue" class="block text-sm font-semibold text-slate-700 mb-2">Venue</label>
              <input type="text" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventVenue" v-model="eventForm.venue" required>
            </div>
            <div>
              <label for="eventImageUrl" class="block text-sm font-semibold text-slate-700 mb-2">Event Image URL</label>
              <input type="url" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventImageUrl" v-model="eventForm.eventImageUrl">
              <p class="mt-2 text-xs text-slate-500">Public image URL displayed on the event landing page.</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Nova.Money Checkout Page</label>
              <select
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                v-model="eventForm.checkoutPageId"
                @change="handleCheckoutSelection"
                :disabled="isLoadingCheckoutPages || Boolean(checkoutPagesError)"
              >
                <option value="">Select a checkout page</option>
                <option
                  v-for="page in checkoutPages"
                  :key="getCheckoutPageId(page)"
                  :value="getCheckoutPageId(page)"
                >
                  {{ getCheckoutPageTitle(page) }}
                </option>
              </select>
              <p class="mt-2 text-xs text-slate-500">This will be used to build the public ticket checkout link.</p>
              <div v-if="isLoadingCheckoutPages" class="text-xs text-slate-500 mt-1">Loading checkout pages...</div>
              <div v-else-if="checkoutPagesError" class="text-xs text-rose-600 mt-1">{{ checkoutPagesError }}</div>
              <div v-else-if="checkoutPages.length === 0" class="text-xs text-slate-500 mt-1">No checkout pages found.</div>
            </div>
          </form>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition" @click="closeEventModal">Cancel</button>
          <button class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-500 transition disabled:opacity-60" @click="saveEvent" :disabled="isLoading">
            {{ isLoading ? 'Saving...' : 'Save Event' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useUser } from '@/composables/useUser'

// API composable
const { isLoading, error, get, post, put, delete: deleteApi } = useApi()

// User composable
const { userId, user, userName, userEmail, isAuthenticated } = useUser()

// Events data
const events = ref([])
const isEditing = ref(false)
const currentEventId = ref(null)
const isEventModalOpen = ref(false)
const checkoutPages = ref([])
const isLoadingCheckoutPages = ref(false)
const checkoutPagesError = ref(null)

// Event form
const eventForm = reactive({
  title: '',
  description: '',
  date: '',
  venue: '',
  eventImageUrl: '',
  checkoutPageId: '',
  checkoutPageTitle: ''
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
const showCreateModal = async () => {
  isEditing.value = false
  currentEventId.value = null
  resetForm()
  await loadCheckoutPages()
  isEventModalOpen.value = true
}

// Edit event
const editEvent = async (event) => {
  isEditing.value = true
  currentEventId.value = event.id
  
  // Map database fields to form fields
  Object.assign(eventForm, {
    title: event.title || event.name,
    description: event.description || '',
    date: event.date ? formatDateForInput(event.date) : '',
    venue: event.venue || '',
    eventImageUrl: event.eventImageUrl || '',
    checkoutPageId: event.checkoutPageId || '',
    checkoutPageTitle: event.checkoutPageTitle || '',
    createdBy: userId
  })

  await loadCheckoutPages()
  
  isEventModalOpen.value = true
}

// Save event
const saveEvent = async () => {
  if (!eventForm.title || !eventForm.date || !eventForm.venue) {
    error.value = 'Please fill in all required fields'
    return
  }

  if (eventForm.checkoutPageId) {
    const selectedPage = checkoutPages.value.find(page => getCheckoutPageId(page) === eventForm.checkoutPageId)
    if (!selectedPage) {
      error.value = 'Please select a valid checkout page'
      return
    }
    eventForm.checkoutPageTitle = getCheckoutPageTitle(selectedPage)
  } else {
    eventForm.checkoutPageTitle = ''
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
    
    closeEventModal()
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
    venue: '',
    eventImageUrl: '',
    checkoutPageId: '',
    checkoutPageTitle: ''
  })
}

const closeEventModal = () => {
  isEventModalOpen.value = false
}

const getCheckoutPageId = (page) => {
  return String(page?.id || page?.checkout_page_id || page?.checkoutPageId || '')
}

const getCheckoutPageTitle = (page) => {
  return page?.page_title || page?.title || page?.checkout_page_title || page?.checkoutPageTitle || 'Untitled'
}

const handleCheckoutSelection = () => {
  if (!eventForm.checkoutPageId) {
    eventForm.checkoutPageTitle = ''
    return
  }
  const selectedPage = checkoutPages.value.find(page => getCheckoutPageId(page) === eventForm.checkoutPageId)
  eventForm.checkoutPageTitle = selectedPage ? getCheckoutPageTitle(selectedPage) : ''
}

const loadCheckoutPages = async () => {
  if (!isAuthenticated.value) return
  isLoadingCheckoutPages.value = true
  checkoutPagesError.value = null

  try {
    const data = await get('/api/nova/checkout-pages')
    checkoutPages.value = data.pages || []
  } catch (err) {
    console.error('Failed to load checkout pages:', err)
    checkoutPages.value = []
    checkoutPagesError.value = err?.data?.message || err?.message || 'Failed to load checkout pages'
  } finally {
    isLoadingCheckoutPages.value = false
  }
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
