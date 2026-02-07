<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-5xl mx-auto px-4 py-10">
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

      <div v-else class="space-y-8">
        <div class="rounded-3xl overflow-hidden bg-white shadow-lg border border-slate-100">
          <img
            v-if="event.eventImageUrl"
            :src="event.eventImageUrl"
            :alt="event.title"
            class="w-full h-72 object-cover"
          />
          <div class="p-6 space-y-4">
            <div>
              <h1 class="text-3xl font-semibold text-slate-900">{{ event.title }}</h1>
              <p class="text-slate-500 mt-2" v-if="event.description">{{ event.description }}</p>
            </div>
            <div class="flex flex-wrap gap-4 text-sm text-slate-600">
              <span class="inline-flex items-center gap-2"><i class="fas fa-calendar"></i> {{ formattedDate }}</span>
              <span v-if="event.venue" class="inline-flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
            </div>
            <div class="pt-4 border-t border-slate-100 flex flex-col gap-2 text-sm text-slate-500">
              <div v-if="event.checkoutPageTitle">
                Página de checkout: <span class="font-semibold text-slate-700">{{ event.checkoutPageTitle }}</span>
              </div>
              <p v-if="!checkoutBaseUrl" class="text-xs text-amber-600">Checkout não está configurado para este evento.</p>
            </div>
          </div>
        </div>

        <section class="space-y-4">
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
                  <p v-if="group.tableNumber !== null" class="text-sm text-slate-500">Mesa {{ group.tableNumber }}</p>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'

const route = useRoute()
const { get } = useApi()

const event = ref(null)
const checkoutBaseUrl = ref('')
const tickets = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

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
  if (!tickets.value.length) return []
  const groups = new Map()

  tickets.value.forEach((ticket) => {
    const description = ticket.description || 'Ticket'
    const tableNumber = ticket.table === null || ticket.table === undefined ? null : ticket.table
    const key = tableNumber === null ? description : `${description}__${tableNumber}`

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        description,
        tableNumber,
        price: ticket.price ?? null,
        totalCount: 0,
        availableCount: 0,
        firstOrder: ticket.identificationNumber || 0
      })
    }

    const group = groups.get(key)
    group.totalCount += 1
    if (!ticket.order) {
      group.availableCount += 1
    }
  })

  return Array.from(groups.values())
    .sort((a, b) => a.firstOrder - b.firstOrder)
    .map((group) => {
      const checkoutUrl = buildCheckoutUrl(checkoutBaseUrl.value, event.value?.id, group.tableNumber)
      const canBuy = Boolean(checkoutUrl) && group.availableCount > 0
      return {
        ...group,
        checkoutUrl,
        canBuy
      }
    })
})

const loadEvent = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await get(`/api/public/events/${route.params.id}`)
    event.value = data.event || null
    checkoutBaseUrl.value = data.checkoutBaseUrl || ''
    tickets.value = data.tickets || []
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.message || 'Failed to load event'
    event.value = null
    tickets.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadEvent()
})
</script>
