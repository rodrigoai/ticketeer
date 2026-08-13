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

      <div v-else class="flex flex-wrap items-center gap-3">
        <button
          class="rounded-full px-4 py-2 text-sm font-semibold transition"
          :class="showPastEvents ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'bg-slate-900 text-white shadow-md hover:bg-slate-800'"
          @click="showPastEvents = false"
        >
          Upcoming Events ({{ upcomingEvents.length }})
        </button>
        <button
          class="rounded-full px-4 py-2 text-sm font-semibold transition"
          :class="showPastEvents ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
          @click="showPastEvents = true"
        >
          Past Events ({{ pastEvents.length }})
        </button>
      </div>

      <div v-if="!isLoading && filteredEvents.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center space-y-3">
        <div class="text-4xl">🎪</div>
        <h3 class="text-xl font-semibold text-slate-900">{{ emptyStateLabel }}</h3>
        <p class="text-sm text-slate-500">
          {{ showPastEvents ? 'Past events appear here once their date has passed.' : 'Create your first event and start selling tickets in minutes.' }}
        </p>
        <button
          v-if="!showPastEvents"
          class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition"
          @click="showCreateModal"
        >
          Create Event
        </button>
      </div>

      <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="event in filteredEvents"
          :key="event.id"
          class="flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden"
        >
          <div class="px-5 py-6 flex-1 space-y-3">
            <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              <span>{{ formatDate(event.date) }}</span>
            </div>
            <div>
              <h3 class="text-2xl font-semibold text-slate-900">{{ event.title }}</h3>
              <div
                v-if="event.description"
                class="rich-text-content event-card-description mt-2 max-h-28 overflow-hidden text-sm text-slate-500"
                v-html="event.description"
              ></div>
              <p v-else class="mt-1 text-sm text-slate-500">No description yet.</p>
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
            <router-link
              :to="`/events/${event.id}/checkin-search`"
              class="inline-flex w-full items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <i class="fas fa-search mr-2"></i>Search Check-in
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

    <Teleport to="body">
      <div v-if="isEventModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="closeEventModal">
        <div class="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <h5 class="text-lg font-semibold text-slate-900">{{ isEditing ? 'Edit Event' : 'Create Event' }}</h5>
            <button class="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100" @click="closeEventModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-6">
            <form class="space-y-4" @submit.prevent="saveEvent">
              <div>
                <label for="eventTitle" class="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input type="text" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventTitle" v-model="eventForm.title" required>
              </div>
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                <RichTextEditor
                  v-model="eventForm.description"
                  placeholder="Write the event description and format it using the toolbar..."
                />
                <p class="mt-2 text-xs leading-5 text-slate-500">The public event page and event cards use this formatting.</p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Additional Information</label>
                <RichTextEditor
                  v-model="eventForm.additionalInformation"
                  aria-label="Additional information"
                  placeholder="Write additional event information and format it using the toolbar..."
                />
                <p class="mt-2 text-xs leading-5 text-slate-500">Shown at the bottom of the public event page.</p>
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
                <p class="mt-2 text-xs text-slate-500">Desktop image URL displayed on the public event landing page.</p>
              </div>
              <div>
                <label for="mobileEventImageUrl" class="block text-sm font-semibold text-slate-700 mb-2">Mobile Event Image URL</label>
                <input type="url" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="mobileEventImageUrl" v-model="eventForm.mobileEventImageUrl">
                <p class="mt-2 text-xs text-slate-500">Mobile-only image URL displayed on phones and small screens.</p>
              </div>
              <div>
                <label for="eventMapUrl" class="block text-sm font-semibold text-slate-700 mb-2">Event Map URL</label>
                <input type="url" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" id="eventMapUrl" v-model="eventForm.eventMapUrl">
                <p class="mt-2 text-xs text-slate-500">Map image shown on the event details page with zoom/fullscreen preview.</p>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Sales Flow</label>
                <div class="grid gap-3 sm:grid-cols-2">
                  <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input v-model="eventForm.saleMode" type="radio" class="mt-1" :value="SALE_MODES.CHECKOUT">
                    <span>
                      <span class="block text-sm font-semibold text-slate-900">Checkout</span>
                      <span class="block text-xs text-slate-500">Current flow with direct Nova.Money checkout page.</span>
                    </span>
                  </label>
                  <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input v-model="eventForm.saleMode" type="radio" class="mt-1" :value="SALE_MODES.SHOPPING_CART">
                    <span>
                      <span class="block text-sm font-semibold text-slate-900">Shopping Cart</span>
                      <span class="block text-xs text-slate-500">Seat selection, customer form, reservation, and cart redirect.</span>
                    </span>
                  </label>
                </div>
              </div>
              <div v-if="eventForm.saleMode === SALE_MODES.CHECKOUT">
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
              <div v-else class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Cart Payment Service ID</label>
                  <input
                    v-model="eventForm.cartPaymentServiceId"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                    placeholder="cf4d85c4-2896-4a77-bda8-a30bb187a592"
                  >
                  <p class="mt-2 text-xs text-slate-500">Used to create Nova.Money carts for this event.</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">Reservation Expiration (minutes)</label>
                  <input
                    v-model.number="eventForm.reservationExpiresInMinutes"
                    type="number"
                    min="1"
                    max="120"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                  >
                  <p class="mt-2 text-xs text-slate-500">Reservations start on Pay and expire automatically if payment is not completed.</p>
                </div>
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
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useUser } from '@/composables/useUser'
import { formatDateTimeLocalInput, serializeDateTimeLocalInput } from '@/utils/dateTime'
import RichTextEditor from '@/components/RichTextEditor.vue'

