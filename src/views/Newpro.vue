<template>
  <div class="container py-5">
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">Loading user profile...</p>
    </div>

    <!-- Not Authenticated State -->
    <div v-else-if="!isAuthenticated" class="text-center">
      <div class="mb-4">
        <span class="display-1">🔒</span>
      </div>
      <h4>Not Authenticated</h4>
      <p class="text-muted mb-4">Please log in to view your profile.</p>
      <button class="btn btn-primary" @click="login">
        <i class="fas fa-sign-in-alt"></i> Login
      </button>
    </div>

    <!-- User Profile Display -->
    <div v-else class="row align-items-center profile-header">
      <div class="col-md-3 mb-4 text-center">
        <h3 class="mb-3 text-primary">New Profile View</h3>
        <img
          :src="userPicture"
          :alt="`${userName}'s profile picture`"
          class="rounded-circle img-fluid profile-picture shadow"
          style="max-width: 150px; height: 150px; object-fit: cover;"
        />
      </div>
      <div class="col-md-9">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h4 class="mb-0">
              <i class="fas fa-user me-2"></i>
              User Profile Information
            </h4>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-sm-4">
                <h6 class="mb-0">Full Name</h6>
              </div>
              <div class="col-sm-8 text-muted">
                {{ userName }}
              </div>
            </div>
            <hr>
            <div class="row">
              <div class="col-sm-4">
                <h6 class="mb-0">Email</h6>
              </div>
              <div class="col-sm-8 text-muted">
                {{ userEmail }}
              </div>
            </div>
            <hr>
            <div class="row">
              <div class="col-sm-4">
                <h6 class="mb-0">User ID</h6>
              </div>
              <div class="col-sm-8 text-muted">
                <code>{{ userId }}</code>
              </div>
            </div>
            <hr>
            <div class="row">
              <div class="col-sm-4">
                <h6 class="mb-0">Access Token</h6>
              </div>
              <div class="col-sm-8 text-muted">
                <code>{{ accessToken }}</code>
              </div>
            </div>
            <hr>
            <div class="row">
              <div class="col-sm-4">
                <h6 class="mb-0">Authentication Status</h6>
              </div>
              <div class="col-sm-8">
                <span class="badge bg-success">
                  <i class="fas fa-check-circle me-1"></i>
                  Authenticated
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 d-flex gap-2">
          <button class="btn btn-outline-primary" @click="getAccessToken">
            <i class="fas fa-key me-1"></i>
            Get Access Token
          </button>
          <button class="btn btn-outline-secondary" @click="refreshAccessToken">
            <i class="fas fa-sync-alt me-1"></i>
            Refresh Token
          </button>
          <button class="btn btn-outline-danger" @click="logout">
            <i class="fas fa-sign-out-alt me-1"></i>
            Logout
          </button>
        </div>

        <!-- Token Display (if available) -->
        <div v-if="accessToken" class="mt-4">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="fas fa-shield-alt me-2"></i>
                Access Token
              </h6>
            </div>
            <div class="card-body">
              <div class="input-group">
                <textarea 
                  class="form-control font-monospace" 
                  :value="accessToken" 
                  readonly 
                  rows="3"
                  style="font-size: 0.8rem; word-break: break-all;"
                ></textarea>
                <button 
                  class="btn btn-outline-secondary" 
                  type="button" 
                  @click="copyTokenToClipboard"
                >
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Token State -->
        <div v-if="isLoadingToken" class="mt-4">
          <div class="alert alert-info">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            Loading access token...
          </div>
        </div>

        <!-- Token Error State -->
        <div v-if="tokenError" class="mt-4">
          <div class="alert alert-danger">
            <strong>Token Error:</strong> {{ tokenError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { useUser } from '@/composables/useUser'

// Get all user state and functions from centralized composable
const {
  // Authentication state
  user,
  isAuthenticated,
  isLoading,
  error,
  
  // User data helpers
  userName,
  userEmail,
  userPicture,
  userId,
  
  // Token management
  accessToken,
  isLoadingToken,
  tokenError,
  getAccessToken,
  refreshAccessToken,
  
  // Auth actions
  login,
  logout
} = useUser()



// Copy token to clipboard
const copyTokenToClipboard = async () => {
  if (accessToken.value) {
    try {
      await navigator.clipboard.writeText(accessToken.value)
      // Simple success feedback (you could enhance with toast notifications)
      console.log('Token copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy token:', err)
    }
  }
}
</script>
