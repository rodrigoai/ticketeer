<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent align-[-0.125em]" role="status">
        <span class="sr-only">Loading confirmation...</span>
      </div>
      <p class="mt-4 text-slate-500 font-medium">Loading order confirmation...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-6 border border-red-100 text-center">
      <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
      </div>
      <h4 class="text-lg font-bold text-red-800 mb-2">Invalid Confirmation Link</h4>
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- Completed Order State -->
    <div v-else-if="orderData.isCompleted" class="max-w-3xl mx-auto">
      <div class="bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
          <div class="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <i class="fas fa-check"></i>
          </div>
          <h3 class="text-lg font-bold text-emerald-800 m-0">Pedido Já Confirmado</h3>
        </div>
        
        <div class="p-6 md:p-8 space-y-8">
          <!-- Event Info -->
          <div v-if="orderData.event" class="text-center md:text-left border-b border-slate-100 pb-6">
            <h5 class="text-2xl font-bold text-slate-900 mb-2">{{ orderData.event.name }}</h5>
            <div class="flex flex-col md:flex-row gap-4 text-slate-500 text-sm">
              <div class="flex items-center gap-2">
                <i class="fas fa-map-marker-alt text-slate-400 w-4"></i>
                <strong>Local:</strong> {{ orderData.event.venue }}
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-calendar-alt text-slate-400 w-4"></i>
                <strong>Data:</strong> {{ formatDate(orderData.event.date) }}
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-sky-50 p-4 border border-sky-100 flex gap-3">
             <i class="fas fa-info-circle text-sky-500 mt-0.5"></i>
             <div>
               <h5 class="font-semibold text-sky-800 text-sm mb-1">Informação</h5>
               <p class="text-sky-700 text-sm">Este pedido já foi confirmado e os dados dos compradores já foram preenchidos.</p>
             </div>
          </div>

          <!-- Confirmed Tickets -->
          <div>
            <h6 class="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-3">
              Ingressos Confirmados ({{ orderData.totalTickets }})
            </h6>
            <div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th class="px-4 py-3 border-b border-slate-200">#</th>
                    <th class="px-4 py-3 border-b border-slate-200">Descrição</th>
                    <th class="px-4 py-3 border-b border-slate-200">Local</th>
                    <th class="px-4 py-3 border-b border-slate-200">Mesa</th>
                    <th class="px-4 py-3 border-b border-slate-200">Preço</th>
                    <th class="px-4 py-3 border-b border-slate-200">Comprador</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr v-for="ticket in orderData.tickets" :key="ticket.id" class="hover:bg-slate-50/50 transition">
                    <td class="px-4 py-3 font-mono text-slate-900 font-medium">{{ ticket.identificationNumber }}</td>
                    <td class="px-4 py-3">{{ ticket.description }}</td>
                    <td class="px-4 py-3">{{ ticket.location || '-' }}</td>
                    <td class="px-4 py-3">{{ ticket.table || '-' }}</td>
                    <td class="px-4 py-3 font-mono text-slate-900">${{ ticket.price.toFixed(2) }}</td>
                    <td class="px-4 py-3 font-medium text-slate-900">{{ ticket.buyer }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success State - Confirmation Form -->
    <div v-else class="max-w-3xl mx-auto">
      <div class="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <h3 class="text-lg font-bold m-0 flex items-center gap-2">
            <i class="fas fa-ticket-alt text-primary-400"></i>
            Confirmação de Dados dos Ingressos
          </h3>
        </div>
        
        <div class="p-6 md:p-8">
          <!-- Event Info -->
          <div v-if="orderData.event" class="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <h5 class="text-2xl font-bold text-slate-900 mb-2">{{ orderData.event.name }}</h5>
            <p class="text-slate-600 mb-4">{{ orderData.event.description }}</p>
            <div class="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-slate-500">
              <div class="flex items-center gap-2">
                <i class="fas fa-map-marker-alt text-primary-500"></i>
                <span><strong>Local:</strong> {{ orderData.event.venue }}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-calendar-alt text-primary-500"></i>
                <span><strong>Data:</strong> {{ formatDate(orderData.event.date) }}</span>
              </div>
            </div>
          </div>

          <!-- Confirmation Form -->
          <form @submit.prevent="submitConfirmation" data-confirmation-form class="space-y-6">
            <div v-for="(ticket, index) in orderData.tickets" :key="ticket.id" 
                 :data-ticket-index="index" 
                 class="relative p-6 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition bg-white"
            >
              <div class="absolute -top-3 left-6 px-3 bg-white text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                 <i class="fas fa-ticket-alt"></i> Ingresso {{ ticket.identificationNumber }}
              </div>
              
              <h6 class="font-semibold text-slate-900 mb-4 text-lg">{{ ticket.description }}</h6>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-700">Nome Completo <span class="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    class="block w-full rounded-xl border-slate-200 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500 transition shadow-sm"
                    name="name"
                    v-model="buyerForms[index].name" 
                    required 
                    placeholder="Nome do titular"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-700">CPF <span class="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    class="block w-full rounded-xl border-slate-200 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500 transition shadow-sm"
                    name="document"
                    v-model="buyerForms[index].document" 
                    @input="formatCPF(index)"
                    required 
                    placeholder="000.000.000-00"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-700">Email <span class="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    class="block w-full rounded-xl border-slate-200 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500 transition shadow-sm"
                    name="email"
                    v-model="buyerForms[index].email" 
                    required 
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-700">Telefone</label>
                  <input 
                    type="tel" 
                    class="block w-full rounded-xl border-slate-200 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500 transition shadow-sm"
                    name="phone"
                    v-model="buyerForms[index].phone" 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <!-- Error Messages -->
            <div v-if="validationErrors.length > 0" class="rounded-xl bg-red-50 p-4 border border-red-100 text-red-700 error-message animate-shake">
              <div class="flex items-start gap-3">
                <i class="fas fa-exclamation-circle mt-1"></i>
                <ul class="list-disc list-inside text-sm space-y-1">
                  <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                </ul>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-4 text-center">
              <button 
                type="submit" 
                class="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-primary-500 hover:scale-105 active:scale-95 transition disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting" class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                {{ isSubmitting ? 'Enviando...' : 'Confirmar Dados' }}
                <i v-if="!isSubmitting" class="fas fa-paper-plane"></i>
              </button>
            </div>
          </form>

          <!-- Success Message -->
          <div v-if="isSuccess" class="mt-8 rounded-2xl bg-emerald-50 p-6 border border-emerald-100 text-emerald-800 success-message text-center animate-fade-in">
            <div class="h-16 w-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 text-2xl">
              <i class="fas fa-check"></i>
            </div>
            <h5 class="text-xl font-bold mb-2">Confirmação realizada com sucesso!</h5>
            <p class="text-emerald-700">Os dados dos ingressos foram confirmados. Você receberá um email de confirmação em breve.</p>
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
    
    // Handle different error formats
    if (err.data && err.data.message) {
      // Server returned structured error with message
      validationErrors.value = [err.data.message]
    } else if (err.message) {
      // Generic error message
      validationErrors.value = [err.message]
    } else {
      validationErrors.value = ['Erro na confirmação dos dados. Por favor, verifique os campos.']
    }
    
    // Scroll to error message
    setTimeout(() => {
      const errorElement = document.querySelector('.error-message')
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
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
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>