const SALE_MODES = {
  CHECKOUT: 'checkout',
  SHOPPING_CART: 'shopping_cart'
}

// API composable
const { isLoading, error, get, post, put, delete: deleteApi } = useApi()

// User composable
const { userId, user, userName, userEmail, isAuthenticated } = useUser()

// Events data
const events = ref([])
const showPastEvents = ref(false)
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
  additionalInformation: '',
  date: '',
  venue: '',
  eventImageUrl: '',
  mobileEventImageUrl: '',
  eventMapUrl: '',
  saleMode: SALE_MODES.CHECKOUT,
  checkoutPageId: '',
  checkoutPageTitle: '',
  cartPaymentServiceId: '',
  reservationExpiresInMinutes: 10
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
    additionalInformation: event.additionalInformation || '',
    date: formatDateTimeLocalInput(event.date),
    venue: event.venue || '',
    eventImageUrl: event.eventImageUrl || '',
    mobileEventImageUrl: event.mobileEventImageUrl || '',
    eventMapUrl: event.eventMapUrl || '',
    saleMode: event.saleMode || SALE_MODES.CHECKOUT,
    checkoutPageId: event.checkoutPageId || '',
    checkoutPageTitle: event.checkoutPageTitle || '',
    cartPaymentServiceId: event.cartPaymentServiceId || '',
    reservationExpiresInMinutes: event.reservationExpiresInMinutes || 10,
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

  if (eventForm.saleMode === SALE_MODES.CHECKOUT && eventForm.checkoutPageId) {
    const selectedPage = checkoutPages.value.find(page => getCheckoutPageId(page) === eventForm.checkoutPageId)
    if (!selectedPage) {
      error.value = 'Please select a valid checkout page'
      return
    }
    eventForm.checkoutPageTitle = getCheckoutPageTitle(selectedPage)
  } else if (eventForm.saleMode === SALE_MODES.CHECKOUT) {
    eventForm.checkoutPageTitle = ''
  } else {
    eventForm.checkoutPageId = ''
    eventForm.checkoutPageTitle = ''

    if (!eventForm.cartPaymentServiceId?.trim()) {
      error.value = 'Cart payment service ID is required for shopping cart sales'
      return
    }

    if (!Number.isInteger(Number(eventForm.reservationExpiresInMinutes)) || Number(eventForm.reservationExpiresInMinutes) < 1) {
      error.value = 'Reservation expiration must be at least 1 minute'
      return
    }
  }

  if (!isAuthenticated.value) {
    error.value = 'You must be logged in to create events'
    return
  }
  
  try {
    const payload = {
      ...eventForm,
      date: serializeDateTimeLocalInput(eventForm.date)
    }

    if (isEditing.value) {
      const result = await put(`/api/events/${currentEventId.value}`, payload)
      console.log('Event updated:', result)
    } else {
      // Note: created_by is automatically set by the server from JWT token
      const result = await post('/api/events', payload)
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
    additionalInformation: '',
    date: '',
    venue: '',
    eventImageUrl: '',
    mobileEventImageUrl: '',
    eventMapUrl: '',
    saleMode: SALE_MODES.CHECKOUT,
    checkoutPageId: '',
    checkoutPageTitle: '',
    cartPaymentServiceId: '',
    reservationExpiresInMinutes: 10
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

const resolveEventDate = (event) => {
  return event?.closing_datetime || event?.opening_datetime || event?.date || null
}

const isPastEvent = (event) => {
  const dateValue = resolveEventDate(event)
  if (!dateValue) return false
  const eventTime = new Date(dateValue).getTime()
  if (Number.isNaN(eventTime)) return false
  return eventTime < Date.now()
}

const sortEventsByDate = (list, direction = 'asc') => {
  const multiplier = direction === 'desc' ? -1 : 1
  return list.slice().sort((a, b) => {
    const aTime = new Date(resolveEventDate(a) || 0).getTime()
    const bTime = new Date(resolveEventDate(b) || 0).getTime()
    return (aTime - bTime) * multiplier
  })
}

const pastEvents = computed(() => sortEventsByDate(events.value.filter(isPastEvent), 'desc'))
const upcomingEvents = computed(() => sortEventsByDate(events.value.filter(event => !isPastEvent(event)), 'asc'))
const filteredEvents = computed(() => (showPastEvents.value ? pastEvents.value : upcomingEvents.value))
const emptyStateLabel = computed(() => (showPastEvents.value ? 'No past events yet' : 'No upcoming events yet'))

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'No date'
  return new Date(dateString).toLocaleString()
}

// Load events on component mount
onMounted(loadEvents)
</script>

<style scoped>
.event-card-description {
  position: relative;
}

.event-card-description::after {
  background: linear-gradient(to bottom, transparent, white);
  bottom: 0;
  content: '';
  height: 2rem;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
}

.card {
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-5px);
}
</style>
