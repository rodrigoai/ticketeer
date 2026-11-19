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
            <span class="text-slate-900">Manual check-in</span>
          </nav>
          <h1 class="text-2xl font-semibold text-slate-900">Manual check-in</h1>
          <p class="mt-1 text-sm text-slate-600">Find an order and check in the tickets for people who have arrived.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <router-link
            to="/qr-checkin"
            class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <i class="fas fa-qrcode text-xs"></i> Scan QR
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
              placeholder="Buyer name, ticket #, or order #"
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
              <option value="document">Buyer document</option>
              <option value="email">Buyer email</option>
              <option value="table">Table</option>
              <option value="order">Order</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              type="submit"
              :disabled="isSearching || checkingInTicketIds.length > 0 || !query.trim()"
              class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              <span v-if="isSearching" class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              <i v-else class="fas fa-search text-xs"></i>
              Search
            </button>
          </div>
        </form>
      </section>

      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700" role="alert">
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
            :aria-expanded="isGroupOpen(group)"
            @click="toggleGroup(group)"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {{ group.label }}
                </span>
                <span v-if="group.table" class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Table {{ group.table }}
                </span>
                <span class="text-xs font-semibold text-slate-500" role="status">
                  {{ group.checkedInCount }} of {{ group.ticketCount }} checked in
                </span>
              </div>
              <p v-if="group.buyer" class="mt-2 truncate text-base font-semibold text-slate-900">{{ group.buyer }}</p>
              <p v-if="group.buyerEmail" class="truncate text-xs text-slate-500">{{ group.buyerEmail }}</p>
            </div>
            <i :class="['fas text-slate-400', isGroupOpen(group) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>

          <div v-if="isGroupOpen(group)" class="border-t border-slate-100 px-3 py-4 sm:px-5">
            <ul class="divide-y divide-slate-100">
              <li
                v-for="ticket in group.tickets"
                :key="ticket.id"
                class="grid grid-cols-[auto_minmax(0,1fr)_minmax(6rem,auto)] items-start gap-3 rounded-lg px-2 py-3 sm:px-3"
                :class="{ 'bg-emerald-50': isHighlighted(group, ticket) }"
              >
                <input
                  type="checkbox"
                  class="mt-2 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                  :aria-label="`Select ticket #${ticket.identificationNumber}`"
                  :checked="isTicketSelected(ticket.id)"
                  :disabled="ticket.checkedIn || checkingInTicketIds.length > 0"
                  @change="toggleTicket(ticket.id)"
                >
                <div class="min-w-0 text-sm">
                  <p class="break-words font-semibold text-slate-900">{{ ticket.buyer || 'No attendee name' }}</p>
                  <p class="break-words text-slate-600">
                    <span class="font-semibold">#{{ ticket.identificationNumber }}</span> · {{ ticket.description }}
                  </p>
                  <p v-if="ticket.table != null || ticket.location" class="break-words text-xs text-slate-500">
                    <span v-if="ticket.table != null">Table {{ ticket.table }}</span>
                    <span v-if="ticket.table != null && ticket.location"> · </span>{{ ticket.location }}
                  </p>
                  <p v-if="isHighlighted(group, ticket)" class="text-xs font-semibold text-emerald-800">Search match</p>
                </div>
                <TicketCheckinAction
                  class="max-w-32"
                  :ticket="ticket"
                  :pending="checkingInTicketIds.includes(ticket.id)"
                  :disabled="checkingInTicketIds.length > 0 || isSearching"
                  :error="ticketCheckinErrors[ticket.id]"
                  @check-in="checkInTickets(group, [ticket.id])"
                />
              </li>
            </ul>

            <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-slate-500">{{ selectedCountForGroup(group) }} selected for check-in</p>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  :disabled="checkingInTicketIds.length > 0 || isSearching || pendingCountForGroup(group) === 0"
                  class="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="toggleAllPendingTickets(group)"
                >
                  {{ areAllPendingTicketsSelected(group) ? 'Deselect all' : 'Select all pending' }}
                </button>
                <button
                  type="button"
                  :disabled="checkingInTicketIds.length > 0 || isSearching || selectedCountForGroup(group) === 0"
                  class="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="confirmGroupCheckin(group)"
                >
                  Check in selected ({{ selectedCountForGroup(group) }})
                </button>
              </div>
            </div>
            <p v-if="groupCheckinErrors[group.key]" class="mt-2 text-sm text-rose-700" role="alert">
              {{ groupCheckinErrors[group.key] }}
            </p>
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
import TicketCheckinAction from '@/components/TicketCheckinAction.vue'

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
const checkingInTicketIds = ref([])
const ticketCheckinErrors = ref({})
const groupCheckinErrors = ref({})
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
  if (!trimmedQuery || isSearching.value || checkingInTicketIds.value.length) return

  try {
    isSearching.value = true
    error.value = null
    groups.value = []
    hasSearched.value = false
    selectedTicketIds.value = []
    ticketCheckinErrors.value = {}
    groupCheckinErrors.value = {}
    const params = new URLSearchParams({
      query: trimmedQuery,
      field: field.value
    })
    const response = await get(`/api/events/${eventId.value}/checkin/search?${params.toString()}`)

    event.value = response.event || event.value
    groups.value = response.groups || []
    openGroupKey.value = groups.value[0]?.key || null
    hasSearched.value = true
  } catch (err) {
    console.error('Failed to search tickets for check-in:', err)
    error.value = err.message || 'Failed to search tickets'
  } finally {
    isSearching.value = false
  }
}

