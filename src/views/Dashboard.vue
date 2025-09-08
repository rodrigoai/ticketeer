<template>
  <div class="container py-5">
    <div class="row">
      <div class="col-12">
        <!-- Hero Section -->
        <div class="jumbotron bg-light p-5 rounded-3 text-center mb-5">
          <h1 class="display-4 fw-bold text-primary">Hello, {{ userName }}</h1>
          <p class="lead">Finalmenteeeebbbbbbb</p>
          <hr class="my-4">
          <p class="mb-4">Welcome to Ticketeer! We're excited to have you on board.</p>
          <div class="d-grid gap-2 d-md-flex justify-content-md-center">
            <router-link to="/events" class="btn btn-primary btn-lg me-md-2">Create Event</router-link>
            <button class="btn btn-outline-secondary btn-lg" disabled>More features coming soon</button>
          </div>
        </div>
      </div>
    </div>
<div v-if="isAuthenticated" class="nav-item">
            <b>Autenticado</b>
</div>
    <!-- Feature Cards -->
    <div class="row g-4 justify-content-center">
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body text-center">
            <div class="mb-3">
              <span class="display-1">🎪</span>
            </div>
            <h5 class="card-title">Event Management</h5>
            <p class="card-text">Create and manage events with ease. Set ticket prices, venues, and dates all from one dashboard.</p>
            <router-link to="/events" class="btn btn-primary">Manage Events</router-link>
          </div>
        </div>
      </div>
      
    </div>

  </div>
</template>

<script setup>
import { useUser } from '@/composables/useUser'

// Get user from centralized user state
const { user, isAuthenticated, userName } = useUser()
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
