<template>
  <div id="app">

    

    <!-- Navigation -->
     <nav-bar />
    

    <!-- Main Content -->
    <main>
      <router-view />
    </main>

    <!-- User Profile Modal -->
    <div class="modal fade" id="userProfileModal" tabindex="-1" v-if="isAuthenticated && user">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">User Profile</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="text-center mb-3">
              <img :src="user.picture" :alt="user.name" class="rounded-circle mb-2" width="64" height="64">
              <h6>{{ user.name }}</h6>
              <p class="text-muted">{{ user.email }}</p>
            </div>
            <div class="row">
              <div class="col-6">
                <strong>User ID:</strong>
              </div>
              <div class="col-6">
                <code>{{ user.sub }}</code>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { useUser } from './composables/useUser'
import NavBar from "./components/NavBar.vue";

// Use centralized user state for profile modal
const { user, isAuthenticated } = useUser()

// View user profile function
const viewProfile = () => {
  const modal = new bootstrap.Modal(document.getElementById('userProfileModal'))
  modal.show()
}
</script>


<style scoped>
.navbar-brand i {
  margin-right: 0.5rem;
}

.nav-link.active {
  font-weight: 600;
}

main {
  min-height: calc(100vh - 56px);
  background-color: #f8f9fa;
}
</style>
