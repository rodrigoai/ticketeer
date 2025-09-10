<template>
  <div class="container py-5">
    <!-- Loading State -->
    <div v-if="isLoadingEvent" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading event...</span>
      </div>
    </div>

    <!-- Event Not Found -->
    <div v-else-if="!event" class="text-center py-5">
      <div class="mb-4">
        <span class="display-1">❌</span>
      </div>
      <h4>Event Not Found</h4>
      <p class="text-muted">The event you're looking for doesn't exist or you don't have access to it.</p>
      <router-link to="/events" class="btn btn-primary">Back to Events</router-link>
    </div>

    <!-- Event Detail -->
    <div v-else>
      <!-- Event Header -->
      <div class="row mb-4">
        <div class="col-12">
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <router-link to="/events">Events</router-link>
              </li>
              <li class="breadcrumb-item active">{{ event.title }}</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h1>{{ event.title }}</h1>
              <p class="text-muted mb-2" v-if="event.description">{{ event.description }}</p>
              <div class="d-flex gap-3 text-muted">
                <span><i class="fas fa-calendar"></i> {{ formatDate(event.date) }}</span>
                <span v-if="event.venue"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
              </div>
            </div>
            <div class="text-end">
              <router-link :to="`/events`" class="btn btn-outline-secondary me-2">
                <i class="fas fa-arrow-left"></i> Back
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Statistics -->
      <div class="row mb-4" v-if="stats">
        <div class="col-12">
          <div class="row">
            <div class="col-md-3 col-sm-6 mb-3">
              <div class="card bg-primary text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">{{ stats.totalTickets }}</h5>
                  <p class="card-text mb-0">Total Tickets</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
              <div class="card bg-success text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">${{ stats.totalRevenue.toFixed(2) }}</h5>
                  <p class="card-text mb-0">Total Revenue</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
              <div class="card bg-info text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">${{ stats.averagePrice.toFixed(2) }}</h5>
                  <p class="card-text mb-0">Average Price</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
              <div class="card bg-warning text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">${{ stats.minPrice.toFixed(2) }} - ${{ stats.maxPrice.toFixed(2) }}</h5>
                  <p class="card-text mb-0">Price Range</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Management -->
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Tickets</h3>
            <div>
              <button class="btn btn-success me-2" @click="showCreateModal">
                <i class="fas fa-plus"></i> Add Ticket
              </button>
              <button class="btn btn-info" @click="showBatchCreateModal">
                <i class="fas fa-layer-group"></i> Batch Create
              </button>
            </div>
          </div>

          <!-- Tickets Loading -->
          <div v-if="isLoadingTickets" class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading tickets...</span>
            </div>
          </div>

          <!-- No Tickets -->
          <div v-else-if="tickets.length === 0" class="text-center py-5">
            <div class="mb-4">
              <span class="display-1">🎟️</span>
            </div>
            <h4>No Tickets Yet</h4>
            <p class="text-muted">Create your first ticket for this event!</p>
            <button class="btn btn-success me-2" @click="showCreateModal">Create Ticket</button>
            <button class="btn btn-info" @click="showBatchCreateModal">Batch Create</button>
          </div>

          <!-- Tickets Table -->
          <div v-else class="table-responsive">
            <table class="table table-striped">
              <thead class="table-dark">
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Table</th>
                  <th>Price</th>
                  <th>Buyer</th>
                  <th>Email</th>
                  <th>Sales End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ticket in tickets" :key="ticket.id">
                  <td><strong>{{ ticket.identificationNumber }}</strong></td>
                  <td>{{ ticket.description }}</td>
                  <td>{{ ticket.location || '-' }}</td>
                  <td>{{ ticket.table || '-' }}</td>
                  <td>${{ ticket.price.toFixed(2) }}</td>
                  <td>{{ ticket.buyer || '-' }}</td>
                  <td>{{ ticket.buyerEmail || '-' }}</td>
                  <td>{{ ticket.salesEndDateTime ? formatDate(ticket.salesEndDateTime) : '-' }}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" @click="editTicket(ticket)" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-outline-danger" @click="deleteTicket(ticket.id)" title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div v-if="error" class="alert alert-danger mt-3" role="alert">
        <strong>Error:</strong> {{ error }}
        <button class="btn btn-sm btn-outline-danger ms-2" @click="loadTickets">Retry</button>
      </div>
    </div>

    <!-- Create/Edit Ticket Modal -->
    <div class="modal fade" id="ticketModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditingTicket ? 'Edit Ticket' : 'Create Ticket' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveTicket">
              <div class="mb-3">
                <label for="ticketDescription" class="form-label">Description *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketDescription" 
                  v-model="ticketForm.description" 
                  required
                >
              </div>
              <div class="mb-3">
                <label for="ticketPrice" class="form-label">Price *</label>
                <div class="input-group">
                  <span class="input-group-text">$</span>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="ticketPrice" 
                    v-model="ticketForm.price" 
                    step="0.01" 
                    min="0"
                    required
                  >
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="ticketLocation" class="form-label">Location</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="ticketLocation" 
                      v-model="ticketForm.location"
                    >
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="ticketTable" class="form-label">Table</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      id="ticketTable" 
                      v-model="ticketForm.table" 
                      min="1"
                    >
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="ticketBuyer" class="form-label">Buyer</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketBuyer" 
                  v-model="ticketForm.buyer"
                >
              </div>
              <div class="mb-3">
                <label for="ticketBuyerDocument" class="form-label">Buyer Document</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketBuyerDocument" 
                  v-model="ticketForm.buyerDocument"
                >
              </div>
              <div class="mb-3">
                <label for="ticketBuyerEmail" class="form-label">Buyer Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="ticketBuyerEmail" 
                  v-model="ticketForm.buyerEmail"
                >
              </div>
              <div class="mb-3">
                <label for="ticketOrder" class="form-label">Order</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketOrder" 
                  v-model="ticketForm.order"
                >
              </div>
              <div class="mb-3">
                <label for="ticketSalesEndDateTime" class="form-label">Sales End Date & Time</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="ticketSalesEndDateTime" 
                  v-model="ticketForm.salesEndDateTime"
                >
                <div class="form-text">Optional: Set when ticket sales should end</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveTicket" :disabled="isLoading">
              {{ isLoading ? 'Saving...' : 'Save Ticket' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Create Modal -->
    <div class="modal fade" id="batchModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Batch Create Tickets</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveBatchTickets">
              <div class="mb-3">
                <label for="batchDescription" class="form-label">Description *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchDescription" 
                  v-model="batchForm.description" 
                  required
                >
              </div>
              <div class="mb-3">
                <label for="batchPrice" class="form-label">Price *</label>
                <div class="input-group">
                  <span class="input-group-text">$</span>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="batchPrice" 
                    v-model="batchForm.price" 
                    step="0.01" 
                    min="0"
                    required
                  >
                </div>
              </div>
              <div class="mb-3">
                <label for="batchQuantity" class="form-label">Quantity *</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="batchQuantity" 
                  v-model="batchForm.quantity" 
                  min="1" 
                  max="100"
                  required
                >
                <div class="form-text">Create between 1 and 100 tickets at once</div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="batchLocation" class="form-label">Location</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="batchLocation" 
                      v-model="batchForm.location"
                    >
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="batchTable" class="form-label">Table</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      id="batchTable" 
                      v-model="batchForm.table" 
                      min="1"
                    >
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="batchBuyer" class="form-label">Buyer</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchBuyer" 
                  v-model="batchForm.buyer"
                >
              </div>
              <div class="mb-3">
                <label for="batchBuyerDocument" class="form-label">Buyer Document</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchBuyerDocument" 
                  v-model="batchForm.buyerDocument"
                >
              </div>
              <div class="mb-3">
                <label for="batchBuyerEmail" class="form-label">Buyer Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="batchBuyerEmail" 
                  v-model="batchForm.buyerEmail"
                >
              </div>
              <div class="mb-3">
                <label for="batchOrder" class="form-label">Order</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchOrder" 
                  v-model="batchForm.order"
                >
              </div>
              <div class="mb-3">
                <label for="batchSalesEndDateTime" class="form-label">Sales End Date & Time</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="batchSalesEndDateTime" 
                  v-model="batchForm.salesEndDateTime"
                >
                <div class="form-text">Optional: Set when ticket sales should end (applies to all tickets)</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-info" @click="saveBatchTickets" :disabled="isLoading">
              {{ isLoading ? 'Creating...' : `Create ${batchForm.quantity || 0} Tickets` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useUser } from '@/composables/useUser'
import { Modal } from 'bootstrap'

// Props and route
const route = useRoute()
const eventId = computed(() => route.params.id)

// Composables
const { isLoading, error, get, post, put, delete: deleteApi } = useApi()
const { isAuthenticated } = useUser()

// Data
const event = ref(null)
const tickets = ref([])
const stats = ref(null)
const isLoadingEvent = ref(false)
const isLoadingTickets = ref(false)
const isEditingTicket = ref(false)
const currentTicketId = ref(null)

// Forms
const ticketForm = reactive({
  description: '',
  location: '',
  table: null,
  price: 0,
  buyer: '',
  buyerDocument: '',
  buyerEmail: '',
  order: '',
  salesEndDateTime: ''
})

const batchForm = reactive({
  description: '',
  location: '',
  table: null,
  price: 0,
  quantity: 1,
  buyer: '',
  buyerDocument: '',
  buyerEmail: '',
  order: '',
  salesEndDateTime: ''
})

// Bootstrap modals
let ticketModal = null
let batchModal = null

// Load event data
const loadEvent = async () => {
  try {
    isLoadingEvent.value = true
    const data = await get(`/api/events/${eventId.value}`)
    
    if (data.success && data.event) {
      event.value = data.event
    } else {
      event.value = null
    }
  } catch (err) {
    console.error('Failed to load event:', err)
    event.value = null
  } finally {
    isLoadingEvent.value = false
  }
}

// Load tickets
const loadTickets = async () => {
  try {
    isLoadingTickets.value = true
    const data = await get(`/api/events/${eventId.value}/tickets`)
    
    tickets.value = data.tickets || []
    error.value = null
  } catch (err) {
    console.error('Failed to load tickets:', err)
    tickets.value = []
    error.value = err.message || 'Failed to load tickets'
  } finally {
    isLoadingTickets.value = false
  }
}

// Load statistics
const loadStats = async () => {
  try {
    const data = await get(`/api/events/${eventId.value}/tickets/stats`)
    stats.value = data.stats || null
  } catch (err) {
    console.error('Failed to load stats:', err)
    stats.value = null
  }
}

// Show create modal
const showCreateModal = () => {
  isEditingTicket.value = false
  currentTicketId.value = null
  resetTicketForm()
  
  if (!ticketModal) {
    ticketModal = new Modal(document.getElementById('ticketModal'))
  }
  ticketModal.show()
}

// Show batch create modal
const showBatchCreateModal = () => {
  resetBatchForm()
  
  if (!batchModal) {
    batchModal = new Modal(document.getElementById('batchModal'))
  }
  batchModal.show()
}

// Edit ticket
const editTicket = (ticket) => {
  isEditingTicket.value = true
  currentTicketId.value = ticket.id
  
  // Populate form
  Object.assign(ticketForm, {
    description: ticket.description || '',
    location: ticket.location || '',
    table: ticket.table || null,
    price: ticket.price || 0,
    buyer: ticket.buyer || '',
    buyerDocument: ticket.buyerDocument || '',
    buyerEmail: ticket.buyerEmail || '',
    order: ticket.order || '',
    salesEndDateTime: ticket.salesEndDateTime ? new Date(ticket.salesEndDateTime).toISOString().slice(0, 16) : ''
  })
  
  if (!ticketModal) {
    ticketModal = new Modal(document.getElementById('ticketModal'))
  }
  ticketModal.show()
}

// Save ticket
const saveTicket = async () => {
  if (!ticketForm.description || !ticketForm.price) {
    error.value = 'Description and price are required'
    return
  }
  
  try {
    let result
    if (isEditingTicket.value) {
      result = await put(`/api/tickets/${currentTicketId.value}`, ticketForm)
    } else {
      result = await post(`/api/events/${eventId.value}/tickets`, ticketForm)
    }
    
    console.log('Ticket saved:', result)
    
    // Close modal and reload
    if (ticketModal) ticketModal.hide()
    resetTicketForm()
    await loadTickets()
    await loadStats()
    
    error.value = null
  } catch (err) {
    console.error('Failed to save ticket:', err)
    error.value = err.message || 'Failed to save ticket'
  }
}

// Save batch tickets
const saveBatchTickets = async () => {
  if (!batchForm.description || !batchForm.price || !batchForm.quantity) {
    error.value = 'Description, price, and quantity are required'
    return
  }
  
  try {
    const result = await post(`/api/events/${eventId.value}/tickets/batch`, batchForm)
    console.log('Batch tickets created:', result)
    
    // Close modal and reload
    if (batchModal) batchModal.hide()
    resetBatchForm()
    await loadTickets()
    await loadStats()
    
    error.value = null
  } catch (err) {
    console.error('Failed to create batch tickets:', err)
    error.value = err.message || 'Failed to create tickets'
  }
}

// Delete ticket
const deleteTicket = async (ticketId) => {
  if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
    return
  }
  
  try {
    await deleteApi(`/api/tickets/${ticketId}`)
    await loadTickets()
    await loadStats()
    error.value = null
  } catch (err) {
    console.error('Failed to delete ticket:', err)
    error.value = err.message || 'Failed to delete ticket'
  }
}

// Reset forms
const resetTicketForm = () => {
  Object.assign(ticketForm, {
    description: '',
    location: '',
    table: null,
    price: 0,
    buyer: '',
    buyerDocument: '',
    buyerEmail: '',
    order: '',
    salesEndDateTime: ''
  })
}

const resetBatchForm = () => {
  Object.assign(batchForm, {
    description: '',
    location: '',
    table: null,
    price: 0,
    quantity: 1,
    buyer: '',
    buyerDocument: '',
    buyerEmail: '',
    order: '',
    salesEndDateTime: ''
  })
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'No date'
  return new Date(dateString).toLocaleString()
}

// Load data on mount
onMounted(async () => {
  if (isAuthenticated.value) {
    await Promise.all([
      loadEvent(),
      loadTickets(),
      loadStats()
    ])
  }
})
</script>

<style scoped>
.breadcrumb {
  background: none;
  padding: 0;
}

.table th {
  font-weight: 600;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
}

.card {
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
}

.table-responsive {
  border-radius: 0.375rem;
  overflow: hidden;
}

.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
