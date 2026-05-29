<template>
  <div class="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <nav class="mb-2 text-sm text-slate-500">
            <router-link to="/events" class="hover:text-emerald-600">Events</router-link>
            <span class="mx-2">/</span>
            <router-link :to="`/events/${eventId}`" class="hover:text-emerald-600">{{ event?.name || 'Event' }}</router-link>
            <span class="mx-2">/</span>
            <span class="text-slate-900">Search Check-in</span>
          </nav>
          <h1 class="text-2xl font-semibold text-slate-900">Search Check-in</h1>
          <p class="mt-1 text-sm text-slate-500">Find tickets manually when QR scanning is not available.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <router-link
            to="/qr-checkin"
            class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <i class="fas fa-qrcode text-xs"></i> QR Scanner
          </router-link>
          <router-link
            :to="`/events/${eventId}`"
            class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <i class="fas fa-arrow-left text-xs"></i> Event
          </router-link>
        </div>
      </header>

      <section class="rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <form class="grid gap-3 lg:grid-cols-[1fr_180px_auto]" @submit.prevent="searchTickets">
          <div>
            <label for="ticketSearchQuery" class="mb-2 block text-sm font-semibold text-slate-700">Search</label>
            <input
              id="ticketSearchQuery"
              v-model="query"
              type="search"
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Ticket number, buyer, table, or order"
            >
          </div>
          <div>
            <label for="ticketSearchField" class="mb-2 block text-sm font-semibold text-slate-700">Search by</label>
            <select
              id="ticketSearchField"
              v-model="field"
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="any">Any</option>
              <option value="ticket">Ticket</option>
              <option value="buyer">Buyer name</option>
              <option value="email">Buyer email</option>
              <option value="table">Table</option>
              <option value="order">Order</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              type="submit"
              :disabled="isSearching || !query.trim()"
              class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              <span v-if="isSearching" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              <i v-else class="fas fa-search text-xs"></i>
              Search
            </button>
          </div>
        </form>
      </section>

      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        {{ error }}
      </div>

      <section class="space-y-3">
        <div v-if="hasSearched && !isSearching && groups.length === 0" class="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No tickets found for this search.
        </div>

        <article
          v-for="group in groups"
          :key="group.key"
          class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
        >
          <button
            type="button"
            class="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            @click="toggleGroup(group)"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {{ group.type === 'order' ? group.order : group.label }}
                </span>
                <span v-if="group.table" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Table {{ group.table }}
                </span>
                <span class="text-xs font-semibold text-slate-500">
                  {{ group.checkedInCount }}/{{ group.ticketCount }} checked in
                </span>
              </div>
              <p class="mt-2 truncate text-base font-semibold text-slate-900">{{ group.buyer || 'Buyer not confirmed' }}</p>
              <p class="truncate text-xs text-slate-500">{{ group.buyerEmail || 'No buyer email' }}</p>
            </div>
            <i :class="['fas text-slate-400', isGroupOpen(group) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>

          <div v-if="isGroupOpen(group)" class="border-t border-slate-100 px-5 py-5">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[760px] text-left text-sm">
                <thead class="border-b border-slate-100 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th class="w-12 py-3"></th>
                    <th class="py-3">Ticket</th>
                    <th class="py-3">Buyer</th>
                    <th class="py-3">Document</th>
                    <th class="py-3">Description</th>
                    <th class="py-3">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="ticket in group.tickets" :key="ticket.id">
                    <td class="py-3">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                        :checked="isTicketSelected(ticket.id)"
                        :disabled="ticket.checkedIn"
                        @change="toggleTicket(ticket.id)"
                      >
                    </td>
                    <td class="py-3 font-semibold text-slate-900">#{{ ticket.identificationNumber }}</td>
                    <td class="py-3 text-slate-700">{{ ticket.buyer || '-' }}</td>
                    <td class="py-3 text-slate-500">{{ ticket.buyerDocument || '-' }}</td>
                    <td class="py-3 text-slate-600">
                      {{ ticket.description }}
                      <span v-if="ticket.table" class="ml-2 text-xs text-slate-400">Table {{ ticket.table }}</span>
                    </td>
                    <td class="py-3">
                      <span v-if="ticket.checkedIn" class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Checked in
                      </span>
                      <span v-else class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-slate-500">{{ selectedCountForGroup(group) }} selected for check-in</p>
              <button
                type="button"
                :disabled="isCheckingIn || selectedCountForGroup(group) === 0"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                @click="confirmGroupCheckin(group)"
              >
                <span v-if="isCheckingIn" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                Confirm Check-in
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'

