<template>
  <div class="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
    <!-- Loading State -->
    <div v-if="isLoadingEvent" class="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-md">
      <div class="inline-flex items-center gap-2 text-slate-600">
        <span class="h-4 w-4 rounded-full border-2 border-slate-600 border-t-transparent animate-spin"></span>
        Loading event...
      </div>
    </div>

    <!-- Event Not Found -->
    <div v-else-if="!event" class="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center space-y-4">
      <div class="text-6xl">❌</div>
      <h4 class="text-xl font-semibold text-slate-900">Event Not Found</h4>
      <p class="text-slate-500">The event you're looking for doesn't exist or you don't have access to it.</p>
      <router-link to="/events" class="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition">Back to Events</router-link>
    </div>

    <!-- Event Detail -->
    <div v-else class="space-y-6">
      <!-- Event Header -->
      <header class="rounded-3xl bg-white border border-slate-100 px-6 py-6 shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <nav class="text-sm text-slate-500 mb-2">
            <router-link to="/events" class="hover:text-primary-600">Events</router-link>
            <span class="mx-2">/</span>
            <span class="text-slate-900">{{ event.title }}</span>
          </nav>
          <h1 class="text-3xl font-semibold text-slate-900">{{ event.title }}</h1>
          <p class="text-sm text-slate-500 mt-1" v-if="event.description">{{ event.description }}</p>
          <div class="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
            <span class="inline-flex items-center gap-2"><i class="fas fa-calendar"></i> {{ formatDate(event.date) }}</span>
            <span v-if="event.venue" class="inline-flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
          </div>
        </div>
        <div class="flex gap-3 flex-wrap items-center">
          <a
            v-if="publicLandingUrl"
            :href="publicLandingUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <i class="fas fa-external-link-alt"></i> Public Landing
          </a>
          <router-link :to="`/events`" class="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <i class="fas fa-arrow-left"></i> Back
          </router-link>
        </div>
      </header>

      <!-- Ticket Statistics -->
      <section v-if="stats" class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-2xl bg-primary-600 text-white p-5 shadow-sm">
          <p class="text-3xl font-semibold">{{ stats.totalTickets }}</p>
          <p class="text-sm text-white/80 mt-1">Total Tickets</p>
        </div>
        <div class="rounded-2xl bg-emerald-500 text-white p-5 shadow-sm">
          <p class="text-3xl font-semibold">{{ stats.totalSold || 0 }}</p>
          <p class="text-sm text-white/80 mt-1">Total Sold</p>
        </div>
        <div class="rounded-2xl bg-slate-500 text-white p-5 shadow-sm">
          <p class="text-3xl font-semibold">{{ stats.totalRemaining || 0 }}</p>
          <p class="text-sm text-white/80 mt-1">Total Remaining</p>
        </div>
        <div class="rounded-2xl bg-sky-500 text-white p-5 shadow-sm">
          <p class="text-3xl font-semibold">{{ stats.totalConfirmed || 0 }}</p>
          <p class="text-sm text-white/80 mt-1">Total Confirmed</p>
        </div>
        <div class="rounded-2xl bg-amber-500 text-white p-5 shadow-sm">
          <p class="text-3xl font-semibold">{{ stats.checkedInTickets || 0 }}</p>
          <p class="text-sm text-white/80 mt-1">Checked-In</p>
        </div>
      </section>

      <!-- Ticket Management -->
      <section class="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <h3 class="text-xl font-semibold text-slate-900">Tickets</h3>
            <div class="relative flex-1 max-w-sm">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <i class="fas fa-search text-xs"></i>
              </span>
              <input 
                type="text" 
                class="w-full rounded-full border border-slate-200 pl-10 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition bg-white"
                placeholder="Search tickets..."
                v-model="searchValue"
              >
              <button 
                v-if="searchValue" 
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                @click="searchValue = ''"
              >
                <i class="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
          <div class="flex gap-3 flex-wrap">
            <button class="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 transition" @click="showCreateModal">
              <i class="fas fa-plus text-xs"></i> Add Ticket
            </button>
            <button class="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-600 transition" @click="showBatchCreateModal">
              <i class="fas fa-layer-group text-xs"></i> Batch Create
            </button>
          </div>
        </div>

        <!-- Bulk Actions Toolbar -->
        <div v-if="selectedTicketIds.length > 0" class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-6 py-3 bg-sky-50 border-b border-sky-100">
          <span class="text-sm text-sky-700 font-medium">
            <strong>{{ selectedTicketIds.length }}</strong> ticket(s) selected
          </span>
          <div class="flex gap-2 flex-wrap">
            <button class="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 transition shadow-sm" @click="showBulkEditModal">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition shadow-sm" @click="confirmBulkDelete">
              <i class="fas fa-trash"></i> Delete
            </button>
            <button class="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition" @click="clearSelection">
              <i class="fas fa-times"></i> Clear
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full caption-bottom text-left text-sm text-slate-600">
            <thead class="border-b bg-slate-50 text-slate-500 uppercase text-[0.65rem] tracking-[0.4em]">
              <tr>
                <th class="px-5 py-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected" 
                    @change="toggleSelectAll"
                    class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  >
                </th>
                <th @click="sortBy('checkedIn')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  Status <i v-if="sortKey === 'checkedIn'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th @click="sortBy('accessoryCollected')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  Kit <i v-if="sortKey === 'accessoryCollected'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th @click="sortBy('identificationNumber')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  # <i v-if="sortKey === 'identificationNumber'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th @click="sortBy('description')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  Description <i v-if="sortKey === 'description'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th @click="sortBy('table')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  Table <i v-if="sortKey === 'table'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th @click="sortBy('order')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  Order <i v-if="sortKey === 'order'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th @click="sortBy('buyer')" class="px-5 py-3 font-semibold cursor-pointer hover:text-slate-900 transition whitespace-nowrap">
                  Buyer <i v-if="sortKey === 'buyer'" :class="['fas', sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down', 'ml-1']"></i>
                </th>
                <th class="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="isLoadingTickets">
                <td colspan="9" class="px-5 py-12 text-center text-slate-500">
                  <div class="inline-flex items-center gap-2">
                    <span class="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin"></span>
                    Loading tickets...
                  </div>
                </td>
              </tr>
              <tr v-else-if="sortedTickets.length === 0">
                <td colspan="9" class="px-5 py-12 text-center text-slate-500">
                  {{ tickets.length === 0 ? 'No tickets yet. Create your first ticket for this event!' : 'No tickets found matching your search.' }}
                </td>
              </tr>
              <tr 
                v-else 
                v-for="ticket in sortedTickets" 
                :key="ticket.id"
                class="hover:bg-slate-50/50 transition duration-150"
              >
                <td class="px-5 py-4 text-center">
                  <input 
                    type="checkbox" 
                    :checked="selectedTicketIds.includes(ticket.id)"
                    @change="toggleTicketSelection(ticket.id)"
                    class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  >
                </td>
                <td class="px-5 py-4 text-center">
                  <span v-if="ticket.checkedIn" class="text-emerald-500" title="Checked In">
                    <i class="fas fa-check-circle text-lg"></i>
                  </span>
                  <span v-else class="text-slate-200" title="Not Checked In">
                    <i class="far fa-circle text-lg"></i>
                  </span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span v-if="ticket.accessoryCollected" class="text-sky-500" title="Kit Picked Up">
                    <i class="fas fa-box text-lg"></i>
                  </span>
                  <span v-else class="text-slate-200" title="Kit Not Picked Up">
                    <i class="fas fa-box text-lg opacity-30"></i>
                  </span>
                </td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    #{{ ticket.identificationNumber }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-900">{{ ticket.description }}</p>
                  <p v-if="ticket.location" class="text-xs text-slate-500 mt-0.5">{{ ticket.location }}</p>
                </td>
                <td class="px-5 py-4 text-slate-600">
                  {{ ticket.table || '-' }}
                </td>
                <td class="px-5 py-4">
                  <a 
                    v-if="ticket.order"
                    :href="getCachedConfirmationUrl(ticket.order)" 
                    target="_blank" 
                    class="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-100 hover:bg-sky-100 transition shadow-sm"
                    title="Open confirmation page"
                  >
                    <i class="fas fa-external-link-alt text-[10px]"></i>
                    {{ ticket.order }}
                  </a>
                  <span v-else class="text-slate-400">-</span>
                </td>
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-900">{{ ticket.buyer || '-' }}</p>
                  <p class="text-xs text-slate-500">{{ ticket.buyerEmail || '' }}</p>
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-1.5">
                    <button 
                      class="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition shadow-sm" 
                      @click="editTicket(ticket)" 
                      title="Edit"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button 
                      v-if="ticket.buyer && ticket.buyerEmail" 
                      class="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition shadow-sm"
                      @click="resendEmail(ticket)" 
                      title="Resend email"
                      :disabled="isResending"
                    >
                      <i class="fas fa-envelope"></i>
                    </button>
                    <button 
                      class="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm" 
                      @click="deleteTicket(ticket.id)" 
                      title="Delete"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

        <!-- Error Messages -->
        <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 flex items-center justify-between gap-3">
          <div>
            <strong>Error:</strong> {{ error }}
          </div>
          <button class="text-xs font-semibold text-rose-600 underline" @click="loadTickets">Retry</button>
        </div>
      </div>

    <!-- Create/Edit Ticket Modal -->
    <div v-if="isTicketModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="isTicketModalOpen = false">
      <div class="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h5 class="text-lg font-semibold text-slate-900">{{ isEditingTicket ? 'Edit Ticket' : 'Create Ticket' }}</h5>
          <button class="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100" @click="isTicketModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto">
          <form class="space-y-4" @submit.prevent="saveTicket">
            <div>
              <label for="ticketDescription" class="block text-sm font-semibold text-slate-700 mb-2">Description *</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="ticketDescription" 
                v-model="ticketForm.description" 
                required
              >
            </div>
            <div>
              <label for="ticketPrice" class="block text-sm font-semibold text-slate-700 mb-2">Price *</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 text-sm">$</span>
                <input 
                  type="number" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="ticketPrice" 
                  v-model="ticketForm.price" 
                  step="0.01" 
                  min="0"
                  required
                >
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="ticketLocation" class="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                <input 
                  type="text" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="ticketLocation" 
                  v-model="ticketForm.location"
                >
              </div>
              <div>
                <label for="ticketTable" class="block text-sm font-semibold text-slate-700 mb-2">Table</label>
                <input 
                  type="number" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="ticketTable" 
                  v-model="ticketForm.table" 
                  min="1"
                >
              </div>
            </div>
            <div>
              <label for="ticketBuyer" class="block text-sm font-semibold text-slate-700 mb-2">Buyer</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="ticketBuyer" 
                v-model="ticketForm.buyer"
              >
            </div>
            <div>
              <label for="ticketBuyerDocument" class="block text-sm font-semibold text-slate-700 mb-2">Buyer Document</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="ticketBuyerDocument" 
                v-model="ticketForm.buyerDocument"
              >
            </div>
            <div>
              <label for="ticketBuyerEmail" class="block text-sm font-semibold text-slate-700 mb-2">Buyer Email</label>
              <input 
                type="email" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="ticketBuyerEmail" 
                v-model="ticketForm.buyerEmail"
              >
            </div>
            <div>
              <label for="ticketOrder" class="block text-sm font-semibold text-slate-700 mb-2">Order</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="ticketOrder" 
                v-model="ticketForm.order"
              >
            </div>
            <div>
              <label for="ticketSalesEndDateTime" class="block text-sm font-semibold text-slate-700 mb-2">Sales End Date & Time</label>
              <input 
                type="datetime-local" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="ticketSalesEndDateTime" 
                v-model="ticketForm.salesEndDateTime"
              >
              <p class="mt-2 text-xs text-slate-500">Optional: Set when ticket sales should end</p>
            </div>
            
            <!-- Check-in Status Section -->
            <div v-if="isEditingTicket" class="space-y-4 pt-4 border-t border-slate-100">
              <h6 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Check-in Status</h6>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div class="flex items-center gap-3 h-[42px]">
                  <input 
                    type="checkbox" 
                    class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                    id="ticketCheckedIn" 
                    v-model="ticketForm.checkedIn"
                    @change="onCheckedInChange"
                  >
                  <label class="text-sm font-semibold text-slate-700 flex items-center gap-2" for="ticketCheckedIn">
                    Checked In
                    <span v-if="ticketForm.checkedIn" class="text-emerald-500">
                      <i class="fas fa-check-circle"></i>
                    </span>
                  </label>
                </div>
                <div>
                  <label for="ticketCheckedInAt" class="block text-sm font-semibold text-slate-700 mb-2">Checked In At</label>
                  <input 
                    type="datetime-local" 
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                    id="ticketCheckedInAt" 
                    v-model="ticketForm.checkedInAt"
                    :disabled="!ticketForm.checkedIn"
                  >
                </div>
              </div>

              <!-- Accessory Pickup Status -->
              <h6 class="text-sm font-bold text-slate-900 uppercase tracking-wider pt-2">Accessory Pickup (Kit)</h6>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div class="flex items-center gap-3 h-[42px]">
                  <input 
                    type="checkbox" 
                    class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                    id="ticketAccessoryCollected" 
                    v-model="ticketForm.accessoryCollected"
                    @change="onAccessoryCollectedChange"
                  >
                  <label class="text-sm font-semibold text-slate-700 flex items-center gap-2" for="ticketAccessoryCollected">
                    Kit Picked Up
                    <span v-if="ticketForm.accessoryCollected" class="text-primary-500">
                      <i class="fas fa-box"></i>
                    </span>
                  </label>
                </div>
                <div>
                  <label for="ticketAccessoryCollectedAt" class="block text-sm font-semibold text-slate-700 mb-2">Picked Up At</label>
                  <input 
                    type="datetime-local" 
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                    id="ticketAccessoryCollectedAt" 
                    v-model="ticketForm.accessoryCollectedAt"
                    :disabled="!ticketForm.accessoryCollected"
                  >
                </div>
              </div>
              <div>
                <label for="ticketAccessoryCollectedNotes" class="block text-sm font-semibold text-slate-700 mb-2">Pickup Notes</label>
                <textarea 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="ticketAccessoryCollectedNotes" 
                  v-model="ticketForm.accessoryCollectedNotes" 
                  rows="2"
                  placeholder="Enter any observations about the kit pickup..."
                ></textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition" @click="isTicketModalOpen = false">Cancel</button>
          <button class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-500 transition disabled:opacity-60" @click="saveTicket" :disabled="isLoading">
            {{ isLoading ? 'Saving...' : 'Save Ticket' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Batch Create Modal -->
    <div v-if="isBatchModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="isBatchModalOpen = false">
      <div class="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h5 class="text-lg font-semibold text-slate-900">Batch Create Tickets</h5>
          <button class="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100" @click="isBatchModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto">
          <form class="space-y-4" @submit.prevent="saveBatchTickets">
            <div>
              <label for="batchDescription" class="block text-sm font-semibold text-slate-700 mb-2">Description *</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchDescription" 
                v-model="batchForm.description" 
                required
              >
            </div>
            <div>
              <label for="batchPrice" class="block text-sm font-semibold text-slate-700 mb-2">Price *</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 text-sm">$</span>
                <input 
                  type="number" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="batchPrice" 
                  v-model="batchForm.price" 
                  step="0.01" 
                  min="0"
                  required
                >
              </div>
            </div>
            <div>
              <label for="batchQuantity" class="block text-sm font-semibold text-slate-700 mb-2">Quantity *</label>
              <input 
                type="number" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchQuantity" 
                v-model="batchForm.quantity" 
                min="1" 
                max="100"
                required
              >
              <p class="mt-2 text-xs text-slate-500">Create between 1 and 100 tickets at once</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="batchLocation" class="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                <input 
                  type="text" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="batchLocation" 
                  v-model="batchForm.location"
                >
              </div>
              <div>
                <label for="batchTable" class="block text-sm font-semibold text-slate-700 mb-2">Table</label>
                <input 
                  type="number" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="batchTable" 
                  v-model="batchForm.table" 
                  min="1"
                >
              </div>
            </div>
            <div>
              <label for="batchBuyer" class="block text-sm font-semibold text-slate-700 mb-2">Buyer</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchBuyer" 
                v-model="batchForm.buyer"
              >
            </div>
            <div>
              <label for="batchBuyerDocument" class="block text-sm font-semibold text-slate-700 mb-2">Buyer Document</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchBuyerDocument" 
                v-model="batchForm.buyerDocument"
              >
            </div>
            <div>
              <label for="batchBuyerEmail" class="block text-sm font-semibold text-slate-700 mb-2">Buyer Email</label>
              <input 
                type="email" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchBuyerEmail" 
                v-model="batchForm.buyerEmail"
              >
            </div>
            <div>
              <label for="batchOrder" class="block text-sm font-semibold text-slate-700 mb-2">Order</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchOrder" 
                v-model="batchForm.order"
              >
            </div>
            <div>
              <label for="batchSalesEndDateTime" class="block text-sm font-semibold text-slate-700 mb-2">Sales End Date & Time</label>
              <input 
                type="datetime-local" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                id="batchSalesEndDateTime" 
                v-model="batchForm.salesEndDateTime"
              >
              <p class="mt-2 text-xs text-slate-500">Optional: Set when ticket sales should end (applies to all tickets)</p>
            </div>
          </form>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition" @click="isBatchModalOpen = false">Cancel</button>
          <button class="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-sky-600 transition disabled:opacity-60" @click="saveBatchTickets" :disabled="isLoading">
            {{ isLoading ? 'Creating...' : `Create ${batchForm.quantity || 0} Tickets` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Edit Modal -->
    <div v-if="isBulkEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="isBulkEditModalOpen = false">
      <div class="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h5 class="text-lg font-semibold text-slate-900">Bulk Edit {{ selectedTicketIds.length }} Ticket(s)</h5>
          <button class="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100" @click="isBulkEditModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto">
          <div class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700 flex items-start gap-3 mb-6">
            <i class="fas fa-info-circle text-sky-500 text-lg mt-0.5"></i>
            <p>Fill in fields to update them, or check "Clear" to set them as empty.</p>
          </div>
          <form class="space-y-4" @submit.prevent="saveBulkEdit">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="bulkLocation" class="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                <input 
                  type="text" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                  id="bulkLocation" 
                  v-model="bulkEditForm.location"
                  :disabled="bulkEditForm.clearLocation"
                  placeholder="Leave empty to skip"
                >
                <div class="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                    id="clearLocation" 
                    v-model="bulkEditForm.clearLocation"
                  >
                  <label class="text-xs text-slate-500 font-medium" for="clearLocation">
                    Clear this field
                  </label>
                </div>
              </div>
              <div>
                <label for="bulkTable" class="block text-sm font-semibold text-slate-700 mb-2">Table</label>
                <input 
                  type="number" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                  id="bulkTable" 
                  v-model="bulkEditForm.table" 
                  min="1"
                  :disabled="bulkEditForm.clearTable"
                  placeholder="Leave empty to skip"
                >
                <div class="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                    id="clearTable" 
                    v-model="bulkEditForm.clearTable"
                  >
                  <label class="text-xs text-slate-500 font-medium" for="clearTable">
                    Clear this field
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label for="bulkOrder" class="block text-sm font-semibold text-slate-700 mb-2">Order</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                id="bulkOrder" 
                v-model="bulkEditForm.order"
                :disabled="bulkEditForm.clearOrder"
                placeholder="Leave empty to skip"
              >
              <div class="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  id="clearOrder" 
                  v-model="bulkEditForm.clearOrder"
                >
                <label class="text-xs text-slate-500 font-medium" for="clearOrder">
                  Clear this field
                </label>
              </div>
            </div>
            <div>
              <label for="bulkBuyer" class="block text-sm font-semibold text-slate-700 mb-2">Buyer</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                id="bulkBuyer" 
                v-model="bulkEditForm.buyer"
                :disabled="bulkEditForm.clearBuyer"
                placeholder="Leave empty to skip"
              >
              <div class="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  id="clearBuyer" 
                  v-model="bulkEditForm.clearBuyer"
                >
                <label class="text-xs text-slate-500 font-medium" for="clearBuyer">
                  Clear this field
                </label>
              </div>
            </div>
            <div>
              <label for="bulkBuyerDocument" class="block text-sm font-semibold text-slate-700 mb-2">Buyer Document</label>
              <input 
                type="text" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                id="bulkBuyerDocument" 
                v-model="bulkEditForm.buyerDocument"
                :disabled="bulkEditForm.clearBuyerDocument"
                placeholder="Leave empty to skip"
              >
              <div class="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  id="clearBuyerDocument" 
                  v-model="bulkEditForm.clearBuyerDocument"
                >
                <label class="text-xs text-slate-500 font-medium" for="clearBuyerDocument">
                  Clear this field
                </label>
              </div>
            </div>
            <div>
              <label for="bulkBuyerEmail" class="block text-sm font-semibold text-slate-700 mb-2">Buyer Email</label>
              <input 
                type="email" 
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50" 
                id="bulkBuyerEmail" 
                v-model="bulkEditForm.buyerEmail"
                :disabled="bulkEditForm.clearBuyerEmail"
                placeholder="Leave empty to skip"
              >
              <div class="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  id="clearBuyerEmail" 
                  v-model="bulkEditForm.clearBuyerEmail"
                >
                <label class="text-xs text-slate-500 font-medium" for="clearBuyerEmail">
                  Clear this field
                </label>
              </div>
            </div>
            
            <div class="space-y-4 pt-4 border-t border-slate-100">
              <h6 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Check-in Status</h6>
              <div class="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  id="bulkCheckedIn" 
                  v-model="bulkEditForm.checkedIn"
                >
                <label class="text-sm font-semibold text-slate-700" for="bulkCheckedIn">
                  Mark as Checked In
                </label>
              </div>
              <div v-if="bulkEditForm.checkedIn">
                <label for="bulkCheckedInAt" class="block text-sm font-semibold text-slate-700 mb-2">Checked In At</label>
                <input 
                  type="datetime-local" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="bulkCheckedInAt" 
                  v-model="bulkEditForm.checkedInAt"
                >
                <p class="mt-2 text-xs text-slate-500">Leave empty to use current date/time</p>
              </div>
            </div>

            <div class="space-y-4 pt-4 border-t border-slate-100">
              <h6 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Accessory Pickup Status (Kit)</h6>
              <div class="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                  id="bulkAccessoryCollected" 
                  v-model="bulkEditForm.accessoryCollected"
                >
                <label class="text-sm font-semibold text-slate-700" for="bulkAccessoryCollected">
                  Mark as Kit Picked Up
                </label>
              </div>
              <div v-if="bulkEditForm.accessoryCollected">
                <label for="bulkAccessoryCollectedAt" class="block text-sm font-semibold text-slate-700 mb-2">Picked Up At</label>
                <input 
                  type="datetime-local" 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="bulkAccessoryCollectedAt" 
                  v-model="bulkEditForm.accessoryCollectedAt"
                >
                <p class="mt-2 text-xs text-slate-500">Leave empty to use current date/time</p>
              </div>
              <div>
                <label for="bulkAccessoryCollectedNotes" class="block text-sm font-semibold text-slate-700 mb-2">Pickup Notes</label>
                <textarea 
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500" 
                  id="bulkAccessoryCollectedNotes" 
                  v-model="bulkEditForm.accessoryCollectedNotes" 
                  rows="2"
                  placeholder="Leave empty to skip"
                ></textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition" @click="isBulkEditModalOpen = false">Cancel</button>
          <button class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-500 transition disabled:opacity-60" @click="saveBulkEdit" :disabled="isLoading">
            {{ isLoading ? 'Updating...' : `Update ${selectedTicketIds.length} Ticket(s)` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useUser } from '@/composables/useUser'
// REMOVED: import EasyDataTable

// Props and route
const route = useRoute()
const eventId = computed(() => route.params.id)
const publicLandingUrl = computed(() => (eventId.value ? `/event/${eventId.value}` : ''))

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
const isResending = ref(false)
const searchValue = ref('')
const selectedTicketIds = ref([])

// Sorting state
const sortKey = ref('identificationNumber')
const sortOrder = ref('asc')

// Filtering and Sorting Logic
const filteredTickets = computed(() => {
  if (!searchValue.value) return tickets.value
  
  const search = searchValue.value.toLowerCase()
  return tickets.value.filter(ticket => {
    return (
      ticket.description?.toLowerCase().includes(search) ||
      ticket.location?.toLowerCase().includes(search) ||
      ticket.buyer?.toLowerCase().includes(search) ||
      ticket.buyerEmail?.toLowerCase().includes(search) ||
      ticket.order?.toLowerCase().includes(search) ||
      ticket.identificationNumber?.toString().includes(search)
    )
  })
})

const sortedTickets = computed(() => {
  const temp = [...filteredTickets.value]
  temp.sort((a, b) => {
    let valA = a[sortKey.value]
    let valB = b[sortKey.value]
    
    if (valA === null || valA === undefined) valA = ''
    if (valB === null || valB === undefined) valB = ''
    
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  return temp
})

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

// Select All Logic
const isAllSelected = computed(() => {
  return sortedTickets.value.length > 0 && selectedTicketIds.value.length === sortedTickets.value.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedTicketIds.value = []
  } else {
    selectedTicketIds.value = sortedTickets.value.map(t => t.id)
  }
}

// Modal States
const isTicketModalOpen = ref(false)
const isBatchModalOpen = ref(false)
const isBulkEditModalOpen = ref(false)

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
  salesEndDateTime: '',
  checkedIn: false,
  checkedInAt: '',
  accessoryCollected: false,
  accessoryCollectedAt: '',
  accessoryCollectedNotes: ''
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

const bulkEditForm = reactive({
  location: '',
  table: '',
  order: '',
  buyer: '',
  buyerDocument: '',
  buyerEmail: '',
  checkedIn: false,
  checkedInAt: '',
  accessoryCollected: false,
  accessoryCollectedAt: '',
  accessoryCollectedNotes: '',
  clearLocation: false,
  clearTable: false,
  clearOrder: false,
  clearBuyer: false,
  clearBuyerDocument: false,
  clearBuyerEmail: false
})

// Headers are now handled directly in the template

// REMOVED: Bootstrap modals

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
    
    // Preload confirmation URLs for all orders in background
    if (tickets.value.length > 0) {
      preloadConfirmationUrls().catch(err => {
        console.debug('Some confirmation URLs could not be preloaded:', err)
      })
    }
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
  isTicketModalOpen.value = true
}

// Show batch create modal
const showBatchCreateModal = () => {
  resetBatchForm()
  isBatchModalOpen.value = true
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
    salesEndDateTime: ticket.salesEndDateTime ? new Date(ticket.salesEndDateTime).toISOString().slice(0, 16) : '',
    checkedIn: ticket.checkedIn || false,
    checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt).toISOString().slice(0, 16) : '',
    accessoryCollected: ticket.accessoryCollected || false,
    accessoryCollectedAt: ticket.accessoryCollectedAt ? new Date(ticket.accessoryCollectedAt).toISOString().slice(0, 16) : '',
    accessoryCollectedNotes: ticket.accessoryCollectedNotes || ''
  })
  
  isTicketModalOpen.value = true
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
    isTicketModalOpen.value = false
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
    isBatchModalOpen.value = false
    resetBatchForm()
    await loadTickets()
    await loadStats()
    
    error.value = null
  } catch (err) {
    console.error('Failed to create batch tickets:', err)
    error.value = err.message || 'Failed to create tickets'
  }
}

// Resend email for a ticket
const resendEmail = async (ticket) => {
  if (!ticket.buyerEmail) {
    error.value = 'Ticket does not have a buyer email'
    return
  }
  
  if (!confirm(`Resend email to ${ticket.buyerEmail}?`)) {
    return
  }
  
  try {
    isResending.value = true
    const result = await post(`/api/tickets/${ticket.id}/resend-email`, {})
    
    if (result.success) {
      alert(`Email successfully sent to ${ticket.buyerEmail}!`)
    }
    
    error.value = null
  } catch (err) {
    console.error('Failed to resend email:', err)
    error.value = err.message || 'Failed to resend email'
    alert(`Failed to resend email: ${err.message}`)
  } finally {
    isResending.value = false
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
    salesEndDateTime: '',
    checkedIn: false,
    checkedInAt: '',
    accessoryCollected: false,
    accessoryCollectedAt: '',
    accessoryCollectedNotes: ''
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

// Handle check-in status change
const onCheckedInChange = () => {
  if (ticketForm.checkedIn && !ticketForm.checkedInAt) {
    // If checking in and no date set, set current date/time
    ticketForm.checkedInAt = new Date().toISOString().slice(0, 16)
  } else if (!ticketForm.checkedIn) {
    // If unchecking, clear the check-in date
    ticketForm.checkedInAt = ''
  }
}

// Handle accessory pickup status change
const onAccessoryCollectedChange = () => {
  if (ticketForm.accessoryCollected && !ticketForm.accessoryCollectedAt) {
    // If marking as collected and no date set, set current date/time
    ticketForm.accessoryCollectedAt = new Date().toISOString().slice(0, 16)
  } else if (!ticketForm.accessoryCollected) {
    // If unmarking, clear the pickup date
    ticketForm.accessoryCollectedAt = ''
  }
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'No date'
  return new Date(dateString).toLocaleString()
}

// Store for cached confirmation URLs to avoid repeated API calls
const confirmationUrlCache = ref({})
const pendingUrls = new Set() // Track URLs being generated to prevent duplicate requests

// Generate confirmation URL synchronously without API calls
const getConfirmationUrl = (orderId) => {
  if (!orderId) return '#'
  
  // Check cache first
  if (confirmationUrlCache.value[orderId]) {
    return confirmationUrlCache.value[orderId]
  }
  
  // Return a simple base64 encoded URL (no API call needed for display)
  const baseUrl = window.location.origin
  const encodedId = btoa(orderId).replace(/[+/=]/g, '')
  return `${baseUrl}/confirmation/${encodedId}`
}

// Preload confirmation URLs for all orders in the tickets list
const preloadConfirmationUrls = async () => {
  // Get unique order IDs from tickets
  const orderIds = [...new Set(tickets.value.map(t => t.order).filter(Boolean))]
  
  // Only fetch URLs that aren't cached and aren't already being fetched
  const uncachedOrders = orderIds.filter(orderId => 
    !confirmationUrlCache.value[orderId] && !pendingUrls.has(orderId)
  )
  
  if (uncachedOrders.length === 0) return
  
  // Mark these orders as pending
  uncachedOrders.forEach(orderId => pendingUrls.add(orderId))
  
  // Fetch all hashes in parallel with error handling per order
  await Promise.allSettled(
    uncachedOrders.map(async (orderId) => {
      try {
        const response = await get(`/api/orders/${orderId}/confirmation-hash?eventId=${eventId.value}`)
        const baseUrl = window.location.origin
        confirmationUrlCache.value[orderId] = `${baseUrl}/confirmation/${response.hash}`
      } catch (error) {
        // Silently use fallback URL on error
        const baseUrl = window.location.origin
        const encodedId = btoa(orderId).replace(/[+/=]/g, '')
        confirmationUrlCache.value[orderId] = `${baseUrl}/confirmation/${encodedId}`
      } finally {
        pendingUrls.delete(orderId)
      }
    })
  )
}

// Get cached or computed confirmation URL for display
const getCachedConfirmationUrl = (orderId) => {
  if (!orderId) return '#'
  return getConfirmationUrl(orderId)
}

// Toggle ticket selection
const toggleTicketSelection = (ticketId) => {
  const index = selectedTicketIds.value.indexOf(ticketId)
  if (index > -1) {
    selectedTicketIds.value.splice(index, 1)
  } else {
    selectedTicketIds.value.push(ticketId)
  }
}

// Clear selection
const clearSelection = () => {
  selectedTicketIds.value = []
}

// Show bulk edit modal
const showBulkEditModal = () => {
  resetBulkEditForm()
  isBulkEditModalOpen.value = true
}

// Save bulk edit
const saveBulkEdit = async () => {
  try {
    // Build updates object with only filled fields or cleared fields
    const updates = {}
    
    // Handle location
    if (bulkEditForm.clearLocation) {
      updates.location = null
    } else if (bulkEditForm.location) {
      updates.location = bulkEditForm.location
    }
    
    // Handle table
    if (bulkEditForm.clearTable) {
      updates.table = null
    } else if (bulkEditForm.table) {
      updates.table = parseInt(bulkEditForm.table)
    }
    
    // Handle order
    if (bulkEditForm.clearOrder) {
      updates.order = null
    } else if (bulkEditForm.order) {
      updates.order = bulkEditForm.order
    }
    
    // Handle buyer
    if (bulkEditForm.clearBuyer) {
      updates.buyer = null
    } else if (bulkEditForm.buyer) {
      updates.buyer = bulkEditForm.buyer
    }
    
    // Handle buyerDocument
    if (bulkEditForm.clearBuyerDocument) {
      updates.buyerDocument = null
    } else if (bulkEditForm.buyerDocument) {
      updates.buyerDocument = bulkEditForm.buyerDocument
    }
    
    // Handle buyerEmail
    if (bulkEditForm.clearBuyerEmail) {
      updates.buyerEmail = null
    } else if (bulkEditForm.buyerEmail) {
      updates.buyerEmail = bulkEditForm.buyerEmail
    }
    
    // Handle checkedIn
    if (bulkEditForm.checkedIn !== undefined) {
      updates.checkedIn = bulkEditForm.checkedIn
    }
    
    // Handle checkedInAt
    if (bulkEditForm.checkedInAt) {
      updates.checkedInAt = bulkEditForm.checkedInAt
    }
    
    // Handle accessoryCollected
    if (bulkEditForm.accessoryCollected !== undefined) {
      updates.accessoryCollected = bulkEditForm.accessoryCollected
    }
    
    // Handle accessoryCollectedAt
    if (bulkEditForm.accessoryCollectedAt) {
      updates.accessoryCollectedAt = bulkEditForm.accessoryCollectedAt
    }

    // Handle accessoryCollectedNotes
    if (bulkEditForm.accessoryCollectedNotes) {
      updates.accessoryCollectedNotes = bulkEditForm.accessoryCollectedNotes
    }
    
    if (Object.keys(updates).length === 0) {
      error.value = 'Please fill at least one field to update or check a "Clear" option'
      return
    }
    
    const result = await post('/api/tickets/bulk-edit', {
      ticketIds: selectedTicketIds.value,
      updates
    })
    
    if (result.success) {
      // Close modal and reload
      isBulkEditModalOpen.value = false
      resetBulkEditForm()
      clearSelection()
      await loadTickets()
      await loadStats()
      error.value = null
    }
  } catch (err) {
    console.error('Failed to bulk edit tickets:', err)
    error.value = err.message || 'Failed to bulk edit tickets'
  }
}

// Confirm bulk delete
const confirmBulkDelete = () => {
  const count = selectedTicketIds.value.length
  if (confirm(`Are you sure you want to delete ${count} ticket(s)? This action cannot be undone.`)) {
    performBulkDelete()
  }
}

// Perform bulk delete
const performBulkDelete = async () => {
  try {
    const result = await post('/api/tickets/bulk-delete', {
      ticketIds: selectedTicketIds.value
    })
    
    if (result.success) {
      clearSelection()
      await loadTickets()
      await loadStats()
      error.value = null
    }
  } catch (err) {
    console.error('Failed to bulk delete tickets:', err)
    error.value = err.message || 'Failed to bulk delete tickets'
  }
}

// Reset bulk edit form
const resetBulkEditForm = () => {
  Object.assign(bulkEditForm, {
    location: '',
    table: '',
    order: '',
    buyer: '',
    buyerDocument: '',
    buyerEmail: '',
    checkedIn: false,
    checkedInAt: '',
    accessoryCollected: false,
    accessoryCollectedAt: '',
    accessoryCollectedNotes: '',
    clearLocation: false,
    clearTable: false,
    clearOrder: false,
    clearBuyer: false,
    clearBuyerDocument: false,
    clearBuyerEmail: false
  })
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
/* Custom animations or specific tweaks can go here */
</style>
