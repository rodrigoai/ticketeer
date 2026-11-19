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
            <span class="text-slate-900">{{ heading }}</span>
          </nav>
          <h1 class="text-2xl font-semibold text-slate-900">{{ heading }}</h1>
          <p class="mt-1 text-sm text-slate-600">
            {{ mode === 'pickup' ? 'Find an order and mark the kits you hand out.' : 'Find an order and check in the tickets for people who have arrived.' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <router-link
            :to="mode === 'pickup' ? '/qr-accessory-pickup' : '/qr-checkin'"
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
              :disabled="isSearching || Boolean(pendingTicketAction) || !query.trim()"
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
                  {{ group.tickets.filter(ticket => ticket[action.status]).length }} of {{ group.ticketCount }}
                  {{ mode === 'pickup' ? 'kits picked up' : 'checked in' }}
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
                  :disabled="ticket[action.status] || Boolean(pendingTicketAction)"
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
                <TicketStatusAction
                  class="max-w-32"
                  :ticket="ticket"
                  :mode="mode"
                  :pending="isTicketActionPending(mode, ticket.id)"
                  :disabled="Boolean(pendingTicketAction) || isSearching"
                  :error="rowErrors[mode][ticket.id]"
                  @submit="applyTicketAction([ticket.id])"
                />
              </li>
            </ul>

            <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-slate-500">{{ selectedCountForGroup(group) }} selected for {{ mode === 'pickup' ? 'kit pickup' : 'check-in' }}</p>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  :disabled="Boolean(pendingTicketAction) || isSearching || pendingCountForGroup(group) === 0"
                  class="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="toggleAllPendingTickets(group)"
                >
                  {{ areAllPendingTicketsSelected(group) ? 'Deselect all' : 'Select all pending' }}
                </button>
                <button
                  type="button"
                  :disabled="Boolean(pendingTicketAction) || isSearching || selectedCountForGroup(group) === 0"
                  class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                  :class="mode === 'pickup' ? 'bg-sky-700 hover:bg-sky-800' : 'bg-emerald-700 hover:bg-emerald-800'"
                  @click="confirmGroupAction(group)"
                >
                  {{ mode === 'pickup' ? 'Pick up selected kits' : 'Check in selected' }} ({{ selectedCountForGroup(group) }})
                </button>
              </div>
            </div>
            <p v-if="groupErrors[mode][group.key]" class="mt-2 text-sm text-rose-700" role="alert">
              {{ groupErrors[mode][group.key] }}
            </p>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import TicketStatusAction from '@/components/TicketStatusAction.vue'
import { ticketStatusActions, useTicketStatusActions } from '@/composables/useTicketStatusActions'

const props = defineProps({
  mode: { type: String, default: 'checkin' }
})

const route = useRoute()
const { get } = useApi()

const eventId = computed(() => route.params.id)
const action = computed(() => ticketStatusActions[props.mode])
const heading = computed(() => props.mode === 'pickup' ? 'Manual kit pickup' : 'Manual check-in')
const { runAction, pending: pendingTicketAction, isPending: isTicketActionPending, rowErrors, groupErrors, clearErrors } =
  useTicketStatusActions(eventId)
const query = ref('')
const field = ref('any')
const event = ref(null)
const groups = ref([])
const openGroupKey = ref(null)
const selectedTicketIds = ref([])
const isSearching = ref(false)
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
  if (!trimmedQuery || isSearching.value || pendingTicketAction.value) return

  const currentEventId = eventId.value
  const currentMode = props.mode

  try {
    isSearching.value = true
    error.value = null
    groups.value = []
    hasSearched.value = false
    selectedTicketIds.value = []
    clearErrors(currentMode)
    const params = new URLSearchParams({
      query: trimmedQuery,
      field: field.value
    })
    const response = await get(`/api/events/${currentEventId}/${action.value.endpoint}/search?${params.toString()}`)
    if (currentEventId !== eventId.value || currentMode !== props.mode) return

    event.value = response.event || event.value
    groups.value = response.groups || []
    openGroupKey.value = groups.value[0]?.key || null
    hasSearched.value = true
  } catch (err) {
    if (currentEventId === eventId.value && currentMode === props.mode) {
      error.value = err.message || 'Failed to search tickets'
    }
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

const pendingTicketIdsForGroup = (group) => {
  return group.tickets.filter((ticket) => !ticket[action.value.status]).map((ticket) => ticket.id)
}

const selectedCountForGroup = (group) => pendingTicketIdsForGroup(group).filter(isTicketSelected).length
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

const confirmGroupAction = (group) => {
  const ticketIds = pendingTicketIdsForGroup(group).filter(isTicketSelected)
  if (ticketIds.length && confirm(action.value.confirm(ticketIds.length))) {
    return applyTicketAction(ticketIds, group.key)
  }
}

const applyTicketAction = async (ticketIds, groupKey) => {
  if (isSearching.value) return
  const currentEventId = eventId.value
  const currentMode = props.mode
  const updatedTickets = await runAction(currentMode, ticketIds, groupKey)
  if (!updatedTickets || currentEventId !== eventId.value || currentMode !== props.mode) return

  const updates = new Map(updatedTickets.map(ticket => [ticket.id, ticket]))
  groups.value = groups.value.map(group => ({
    ...group,
    tickets: group.tickets.map(ticket => updates.get(ticket.id) || ticket)
  }))
  selectedTicketIds.value = selectedTicketIds.value.filter(id => !updates.has(id))
}

watch([eventId, () => props.mode], ([id], [previousId] = []) => {
  groups.value = []
  openGroupKey.value = null
  selectedTicketIds.value = []
  hasSearched.value = false
  error.value = null
  clearErrors(props.mode)
  if (id !== previousId) {
    event.value = null
    loadEvent()
  }
}, { immediate: true })
</script>
