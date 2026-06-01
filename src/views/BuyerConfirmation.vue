<template>
  <div class="min-h-screen bg-slate-50 pb-36 lg:pb-16">
    <!-- Loading State -->
    <div v-if="isLoading" class="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
      <div class="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-md">
        <div class="inline-flex items-center gap-2 text-slate-600">
          <span class="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
          Carregando confirmação...
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
      <div class="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
        <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <i class="fas fa-exclamation-triangle text-xl text-red-600"></i>
        </div>
        <h4 class="mb-2 text-lg font-bold text-red-800">Link de confirmação inválido</h4>
        <p>{{ error }}</p>
      </div>
    </div>

    <template v-else>
      <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start">
        <div class="min-w-0 flex-1 space-y-8">
          <section class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg">
            <picture v-if="heroImageUrl">
              <source v-if="desktopHeroImageUrl" media="(min-width: 640px)" :srcset="desktopHeroImageUrl">
              <img
                :src="mobileHeroImageUrl || desktopHeroImageUrl"
                :alt="orderData.event?.name || 'Evento'"
                class="h-72 w-full object-cover"
              >
            </picture>
            <div v-else class="flex h-48 w-full items-center justify-center bg-slate-900 text-white">
              <i class="fas fa-ticket-alt text-4xl text-white/70"></i>
            </div>

            <div class="space-y-4 p-6">
              <div class="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span>Confirmação</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-[0.65rem] text-slate-600">
                  {{ orderData.totalTickets }} ingresso(s)
                </span>
              </div>
              <div>
                <h1 class="text-3xl font-semibold text-slate-900">{{ orderData.event?.name }}</h1>
                <p v-if="orderData.event?.description" class="mt-2 text-slate-500">{{ orderData.event.description }}</p>
              </div>
              <div class="flex flex-wrap gap-4 text-sm text-slate-600">
                <span class="inline-flex items-center gap-2"><i class="fas fa-calendar"></i> {{ formatDate(orderData.event?.date) }}</span>
                <span v-if="orderData.event?.venue" class="inline-flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> {{ orderData.event.venue }}</span>
              </div>
            </div>
          </section>

          <!-- Completed Order State -->
          <section v-if="orderData.isCompleted" class="space-y-6">
            <div class="rounded-3xl border border-emerald-100 bg-emerald-50 px-6 py-5 text-emerald-800">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <i class="fas fa-check"></i>
                </div>
                <div>
                  <h2 class="text-xl font-semibold">Pedido já confirmado</h2>
                  <p class="mt-1 text-sm text-emerald-700">Os dados dos compradores já foram preenchidos para este pedido.</p>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-slate-900">Ingressos confirmados</h2>
                <span class="text-xs text-slate-500">{{ orderData.totalTickets }} ingresso(s)</span>
              </div>
              <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div
                  v-for="ticket in orderData.tickets"
                  :key="ticket.id"
                  class="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Ingresso #{{ ticket.identificationNumber }}</p>
                    <h3 class="mt-1 text-lg font-semibold text-slate-900">{{ ticket.description }}</h3>
                    <p class="text-sm text-slate-500">
                      <span v-if="ticket.location">{{ ticket.location }}</span>
                      <span v-if="ticket.location && ticket.table"> • </span>
                      <span v-if="ticket.table">Mesa {{ ticket.table }}</span>
                    </p>
                  </div>
                  <div class="text-sm font-semibold text-emerald-700">{{ ticket.buyer || 'Preenchido' }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Success Message -->
          <section v-else-if="isSuccess" class="rounded-3xl border border-emerald-100 bg-white px-6 py-10 text-center shadow-sm animate-fade-in">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              <i class="fas fa-check"></i>
            </div>
            <h2 class="text-2xl font-semibold text-slate-900">Confirmação realizada com sucesso</h2>
            <p class="mx-auto mt-2 max-w-xl text-slate-500">Os dados dos ingressos foram confirmados. Você receberá um email de confirmação em breve.</p>
          </section>

          <!-- Confirmation Form -->
          <section v-else class="space-y-6">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">Dados dos titulares</h2>
              <p class="mt-1 text-sm text-slate-500">Preencha os dados de cada ingresso antes de salvar a confirmação.</p>
            </div>

            <form id="buyer-confirmation-form" @submit.prevent="submitConfirmation" data-confirmation-form class="space-y-5">
              <div
                v-for="(ticket, index) in orderData.tickets"
                :key="ticket.id"
                :data-ticket-index="index"
                class="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Ingresso #{{ ticket.identificationNumber }}</p>
                    <h3 class="mt-1 text-lg font-semibold text-slate-900">{{ ticket.description }}</h3>
                    <p class="text-sm text-slate-500">
                      <span v-if="ticket.location">{{ ticket.location }}</span>
                      <span v-if="ticket.location && ticket.table"> • </span>
                      <span v-if="ticket.table">Mesa {{ ticket.table }}</span>
                    </p>
                  </div>
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {{ formatCurrency(ticket.price) }}
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="block text-sm font-semibold text-slate-700">Nome Completo <span class="text-red-500">*</span></label>
                    <input
                      type="text"
                      class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
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
                      class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
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
                      class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
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
                      class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                      name="phone"
                      v-model="buyerForms[index].phone"
                      @input="formatPhone(index)"
                      maxlength="15"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <!-- Error Messages -->
              <div v-if="validationErrors.length > 0" class="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 error-message animate-shake">
                <div class="flex items-start gap-3">
                  <i class="fas fa-exclamation-circle mt-1"></i>
                  <ul class="list-disc list-inside space-y-1 text-sm">
                    <li v-for="validationError in validationErrors" :key="validationError">{{ validationError }}</li>
                  </ul>
                </div>
              </div>

              <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>Reúna todos os dados antes de salvar.</strong> Depois da confirmação, alterações exigem contato com o suporte.
              </div>

              <!-- Submit Button -->
              <div class="hidden pt-2 text-center lg:block">
                <button
                  type="submit"
                  class="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-md transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                  :disabled="!canSubmitConfirmation"
                >
                  <span v-if="isSubmitting" class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  {{ isSubmitting ? 'Enviando...' : 'Confirmar dados' }}
                  <i v-if="!isSubmitting" class="fas fa-paper-plane"></i>
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside class="w-full shrink-0 lg:sticky lg:top-6 lg:w-[360px]">
          <div class="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">Resumo</h2>
              <p class="mt-1 text-sm text-slate-500">Confira o pedido antes de enviar os dados dos titulares.</p>
            </div>
            <div class="space-y-3">
              <div
                v-for="ticket in orderData.tickets"
                :key="`summary-${ticket.id}`"
                class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ ticket.description }}</p>
                    <p class="text-xs text-slate-500">Ingresso #{{ ticket.identificationNumber }}</p>
                  </div>
                  <p class="text-sm font-semibold text-slate-700">{{ formatCurrency(ticket.price) }}</p>
                </div>
              </div>
            </div>
            <div class="border-t border-slate-100 pt-4">
              <div class="flex items-center justify-between text-sm text-slate-500">
                <span>Total de ingressos</span>
                <span class="font-semibold text-slate-900">{{ orderData.totalTickets }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between text-base">
                <span class="font-semibold text-slate-900">Total</span>
                <span class="font-semibold text-slate-900">{{ formatCurrency(orderTotal) }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Teleport to="body">
        <div
          v-if="showMobileConfirmationBar"
          class="lg:hidden"
        >
          <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4">
            <div class="pointer-events-auto rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
              <div class="mb-3">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Confirmação</p>
                    <p class="text-sm font-semibold text-slate-900">
                      {{ filledTicketCount }} de {{ totalTicketCount }} ingresso(s) preenchido(s)
                    </p>
                  </div>
                  <span class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {{ ticketsLeftToFill === 0 ? 'Pronto' : `Faltam ${ticketsLeftToFill}` }}
                  </span>
                </div>
                <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-primary-600 transition-all"
                    :style="{ width: `${confirmationProgress}%` }"
                  ></div>
                </div>
              </div>
              <button
                type="submit"
                form="buyer-confirmation-form"
                class="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                :class="canSubmitConfirmation ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500'"
                :disabled="!canSubmitConfirmation"
              >
                <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <i v-else class="fas fa-check"></i>
                {{ isSubmitting ? 'Enviando...' : 'Confirmar dados' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { formatPhoneMask } from '@/utils/cart'

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

const desktopHeroImageUrl = computed(() => {
  return orderData.value?.event?.eventImageUrl || orderData.value?.event?.mobileEventImageUrl || ''
})

const mobileHeroImageUrl = computed(() => {
  return orderData.value?.event?.mobileEventImageUrl || orderData.value?.event?.eventImageUrl || ''
})

const heroImageUrl = computed(() => {
  return mobileHeroImageUrl.value || desktopHeroImageUrl.value
})

const orderTotal = computed(() => {
  return (orderData.value?.tickets || []).reduce((sum, ticket) => sum + (Number(ticket.price) || 0), 0)
})

const totalTicketCount = computed(() => orderData.value?.tickets?.length || 0)

const hasRequiredBuyerData = (form = {}) => {
  return Boolean(
    String(form.name || '').trim() &&
    String(form.document || '').replace(/\D/g, '').length === 11 &&
    String(form.email || '').trim()
  )
}

const filledTicketCount = computed(() => {
  return buyerForms.value.filter((form) => hasRequiredBuyerData(form)).length
})

const ticketsLeftToFill = computed(() => {
  return Math.max(totalTicketCount.value - filledTicketCount.value, 0)
})

const confirmationProgress = computed(() => {
  if (!totalTicketCount.value) return 0
  return Math.round((filledTicketCount.value / totalTicketCount.value) * 100)
})

const showMobileConfirmationBar = computed(() => {
  return Boolean(!orderData.value?.isCompleted && !isSuccess.value && totalTicketCount.value)
})

const canSubmitConfirmation = computed(() => {
  return ticketsLeftToFill.value === 0 && !isSubmitting.value
})

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

const formatPhone = (index) => {
  buyerForms.value[index].phone = formatPhoneMask(buyerForms.value[index].phone)
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('pt-BR')
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
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