const isGroupOpen = (group) => openGroupKey.value === group.key
const isHighlighted = (group, ticket) =>
  group.matchedTicketIds.length < group.ticketCount && group.matchedTicketIds.includes(ticket.id)

const toggleGroup = (group) => {
  openGroupKey.value = isGroupOpen(group) ? null : group.key
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

const pendingTicketIdsForGroup = (group) => {
  return group.tickets.filter((ticket) => !ticket.checkedIn).map((ticket) => ticket.id)
}

const pendingCountForGroup = (group) => pendingTicketIdsForGroup(group).length

const areAllPendingTicketsSelected = (group) => {
  const pendingTicketIds = pendingTicketIdsForGroup(group)
  return pendingTicketIds.length > 0 && pendingTicketIds.every((ticketId) => selectedTicketIds.value.includes(ticketId))
}

const toggleAllPendingTickets = (group) => {
  const nextSelection = new Set(selectedTicketIds.value)
  const pendingTicketIds = pendingTicketIdsForGroup(group)

  if (areAllPendingTicketsSelected(group)) {
    pendingTicketIds.forEach((ticketId) => nextSelection.delete(ticketId))
  } else {
    pendingTicketIds.forEach((ticketId) => nextSelection.add(ticketId))
  }

  selectedTicketIds.value = [...nextSelection]
}

const confirmGroupCheckin = (group) => {
  const ticketIds = pendingTicketIdsForGroup(group).filter(isTicketSelected)
  if (ticketIds.length && confirm(`Check in ${ticketIds.length} selected ticket(s)?`)) {
    return checkInTickets(group, ticketIds, true)
  }
}

const checkInTickets = async (group, ticketIds, bulk = false) => {
  if (isSearching.value || checkingInTicketIds.value.length) return

  checkingInTicketIds.value = ticketIds
  delete groupCheckinErrors.value[group.key]
  ticketIds.forEach(id => delete ticketCheckinErrors.value[id])
  try {
    const response = await post(`/api/events/${eventId.value}/checkin/tickets`, { ticketIds })
    applyUpdatedTickets(response.tickets)
    const updatedIds = new Set(response.tickets.map(ticket => ticket.id))
    selectedTicketIds.value = selectedTicketIds.value.filter(id => !updatedIds.has(id))
  } catch (err) {
    const message = err.message || 'Check-in failed. Try again.'
    if (bulk) groupCheckinErrors.value[group.key] = message
    else ticketCheckinErrors.value[ticketIds[0]] = message
  } finally {
    checkingInTicketIds.value = []
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
