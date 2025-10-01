<template>
  <div class="container mt-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading confirmation...</span>
      </div>
      <p class="mt-3">Loading order confirmation...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger">
      <h4>Invalid Confirmation Link</h4>
      <p>{{ error }}</p>
    </div>

    <!-- Completed Order State -->
    <div v-else-if="orderData.isCompleted" class="row justify-content-center">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header bg-success text-white">
            <h3 class="mb-0">✅ Pedido Já Confirmado</h3>
          </div>
          <div class="card-body">
            <!-- Event Info -->
            <div v-if="orderData.event" class="mb-4">
              <h5>{{ orderData.event.name }}</h5>
              <p><strong>Local:</strong> {{ orderData.event.venue }}</p>
              <p><strong>Data:</strong> {{ formatDate(orderData.event.date) }}</p>
            </div>

            <div class="alert alert-info">
              <h5>Informação</h5>
              <p>Este pedido já foi confirmado e os dados dos compradores já foram preenchidos.</p>
            </div>

            <!-- Confirmed Tickets -->
            <div class="mb-4">
              <h6>Ingressos Confirmados ({{ orderData.totalTickets }})</h6>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Descrição</th>
                      <th>Local</th>
                      <th>Mesa</th>
                      <th>Preço</th>
                      <th>Comprador</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ticket in orderData.tickets" :key="ticket.id">
                      <td><strong>{{ ticket.identificationNumber }}</strong></td>
                      <td>{{ ticket.description }}</td>
                      <td>{{ ticket.location || '-' }}</td>
                      <td>{{ ticket.table || '-' }}</td>
                      <td>${{ ticket.price.toFixed(2) }}</td>
                      <td>{{ ticket.buyer }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success State - Confirmation Form -->
    <div v-else class="row justify-content-center">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h3 class="mb-0">Confirmação de Dados dos Ingressos</h3>
          </div>
          <div class="card-body">
            <!-- Event Info -->
            <div v-if="orderData.event" class="mb-4">
              <h5>{{ orderData.event.name }}</h5>
              <p class="text-muted">{{ orderData.event.description }}</p>
              <p><strong>Local:</strong> {{ orderData.event.venue }}</p>
              <p><strong>Data:</strong> {{ formatDate(orderData.event.date) }}</p>
            </div>

            <!-- Confirmation Form -->
            <form @submit.prevent="submitConfirmation" data-confirmation-form>
              <div v-for="(ticket, index) in orderData.tickets" :key="ticket.id" 
                   :data-ticket-index="index" class="mb-4 p-3 border rounded">
                <h6>Ingresso {{ ticket.identificationNumber }} - {{ ticket.description }}</h6>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Nome Completo *</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      name="name"
                      v-model="buyerForms[index].name" 
                      required 
                    />
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">CPF *</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      name="document"
                      v-model="buyerForms[index].document" 
                      @input="formatCPF(index)"
                      required 
                    />
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Email *</label>
                    <input 
                      type="email" 
                      class="form-control" 
                      name="email"
                      v-model="buyerForms[index].email" 
                      required 
                    />
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Telefone</label>
                    <input 
                      type="tel" 
                      class="form-control" 
                      name="phone"
                      v-model="buyerForms[index].phone" 
                    />
                  </div>
                </div>
              </div>

              <!-- Error Messages -->
              <div v-if="validationErrors.length > 0" class="alert alert-danger error-message">
                <ul class="mb-0">
                  <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                </ul>
              </div>

              <!-- Submit Button -->
              <div class="text-center">
                <button 
                  type="submit" 
                  class="btn btn-primary btn-lg"
                  :disabled="isSubmitting"
                >
                  <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                  {{ isSubmitting ? 'Enviando...' : 'Confirmar Dados' }}
                </button>
              </div>
            </form>

            <!-- Success Message -->
            <div v-if="isSuccess" class="alert alert-success success-message mt-3">
              <h5>✅ Confirmação realizada com sucesso!</h5>
              <p>Os dados dos ingressos foram confirmados. Você receberá um email de confirmação em breve.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'

// Route and API setup
const route = useRoute()
const { get, post } = useApi()

// Component state
const isLoading = ref(true)
const isSubmitting = ref(false)
const isSuccess = ref(false)
const error = ref(null)
const orderData = ref({})
const buyerForms = ref([])
const validationErrors = ref([])

// Get confirmation hash from route
const confirmationHash = route.params.hash

// Load order data
const loadOrderData = async () => {
  try {
    isLoading.value = true
    console.log('Making API call to:', `/api/public/orders/${confirmationHash}`)
    const response = await get(`/api/public/orders/${confirmationHash}`)
    console.log('API response received:', response)
    
    // Handle different response structures
    if (response.success && response.order) {
      orderData.value = response.order
    } else if (response.order) {
      orderData.value = response.order
    } else if (response.tickets) {
      // Direct response format
      orderData.value = response
    } else {
      console.error('Unexpected response format:', response)
      throw new Error('Invalid response format from server')
    }
    
    // Initialize forms for each ticket
    const tickets = (response && response.order && response.order.tickets) ? response.order.tickets : (orderData.value?.tickets || [])
    if (!tickets || tickets.length === 0) {
      throw new Error('No tickets found for this confirmation link')
    }
    buyerForms.value = tickets.map(() => ({
      name: '',
      document: '',
      email: '',
      phone: ''
    }))
    
    error.value = null
  } catch (err) {
    console.error('Failed to load confirmation data:', err)
    console.error('Full error details:', {
      message: err.message,
      status: err.status,
      response: err.response
    })
    
    // Provide specific error messages
    if (err.message?.includes('404')) {
      error.value = 'Order not found. This confirmation link may be invalid or expired.'
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
      error.value = 'Cannot connect to server. Please ensure both servers are running on ports 3000 and 5173.'
    } else {
      error.value = err.message || 'Invalid confirmation link'
    }
  } finally {
    isLoading.value = false
  }
}

// Submit confirmation
const submitConfirmation = async () => {
  try {
    isSubmitting.value = true
    validationErrors.value = []
    
    // Prepare submission data
    const submissionData = {
      buyers: buyerForms.value.map((form, index) => ({
        ticketId: orderData.value.tickets[index].id,
        ...form
      }))
    }
    
    await post(`/api/public/orders/${confirmationHash}/buyers`, submissionData)
    
    // Show success state
    isSuccess.value = true
    
  } catch (err) {
    console.error('Confirmation submission failed:', err)
    if (err.details && Array.isArray(err.details)) {
      validationErrors.value = err.details
    } else {
      validationErrors.value = [err.message || 'Erro na confirmação dos dados']
    }
  } finally {
    isSubmitting.value = false
  }
}

// Format CPF input
const formatCPF = (index) => {
  let value = buyerForms.value[index].document.replace(/\D/g, '')
  if (value.length <= 11) {
    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    buyerForms.value[index].document = value
  }
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('pt-BR')
}

// Load data on mount
onMounted(() => {
  if (confirmationHash) {
    loadOrderData()
  } else {
    error.value = 'No confirmation hash provided'
    isLoading.value = false
  }
})
</script>

<style scoped>
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
  border-bottom: none;
}

.border {
  border-color: #e9ecef !important;
}

.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
}

.btn-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.btn-primary:hover {
  background-color: #0b5ed7;
  border-color: #0a58ca;
}
</style>