const route = useRoute()
const { get, post } = useApi()

const eventId = computed(() => route.params.id)
const query = ref('')
const field = ref('any')
const event = ref(null)
const groups = ref([])
const openGroupKey = ref(null)
const selectedTicketIds = ref([])
const isSearching = ref(false)
const isCheckingIn = ref(false)
const hasSearched = ref(false)
const error = ref(null)

const loadEvent = async () => {
  try {
    const response = await get(`/api/events/${eventId.value}`)
    event.value = response.event || null
  } catch (err) {
    console.error('Failed to load event:', err)
    error.value = err.message || 'Failed to load event'
  }
}

const searchTickets = async () => {
  const trimmedQuery = query.value.trim()
  if (!trimmedQuery) return

  try {
    isSearching.value = true
    error.value = null
    const params = new URLSearchParams({
      query: trimmedQuery,
      field: field.value
    })
    const response = await get(`/api/events/${eventId.value}/checkin/search?${params.toString()}`)

    event.value = response.event || event.value
    groups.value = response.groups || []
    openGroupKey.value = groups.value[0]?.key || null
    preselectUncheckedTickets(openGroupKey.value)
    hasSearched.value = true
  } catch (err) {
    console.error('Failed to search tickets for check-in:', err)
    error.value = err.message || 'Failed to search tickets'
  } finally {
    isSearching.value = false
  }
}

const preselectUncheckedTickets = (groupKey) => {
  const group = groups.value.find((item) => item.key === groupKey)
  selectedTicketIds.value = group
    ? group.tickets.filter((ticket) => !ticket.checkedIn).map((ticket) => ticket.id)
    : []
}

const isGroupOpen = (group) => openGroupKey.value === group.key

const toggleGroup = (group) => {
  openGroupKey.value = isGroupOpen(group) ? null : group.key
  preselectUncheckedTickets(openGroupKey.value)
}

const isTicketSelected = (ticketId) => selectedTicketIds.value.includes(ticketId)

const toggleTicket = (ticketId) => {
  if (isTicketSelected(ticketId)) {
    selectedTicketIds.value = selectedTicketIds.value.filter((id) => id !== ticketId)
  } else {
    selectedTicketIds.value = [...selectedTicketIds.value, ticketId]
  }
}

const selectedCountForGroup = (group) => {
  const groupTicketIds = new Set(group.tickets.map((ticket) => ticket.id))
  return selectedTicketIds.value.filter((id) => groupTicketIds.has(id)).length
}

const confirmGroupCheckin = async (group) => {
  const groupTicketIds = new Set(group.tickets.map((ticket) => ticket.id))
  const ticketIds = selectedTicketIds.value.filter((id) => groupTicketIds.has(id))
  if (ticketIds.length === 0) return

  if (!confirm(`Confirm check-in for ${ticketIds.length} ticket(s)?`)) {
    return
  }

  try {
    isCheckingIn.value = true
    error.value = null
    const response = await post(`/api/events/${eventId.value}/checkin/tickets`, { ticketIds })
    applyUpdatedTickets(response.tickets || [])
    selectedTicketIds.value = []
    alert(`${response.checkedInCount || 0} ticket(s) checked in. ${response.alreadyCheckedInCount || 0} already checked in.`)
  } catch (err) {
    console.error('Failed to confirm check-in:', err)
    error.value = err.message || 'Failed to confirm check-in'
  } finally {
    isCheckingIn.value = false
  }
}

const applyUpdatedTickets = (updatedTickets) => {
  const updatedById = new Map(updatedTickets.map((ticket) => [ticket.id, ticket]))
  groups.value = groups.value.map((group) => {
    const tickets = group.tickets.map((ticket) => updatedById.get(ticket.id) || ticket)
    return {
      ...group,
      tickets,
      checkedInCount: tickets.filter((ticket) => ticket.checkedIn).length
    }
  })
}

onMounted(loadEvent)
</script>
