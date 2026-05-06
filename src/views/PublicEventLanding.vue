<template>
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start">
      <div class="min-w-0 flex-1 space-y-8">
        <div v-if="isLoading" class="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-md">
          <div class="inline-flex items-center gap-2 text-slate-600">
            <span class="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
            Carregando evento...
          </div>
        </div>

        <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
          {{ errorMessage }}
        </div>

        <div v-else-if="!event" class="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center">
          Evento não encontrado.
        </div>

        <template v-else>
          <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg">
            <img
              v-if="event.eventImageUrl"
              :src="event.eventImageUrl"
              :alt="event.title"
              class="h-72 w-full object-cover"
            />
            <div class="space-y-4 p-6">
              <div class="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span>{{ event.saleMode === SALE_MODES.CHECKOUT ? 'Checkout' : 'Shopping Cart' }}</span>
                <span v-if="event.saleMode === SALE_MODES.SHOPPING_CART" class="rounded-full bg-slate-100 px-3 py-1 text-[0.65rem] text-slate-600">
                  Reserva de {{ event.reservationExpiresInMinutes }} min
                </span>
              </div>
              <div>
                <h1 class="text-3xl font-semibold text-slate-900">{{ event.title }}</h1>
                <p v-if="event.description" class="mt-2 text-slate-500">{{ event.description }}</p>
              </div>
              <div class="flex flex-wrap gap-4 text-sm text-slate-600">
                <span class="inline-flex items-center gap-2"><i class="fas fa-calendar"></i> {{ formattedDate }}</span>
                <span v-if="event.venue" class="inline-flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
              </div>
              <div v-if="event.saleMode === SALE_MODES.CHECKOUT" class="border-t border-slate-100 pt-4 text-sm text-slate-500">
                <div v-if="event.checkoutPageTitle">
                  Página de checkout: <span class="font-semibold text-slate-700">{{ event.checkoutPageTitle }}</span>
                </div>
                <p v-if="!checkoutBaseUrl" class="mt-1 text-xs text-amber-600">Checkout não está configurado para este evento.</p>
              </div>
            </div>
          </div>

          <section v-if="event.saleMode === SALE_MODES.CHECKOUT" class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-slate-900">Ingressos</h2>
              <span v-if="ticketGroups.length" class="text-xs text-slate-500">{{ ticketGroups.length }} opção(ões)</span>
            </div>

            <div v-if="ticketGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-slate-500">
              Nenhum ingresso disponível para venda no momento.
            </div>

            <div v-else class="grid gap-4">
              <div
                v-for="group in ticketGroups"
                :key="group.key"
                class="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">{{ group.description }}</h3>
                    <p v-if="group.tables?.length" class="text-sm text-slate-500">Mesas {{ group.tables.join(', ') }}</p>
                    <p v-if="group.price !== null" class="text-sm text-slate-500">Valor: {{ formatCurrency(group.price) }}</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-4">
                    <div class="text-sm text-slate-500" v-if="group.availableCount !== null">
                      {{ group.availableCount }} disponível(is)
                    </div>
                    <a
                      class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition"
                      :class="group.canBuy ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'"
                      :href="group.canBuy ? group.checkoutUrl : undefined"
                      :aria-disabled="!group.canBuy"
                    >
                      <i class="fas fa-ticket-alt"></i> Comprar
                    </a>
                  </div>
                </div>
                <p v-if="group.availableCount === 0" class="mt-3 text-xs text-amber-600">Esgotado</p>
              </div>
            </div>
          </section>

          <section v-else class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-semibold text-slate-900">Selecione seus lugares</h2>
                <p class="text-sm text-slate-500">Escolha um ou mais ingressos disponíveis. O carrinho é atualizado automaticamente.</p>
              </div>
              <span class="text-xs text-slate-500">{{ shoppingCartGroups.length }} grupo(s)</span>
            </div>

            <div v-if="shoppingCartGroups.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-slate-500">
              Nenhum ingresso disponível para venda no momento.
            </div>

            <div v-else class="space-y-5">
              <div
                v-for="group in shoppingCartGroups"
                :key="group.key"
                class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">{{ group.description }}</h3>
                    <p class="text-sm text-slate-500">
                      {{ formatCurrency(group.price) }} por ingresso
                      <span class="mx-2">•</span>
                      {{ group.availableCount }} disponível(is)
                    </p>
                  </div>
                  <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {{ group.totalCount }} assento(s)
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  <button
                    v-for="ticket in group.tickets"
                    :key="ticket.id"
                    type="button"
                    class="rounded-2xl border px-4 py-3 text-left transition"
                    :class="ticketCardClass(ticket)"
                    :disabled="!ticket.isAvailable || isSubmittingCart"
                    @click="toggleTicketSelection(ticket)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.2em]">{{ ticket.table ? `Mesa ${ticket.table}` : 'Ingresso' }}</p>
                        <p class="mt-1 text-sm font-semibold">#{{ ticket.identificationNumber }}</p>
                      </div>
                      <span class="text-[0.65rem] font-semibold uppercase">
                        {{ ticketStatusLabel(ticket) }}
                      </span>
                    </div>
                    <p v-if="ticket.location" class="mt-2 text-xs opacity-80">{{ ticket.location }}</p>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>

      <aside v-if="event && event.saleMode === SALE_MODES.SHOPPING_CART" class="w-full shrink-0 lg:sticky lg:top-6 lg:w-[360px]">
        <div class="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-lg">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">Seu carrinho</h2>
            <p class="mt-1 text-sm text-slate-500">Revise os ingressos selecionados e informe seus dados para continuar.</p>
          </div>

          <div v-if="cartError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {{ cartError }}
          </div>

          <div v-if="cartSuccessMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {{ cartSuccessMessage }}
          </div>

          <div v-if="selectedTickets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Nenhum ingresso selecionado ainda.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="ticket in selectedTickets"
              :key="ticket.id"
              class="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ ticket.description }}</p>
                <p class="text-xs text-slate-500">
                  #{{ ticket.identificationNumber }}
                  <span v-if="ticket.table">• Mesa {{ ticket.table }}</span>
                </p>
                <p class="mt-1 text-sm text-slate-700">{{ formatCurrency(ticket.price) }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white"
                @click="removeTicket(ticket.id)"
              >
                Remover
              </button>
            </div>
          </div>

          <div class="space-y-3 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between text-sm text-slate-500">
              <span>Total de ingressos</span>
              <span>{{ selectedTickets.length }}</span>
            </div>
            <div class="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{{ formatCurrency(cartTotal) }}</span>
            </div>
          </div>

          <div class="space-y-4 border-t border-slate-100 pt-4">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Nome</label>
              <input
                v-model="customer.name"
                type="text"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                placeholder="Seu nome completo"
              >
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
              <input
                v-model="customer.email"
                type="email"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                placeholder="voce@email.com"
              >
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Telefone</label>
              <input
                :value="customer.phone"
                type="tel"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                placeholder="(11) 99999-9999"
                @input="handlePhoneInput"
              >
            </div>
          </div>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            :class="canSubmitCart ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 text-slate-500'"
            :disabled="!canSubmitCart || isSubmittingCart"
            @click="submitCart"
          >
            <span v-if="isSubmittingCart" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            <i v-else class="fas fa-lock"></i>
            {{ isSubmittingCart ? 'Preparando pagamento...' : 'Pagar' }}
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { formatPhoneMask, isCustomerInfoValid, sumCartTickets } from '@/utils/cart'

const SALE_MODES = {
  CHECKOUT: 'checkout',
  SHOPPING_CART: 'shopping_cart'
}

const route = useRoute()
const { get, post } = useApi()

const event = ref(null)
const checkoutBaseUrl = ref('')
const tickets = ref([])
const ticketGroupsFromApi = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const isSubmittingCart = ref(false)
const cartError = ref('')
const cartSuccessMessage = ref('')
const selectedTicketIds = ref([])
const customer = ref({
  name: '',
  email: '',
  phone: ''
})

const formattedDate = computed(() => {
  if (!event.value?.date) return ''
  try {
    return new Date(event.value.date).toLocaleString('pt-BR')
  } catch (error) {
    return event.value.date
  }
})

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

const encodeMetaValue = (value) => {
  if (value === null || value === undefined) return ''
  return btoa(String(value)).replace(/=+$/, '')
}

const buildCheckoutUrl = (baseUrl, eventId, tableNumber) => {
  if (!baseUrl || !eventId) return ''
  const params = new URLSearchParams()
  params.set('meta.eventId', encodeMetaValue(eventId))
  if (tableNumber !== null && tableNumber !== undefined) {
    params.set('meta.tableNumber', encodeMetaValue(tableNumber))
  }
  return `${baseUrl}?${params.toString()}`
}

const ticketGroups = computed(() => {
  if (ticketGroupsFromApi.value.length) {
    return ticketGroupsFromApi.value.map((group) => {
      const groupCheckoutUrl = group.checkoutUrl || buildCheckoutUrl(checkoutBaseUrl.value, event.value?.id, null)
      const canBuy = Boolean(groupCheckoutUrl) && group.availableCount > 0

      return {
        ...group,
        checkoutUrl: groupCheckoutUrl,
        canBuy
      }
    })
  }

  return []
})

const shoppingCartGroups = computed(() => {
  const groups = new Map()

  tickets.value.forEach((ticket) => {
    const key = ticket.description || 'Ticket'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        description: ticket.description || 'Ticket',
        price: ticket.price ?? 0,
        totalCount: 0,
        availableCount: 0,
        tickets: []
      })
    }

    const group = groups.get(key)
    group.totalCount += 1
    if (ticket.isAvailable) {
      group.availableCount += 1
    }
    group.tickets.push(ticket)
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      tickets: group.tickets.slice().sort((a, b) => a.identificationNumber - b.identificationNumber)
    }))
    .sort((a, b) => a.tickets[0]?.identificationNumber - b.tickets[0]?.identificationNumber)
})

