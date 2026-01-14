<template>
  <div class="nav-container mb-3">
    <nav class="navbar navbar-expand-md navbar-dark bg-primary">
      <div class="container">
        <router-link to="/" class="navbar-brand">
          <i class="fas fa-ticket-alt"></i>
          Ticketeer
        </router-link>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
                Dashboard
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/events" class="nav-link" :class="{ active: $route.path === '/events' }">
                Events
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/qr-checkin" class="nav-link" :class="{ active: $route.path === '/qr-checkin' }">
                <i class="fas fa-qrcode me-1"></i>
                Check-in
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/qr-accessory-pickup" class="nav-link" :class="{ active: $route.path === '/qr-accessory-pickup' }">
                <i class="fas fa-box me-1"></i>
                Retirada de Kit
              </router-link>
            </li>
          </ul>
          <ul class="navbar-nav d-none d-md-block">
            <li v-if="!isAuthenticated && !isLoading" class="nav-item">
              <button
                id="qsLoginBtn"
                class="btn btn-primary btn-margin"
                @click.prevent="login"
              >Login</button>
            </li>

            <li class="nav-item dropdown" v-if="isAuthenticated">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                id="profileDropDown"
                @click.prevent="toggleDropdown"
                :aria-expanded="isDropdownOpen"
                role="button"
              >
                <img
                  :src="user.picture"
                  alt="User's profile picture"
                  class="nav-user-profile rounded-circle"
                  width="50"
                />
              </a>
              <div class="dropdown-menu dropdown-menu-end" :class="{ show: isDropdownOpen }">
                <div class="dropdown-header">{{ user.name }}</div>
                <router-link to="/profile" class="dropdown-item dropdown-profile" @click="closeDropdown">
                  <font-awesome-icon class="mr-3" icon="user" />Profile
                </router-link>
                <a id="qsLogoutBtn" href="#" class="dropdown-item" @click.prevent="handleLogout">
                  <font-awesome-icon class="mr-3" icon="power-off" />Log out
                </a>
              </div>
            </li>
          </ul>

          <ul class="navbar-nav d-md-none" v-if="!isAuthenticated && !isLoading">
            <button id="qsLoginBtn" class="btn btn-primary btn-block" @click="login">Log in</button>
          </ul>

          <ul
            id="mobileAuthNavBar"
            class="navbar-nav d-md-none d-flex"
            v-if="isAuthenticated"
          >
            <li class="nav-item">
              <span class="user-info">
                <img
                  :src="user.picture"
                  alt="User's profile picture"
                  class="nav-user-profile d-inline-block rounded-circle mr-3"
                  width="50"
                />
                <h6 class="d-inline-block">{{ user.name }}</h6>
              </span>
            </li>
            <li>
              <font-awesome-icon icon="user" class="mr-3" />
              <router-link to="/profile">Profile</router-link>
            </li>

            <li>
              <font-awesome-icon icon="power-off" class="mr-3" />
              <a id="qsLogoutBtn" href="#" class @click.prevent="logout">Log out</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </div>
</template>

<script lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';
import { ref, onMounted, onUnmounted } from 'vue';

export default {
  name: "NavBar",
  setup() {
    const auth0 = useAuth0();
    const isDropdownOpen = ref(false);
    
    // Toggle dropdown function
    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value;
    };
    
    // Close dropdown function
    const closeDropdown = () => {
      isDropdownOpen.value = false;
    };
    
    // Handle logout and close dropdown
    const handleLogout = () => {
      closeDropdown();
      auth0.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    };
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: Event) => {
      const dropdown = document.getElementById('profileDropDown');
      const dropdownMenu = dropdown?.nextElementSibling;
      
      if (dropdown && dropdownMenu && 
          !dropdown.contains(event.target as Node) && 
          !dropdownMenu.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    
    // Add event listeners on mount
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });
    
    // Clean up event listeners on unmount
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });
    
    return {
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      user: auth0.user,
      isDropdownOpen,
      toggleDropdown,
      closeDropdown,
      handleLogout,
      login() {
        auth0.loginWithRedirect();
      },
      logout() {
        auth0.logout({
          logoutParams: {
            returnTo: window.location.origin
          }
        });
      }
    }
  }
};
</script>

<style>
#mobileAuthNavBar {
  min-height: 125px;
  justify-content: space-between;
}

/* Dropdown styles */
.dropdown-menu {
  display: none;
}

.dropdown-menu.show {
  display: block;
}

.nav-user-profile {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.nav-user-profile:hover {
  transform: scale(1.05);
}

.dropdown-toggle {
  cursor: pointer;
}

.dropdown-toggle:hover {
  text-decoration: none;
}
</style>
