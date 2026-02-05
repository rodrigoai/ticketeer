<template>
  <div class="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <section class="rounded-3xl bg-gradient-to-r from-primary-600 to-violet-600 text-white p-6 md:p-10 shadow-xl">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.35em] text-white/70">Dashboard</p>
          <h1 class="text-3xl md:text-4xl font-semibold mt-2">
            {{ isAuthenticated ? `Welcome back, ${userName || user?.name || 'Organizer'}` : 'Welcome to Ticketeer' }}
          </h1>
          <p class="mt-3 text-white/80 max-w-2xl">
            {{ isAuthenticated
              ? 'View your latest sales, manage attendees, and keep check-in flowing smoothly.'
              : 'Log in to bring your events online, sell tickets securely, and keep track of every attendee.' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-3 justify-start md:justify-end">
          <router-link
            to="/events"
            class="px-4 py-2 rounded-full font-semibold bg-white text-primary-600 shadow-md hover:bg-slate-100 transition"
            v-if="isAuthenticated"
          >
            Manage Events
          </router-link>
          <button
            v-if="!isAuthenticated"
            class="px-4 py-2 rounded-full font-semibold border border-white/60 text-white hover:bg-white/10 transition flex items-center gap-2"
            @click="login"
          >
            <i class="fas fa-sign-in-alt"></i>
            Get Started
          </button>
          <router-link
            v-else
            to="/profile"
            class="px-4 py-2 rounded-full font-semibold border border-white/50 text-white hover:bg-white/10 transition flex items-center gap-2"
          >
            <i class="fas fa-user"></i>
            View Profile
          </router-link>
        </div>
      </div>
    </section>

    <section v-if="isAuthenticated" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-lg text-slate-500">Active Events</span>
          <i class="fas fa-calendar-days text-primary-500 text-xl"></i>
        </div>
        <p class="mt-6 text-3xl font-semibold text-slate-900">{{ stats.totalActiveEvents || 0 }}</p>
        <p class="mt-1 text-xs uppercase tracking-[0.35em] text-slate-400">Live</p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-lg text-slate-500">Tickets Sold</span>
          <i class="fas fa-ticket-alt text-emerald-500 text-xl"></i>
        </div>
        <p class="mt-6 text-3xl font-semibold text-slate-900">{{ stats.totalTicketsSold || 0 }}</p>
        <p class="mt-1 text-xs uppercase tracking-[0.35em] text-slate-400">All time</p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-lg text-slate-500">Revenue</span>
          <i class="fas fa-dollar-sign text-amber-500 text-xl"></i>
        </div>
        <p class="mt-6 text-3xl font-semibold text-slate-900">${{ formatCurrency(stats.totalRevenue || 0) }}</p>
        <p class="mt-1 text-xs uppercase tracking-[0.35em] text-slate-400">Collected</p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-lg text-slate-500">Upcoming Events</span>
          <i class="fas fa-clock text-sky-500 text-xl"></i>
        </div>
        <p class="mt-6 text-3xl font-semibold text-slate-900">{{ stats.upcomingEvents || 0 }}</p>
        <p class="mt-1 text-xs uppercase tracking-[0.35em] text-slate-400">Next 90 days</p>
      </div>
    </section>

    <section v-if="isAuthenticated" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Recent ticket sales</p>
          <h2 class="text-xl font-semibold text-slate-900">Recent Purchases</h2>
        </div>
        <router-link to="/events" class="text-sm font-semibold text-primary-600 hover:text-primary-500">
          View all events →
        </router-link>
      </div>

      <div class="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full caption-bottom text-left text-sm text-slate-600">
            <caption class="sr-only">List of recent ticket purchases</caption>
            <thead class="border-b bg-slate-50 text-slate-500 uppercase text-[0.65rem] tracking-[0.4em]">
              <tr>
                <th class="px-5 py-3 font-semibold">Ticket</th>
                <th class="px-5 py-3 font-semibold">Event</th>
                <th class="px-5 py-3 font-semibold">Location</th>
                <th class="px-5 py-3 font-semibold">Price</th>
                <th class="px-5 py-3 font-semibold">Buyer</th>
                <th class="px-5 py-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading" class="divide-y">
                <td colspan="6" class="px-5 py-8 text-center text-slate-500">
                  <div class="inline-flex items-center gap-2 text-slate-500">
                    <span class="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin"></span>
                    Loading recent sales...
                  </div>
                </td>
              </tr>
              <tr v-else-if="recentPurchases.length === 0" class="divide-y">
                <td colspan="6" class="px-5 py-8 text-center text-slate-500">
                  No purchases yet. Create an event to start selling tickets!
                </td>
              </tr>
              <tr
                v-else
                v-for="purchase in recentPurchases"
                :key="purchase.id"
                class="border-b last:border-b-0"
              >
                <td class="px-5 py-4">
                  <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    #{{ purchase.identificationNumber }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-900">{{ purchase.eventName }}</p>
                  <p class="text-xs text-slate-500">{{ formatEventDate(purchase.eventDate) }}</p>
                </td>
                <td class="px-5 py-4">
                  <p class="text-slate-700">{{ purchase.venue }}</p>
                  <p class="text-xs text-slate-500">
                    {{ purchase.table ? `Table ${purchase.table}` : purchase.location || 'General' }}
                  </p>
                </td>
                <td class="px-5 py-4">
                  <span class="text-sm font-semibold text-emerald-600">${{ formatCurrency(purchase.price) }}</span>
                </td>
                <td class="px-5 py-4">
                  <p class="font-semibold">{{ purchase.buyerDisplayName }}</p>
                  <p class="text-xs text-slate-500">{{ purchase.buyerEmail || 'No contact' }}</p>
                </td>
                <td class="px-5 py-4 text-right">
                  <p class="text-sm font-semibold text-slate-900">{{ formatPurchaseDate(purchase.purchaseDate) }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else class="grid gap-6 md:grid-cols-3">
      <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <i class="fas fa-plus-circle text-xl"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-900">Create Events</p>
            <p class="text-xs text-slate-500">Launch ticketed experiences in minutes.</p>
          </div>
        </div>
        <p class="text-sm text-slate-500">
          Tailor every detail—venue, pricing, and sales windows—then publish instantly.
        </p>
      </div>
      <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <i class="fas fa-credit-card text-xl"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-900">Sell Tickets</p>
            <p class="text-xs text-slate-500">Secure checkout with QR code delivery.</p>
          </div>
        </div>
        <p class="text-sm text-slate-500">
          Accept orders online, assign seats, and keep buyers informed with email confirmations.
        </p>
      </div>
      <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <i class="fas fa-chart-line text-xl"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-900">Track Sales</p>
            <p class="text-xs text-slate-500">Analytics and reconcilation at a glance.</p>
          </div>
        </div>
        <p class="text-sm text-slate-500">
          Monitor revenue, see ticket availability, and verify check-ins in real time.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { useUser } from '@/composables/useUser'
import { useApi } from '@/composables/useApi'

// Get user from centralized user state
const { user, isAuthenticated, userName } = useUser()
const { loginWithRedirect } = useAuth0()
const { get } = useApi()

// Reactive data
const loading = ref(true)
const stats = ref({
  totalActiveEvents: 0,
  totalTicketsSold: 0,
  totalRevenue: 0,
  upcomingEvents: 0
})
const recentPurchases = ref([])

// Methods
const login = () => {
  loginWithRedirect()
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

const formatEventDate = (dateString) => {
  if (!dateString) return 'TBA'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatPurchaseDate = (dateString) => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return 'Today'
  } else if (diffDays === 2) {
    return 'Yesterday'
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }
}

const fetchDashboardStats = async () => {
  if (!isAuthenticated.value) return
  
  try {
    const response = await get('/api/dashboard/stats', {
      method: 'GET'
    })
    
    if (response.success) {
      stats.value = response.stats
      console.error('Stats Value:', response.stats)
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    // Keep default values
  }
}

const fetchRecentPurchases = async () => {
  if (!isAuthenticated.value) return
  
  try {
    const response = await get('/api/dashboard/recent-purchases', {
      method: 'GET'
    })
    
    if (response.success) {
      recentPurchases.value = response.purchases
    }
  } catch (error) {
    console.error('Error fetching recent purchases:', error)
    // Keep empty array
  }
}

const loadDashboardData = async () => {
  if (!isAuthenticated.value) {
    loading.value = false
    return
  }
  
  loading.value = true
  try {
    await Promise.all([
      fetchDashboardStats(),
      fetchRecentPurchases()
    ])
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Only load data if authenticated
  if (isAuthenticated.value) {
    loadDashboardData()
  } else {
    loading.value = false
  }
})
</script>