const selectedTickets = computed(() => {
  const selectedSet = new Set(selectedTicketIds.value)
  return tickets.value.filter((ticket) => selectedSet.has(ticket.id))
})

const cartTotal = computed(() => sumCartTickets(selectedTickets.value))
const canSubmitCart = computed(() => selectedTickets.value.length > 0 && isCustomerInfoValid(customer.value))

const ticketCardClass = (ticket) => {
  if (!ticket.isAvailable) {
    return 'border-slate-200 bg-slate-100 text-slate-400'
  }

  if (selectedTicketIds.value.includes(ticket.id)) {
    return 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
  }

  return 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50/40'
}

const ticketStatusLabel = (ticket) => {
  if (ticket.isAvailable) return selectedTicketIds.value.includes(ticket.id) ? 'Selecionado' : 'Disponível'
  if (ticket.isReserved) return 'Reservado'
  return 'Indisponível'
}

const toggleTicketSelection = (ticket) => {
  if (!ticket.isAvailable || isSubmittingCart.value) return

  if (selectedTicketIds.value.includes(ticket.id)) {
    selectedTicketIds.value = selectedTicketIds.value.filter((id) => id !== ticket.id)
    return
  }

  selectedTicketIds.value = [...selectedTicketIds.value, ticket.id]
}

