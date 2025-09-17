<template>
  <div class="container py-5">
    <div class="row">
      <div class="col-12">
        <!-- Hero Section -->
        <div class="jumbotron bg-light p-5 rounded-3 text-center mb-5">
          <h1 class="display-4 fw-bold text-primary">Welcome to Ticketeer</h1>
          <p class="lead">The Ultimate Ticket Sales Management Platform</p>
          <hr class="my-4">
          <p class="mb-4">Discover amazing events and purchase tickets securely online</p>
          <div class="d-grid gap-2 d-md-flex justify-content-md-center" v-if="isAuthenticated">
            <router-link to="/events" class="btn btn-primary btn-lg me-md-2">Manage Events</router-link>
            <router-link to="/profile" class="btn btn-outline-secondary btn-lg">My Profile</router-link>
          </div>
          <div class="d-grid gap-2 d-md-flex justify-content-md-center" v-else>
            <button @click="login" class="btn btn-primary btn-lg me-md-2">Get Started</button>
            <button class="btn btn-outline-secondary btn-lg" disabled>Learn More</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dashboard Statistics - Only for Authenticated Users -->
    <div class="row g-4 mb-5" v-if="isAuthenticated">
      <div class="col-12">
        <h2 class="text-center mb-4">Your Dashboard Statistics</h2>
      </div>
      <div class="col-md-6 col-lg-3">
        <div class="card h-100 shadow-sm text-center">
          <div class="card-body">
            <div class="mb-3">
              <i class="fas fa-calendar-alt text-primary" style="font-size: 3rem;"></i>
            </div>
            <h3 class="card-title text-primary">{{ stats.totalActiveEvents || 0 }}</h3>
            <p class="card-text text-muted">Your Active Events</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3">
        <div class="card h-100 shadow-sm text-center">
          <div class="card-body">
            <div class="mb-3">
              <i class="fas fa-ticket-alt text-success" style="font-size: 3rem;"></i>
            </div>
            <h3 class="card-title text-success">{{ stats.totalTicketsSold || 0 }}</h3>
            <p class="card-text text-muted">Tickets Sold</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3">
        <div class="card h-100 shadow-sm text-center">
          <div class="card-body">
            <div class="mb-3">
              <i class="fas fa-dollar-sign text-warning" style="font-size: 3rem;"></i>
            </div>
            <h3 class="card-title text-warning">${{ formatCurrency(stats.totalRevenue || 0) }}</h3>
            <p class="card-text text-muted">Total Revenue</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3">
        <div class="card h-100 shadow-sm text-center">
          <div class="card-body">
            <div class="mb-3">
              <i class="fas fa-clock text-info" style="font-size: 3rem;"></i>
            </div>
            <h3 class="card-title text-info">{{ stats.upcomingEvents || 0 }}</h3>
            <p class="card-text text-muted">Upcoming Events</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Ticket Purchases - Only for Authenticated Users -->
    <div class="row" v-if="isAuthenticated">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h4 class="mb-0">
              <i class="fas fa-shopping-cart me-2"></i>
              Recent Ticket Sales
            </h4>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2 text-muted">Loading recent sales...</p>
            </div>
            
            <div v-else-if="recentPurchases.length === 0" class="text-center py-4">
              <i class="fas fa-ticket-alt text-muted" style="font-size: 3rem;"></i>
              <p class="mt-3 text-muted">No ticket sales yet</p>
              <router-link to="/events" class="btn btn-primary mt-2">
                Create Your First Event
              </router-link>
            </div>
            
            <div v-else class="table-responsive">
              <table class="table table-hover">
                <thead class="table-light">
                  <tr>
                    <th scope="col">Ticket #</th>
                    <th scope="col">Event</th>
                    <th scope="col">Venue</th>
                    <th scope="col">Location</th>
                    <th scope="col">Price</th>
                    <th scope="col">Buyer</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Sale Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="purchase in recentPurchases" :key="purchase.id">
                    <td>
                      <span class="badge bg-secondary">#{{ purchase.identificationNumber }}</span>
                    </td>
                    <td>
                      <strong>{{ purchase.eventName }}</strong>
                      <br>
                      <small class="text-muted">{{ formatEventDate(purchase.eventDate) }}</small>
                    </td>
                    <td>{{ purchase.venue }}</td>
                    <td>
                      <span v-if="purchase.location">{{ purchase.location }}</span>
                      <span v-if="purchase.table" class="badge bg-info ms-1">Table {{ purchase.table }}</span>
                      <span v-if="!purchase.location && !purchase.table" class="text-muted">General</span>
                    </td>
                    <td>
                      <span class="fw-bold text-success">${{ formatCurrency(purchase.price) }}</span>
                    </td>
                    <td>
                      <i class="fas fa-user me-1"></i>
                      {{ purchase.buyerDisplayName }}
                    </td>
                    <td>
                      <small v-if="purchase.buyerEmail" class="text-muted">
                        <i class="fas fa-envelope me-1"></i>
                        {{ purchase.buyerEmail }}
                      </small>
                      <small v-else class="text-muted">No contact</small>
                    </td>
                    <td>
                      <small class="text-muted">{{ formatPurchaseDate(purchase.purchaseDate) }}</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Welcome Section for Non-Authenticated Users -->
    <div class="row" v-if="!isAuthenticated">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-body text-center py-5">
            <i class="fas fa-ticket-alt text-primary" style="font-size: 5rem;"></i>
            <h3 class="mt-4 mb-3">Start Managing Your Events Today</h3>
            <p class="lead text-muted mb-4">
              Create events, sell tickets, and manage your ticket sales all in one place.
            </p>
            <div class="row g-3 justify-content-center">
              <div class="col-md-4">
                <div class="d-flex align-items-center">
                  <i class="fas fa-plus-circle text-primary me-3" style="font-size: 2rem;"></i>
                  <div class="text-start">
                    <h5 class="mb-1">Create Events</h5>
                    <small class="text-muted">Set up your events with ease</small>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="d-flex align-items-center">
                  <i class="fas fa-credit-card text-success me-3" style="font-size: 2rem;"></i>
                  <div class="text-start">
                    <h5 class="mb-1">Sell Tickets</h5>
                    <small class="text-muted">Secure online payments</small>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="d-flex align-items-center">
                  <i class="fas fa-chart-line text-info me-3" style="font-size: 2rem;"></i>
                  <div class="text-start">
                    <h5 class="mb-1">Track Sales</h5>
                    <small class="text-muted">Real-time analytics</small>
                  </div>
                </div>
              </div>
            </div>
            <button @click="login" class="btn btn-primary btn-lg mt-4 px-5">
              <i class="fas fa-sign-in-alt me-2"></i>
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Cards -->
    <div class="row g-4 justify-content-center mt-5" v-if="isAuthenticated">
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body text-center">
            <div class="mb-3">
              <i class="fas fa-plus-circle text-primary" style="font-size: 3rem;"></i>
            </div>
            <h5 class="card-title">Create Event</h5>
            <p class="card-text">Set up new events with ticket sales, venues, and dates all from one dashboard.</p>
            <router-link to="/events" class="btn btn-primary">Create Event</router-link>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body text-center">
            <div class="mb-3">
              <i class="fas fa-chart-bar text-success" style="font-size: 3rem;"></i>
            </div>
            <h5 class="card-title">Analytics</h5>
            <p class="card-text">Track sales performance, customer insights, and revenue analytics.</p>
            <router-link to="/events" class="btn btn-success">View Analytics</router-link>
          </div>
        </div>
      </div>
    </div>

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

<style scoped>
.jumbotron {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.jumbotron .text-primary {
  color: white !important;
}

.card {
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-5px);
}

.display-1 {
  font-size: 4rem;
}
</style>