const removeTicket = (ticketId) => {
  selectedTicketIds.value = selectedTicketIds.value.filter((id) => id !== ticketId)
}

const handlePhoneInput = (event) => {
  customer.value.phone = formatPhoneMask(event.target.value)
}

const loadEvent = async () => {
  isLoading.value = true
  errorMessage.value = ''
  cartError.value = ''
  cartSuccessMessage.value = ''

  try {
    const data = await get(`/api/public/events/${route.params.id}`)
    event.value = data.event || null
    checkoutBaseUrl.value = data.checkoutBaseUrl || ''
    tickets.value = data.tickets || []
    ticketGroupsFromApi.value = data.ticketGroups || []
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Failed to load event'
    event.value = null
    tickets.value = []
    ticketGroupsFromApi.value = []
  } finally {
    isLoading.value = false
  }
}

const submitCart = async () => {
  if (!canSubmitCart.value || !event.value) return

  isSubmittingCart.value = true
  cartError.value = ''
  cartSuccessMessage.value = ''

  try {
    const response = await post(`/api/public/events/${event.value.id}/cart-checkout`, {
      ticketIds: selectedTicketIds.value,
      customer: customer.value
    })

    const paymentLink = response?.cart?.link
    if (!paymentLink) {
      throw new Error('Payment link not returned by Nova.Money')
    }

    cartSuccessMessage.value = 'Carrinho criado. Redirecionando para o pagamento...'
    window.location.href = paymentLink
  } catch (error) {
    cartError.value = error?.data?.message || error?.message || 'Não foi possível iniciar o pagamento.'
    await loadEvent()
    selectedTicketIds.value = selectedTicketIds.value.filter((ticketId) => tickets.value.some((ticket) => ticket.id === ticketId && ticket.isAvailable))
  } finally {
    isSubmittingCart.value = false
  }
}

onMounted(() => {
  loadEvent()
})
</script>
