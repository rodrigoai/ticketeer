<template>
  <header class="bg-white border-b border-slate-200 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-3 gap-4">
        <router-link
          to="/dashboard"
          class="flex items-center gap-2 text-lg font-semibold text-slate-900 tracking-tight"
        >
          <i class="fas fa-ticket-alt text-primary-600 text-xl"></i>
          <span>Ticketeer</span>
        </router-link>

        <div class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <router-link
            to="/dashboard"
            class="px-2 py-1 rounded-lg transition hover:text-slate-900 hover:bg-slate-100"
            :class="{ 'text-slate-900 bg-slate-100': $route.path === '/dashboard' }"
          >
            Dashboard
          </router-link>
          <router-link
            to="/events"
            class="px-2 py-1 rounded-lg transition hover:text-slate-900 hover:bg-slate-100"
            :class="{ 'text-slate-900 bg-slate-100': $route.path === '/events' }"
          >
            Events
          </router-link>
          <router-link
            to="/qr-checkin"
            class="px-2 py-1 rounded-lg transition hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-2"
            :class="{ 'text-slate-900 bg-slate-100': $route.path === '/qr-checkin' }"
          >
            <i class="fas fa-qrcode text-base"></i>
            Check-in
          </router-link>
          <router-link
            to="/qr-accessory-pickup"
            class="px-2 py-1 rounded-lg transition hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-2"
            :class="{ 'text-slate-900 bg-slate-100': $route.path === '/qr-accessory-pickup' }"
          >
            <i class="fas fa-box text-base"></i>
            Retirada de Kit
          </router-link>
        </div>

        <div class="flex items-center gap-3">
          <div v-if="!isAuthenticated && !isLoading">
            <button
              class="px-4 py-1.5 rounded-full border border-primary-600 bg-primary-600 text-white text-sm font-semibold transition hover:bg-primary-700"
              @click.prevent="login"
            >
              Login
            </button>
          </div>

          <div v-else-if="isAuthenticated" class="relative">
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:border-slate-300 transition"
              @click="toggleDropdown"
              :aria-expanded="isDropdownOpen"
              ref="dropdownToggle"
            >
              <img
                :src="user.picture"
                alt="User profile"
                class="w-9 h-9 rounded-full object-cover"
              />
              <div class="hidden sm:flex flex-col text-left text-xs">
                <span class="font-semibold text-slate-800">{{ user.name }}</span>
                <small class="text-slate-500">{{ user.email }}</small>
              </div>
              <i class="fas fa-chevron-down text-slate-500 text-xs"></i>
            </button>

            <div
              v-if="isDropdownOpen"
              class="absolute right-0 z-10 mt-2 w-44 rounded-2xl bg-white border border-slate-200 shadow-lg py-2"
              ref="dropdownMenu"
            >
              <router-link
                to="/profile"
                class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                @click="closeDropdown"
              >
                <i class="fas fa-user text-xs text-slate-500"></i>
                Profile
              </router-link>
              <button
                class="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                @click.prevent="handleLogout"
              >
                <i class="fas fa-power-off text-xs text-slate-500"></i>
                Log out
              </button>
            </div>
          </div>

          <button
            class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            @click="toggleMobileMenu"
            ref="mobileToggle"
            aria-label="Toggle menu"
          >
            <i class="fas fa-bars text-lg"></i>
          </button>
        </div>
      </div>

      <div
        v-if="isMobileMenuOpen"
        class="md:hidden border-t border-slate-200 pb-3"
        ref="mobileMenu"
      >
        <div class="flex flex-col gap-2 px-2 pt-2">
          <router-link
            to="/dashboard"
            class="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            :class="{ 'bg-slate-100 text-slate-900': $route.path === '/dashboard' }"
            @click="closeMobileMenu"
          >
            Dashboard
          </router-link>
          <router-link
            to="/events"
            class="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            :class="{ 'bg-slate-100 text-slate-900': $route.path === '/events' }"
            @click="closeMobileMenu"
          >
            Events
          </router-link>
          <router-link
            to="/qr-checkin"
            class="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
            :class="{ 'bg-slate-100 text-slate-900': $route.path === '/qr-checkin' }"
            @click="closeMobileMenu"
          >
            <i class="fas fa-qrcode text-base"></i>
            Check-in
          </router-link>
          <router-link
            to="/qr-accessory-pickup"
            class="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
            :class="{ 'bg-slate-100 text-slate-900': $route.path === '/qr-accessory-pickup' }"
            @click="closeMobileMenu"
          >
            <i class="fas fa-box text-base"></i>
            Retirada de Kit
          </router-link>

          <div class="pt-2 border-t border-slate-100">
            <div v-if="!isAuthenticated && !isLoading">
              <button
                class="w-full px-3 py-2 rounded-lg border border-primary-600 bg-primary-600 text-white font-semibold text-sm"
                @click.prevent="handleMobileLogin"
              >
                Login
              </button>
            </div>
            <div v-else-if="isAuthenticated" class="flex flex-col gap-2 mt-2">
              <router-link
                to="/profile"
                class="px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition"
                @click="closeMobileMenu"
              >
                Profile
              </router-link>
              <button
                class="px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition text-left"
                @click.prevent="handleLogout"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';
import { ref, onMounted, onUnmounted } from 'vue';

export default {
  name: "NavBar",
  setup() {
    const auth0 = useAuth0();
    const isDropdownOpen = ref(false);
    const isMobileMenuOpen = ref(false);
    const dropdownToggle = ref<HTMLElement | null>(null);
    const dropdownMenu = ref<HTMLElement | null>(null);
    const mobileMenu = ref<HTMLElement | null>(null);
    const mobileToggle = ref<HTMLElement | null>(null);

    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value;
    };

    const closeDropdown = () => {
      isDropdownOpen.value = false;
    };

    const toggleMobileMenu = () => {
      isMobileMenuOpen.value = !isMobileMenuOpen.value;
    };

    const closeMobileMenu = () => {
      isMobileMenuOpen.value = false;
    };

    const login = () => {
      auth0.loginWithRedirect();
      closeMobileMenu();
    };

    const handleLogout = () => {
      closeDropdown();
      closeMobileMenu();
      auth0.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    };

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (dropdownToggle.value && dropdownMenu.value &&
          !dropdownToggle.value.contains(target) &&
          !dropdownMenu.value.contains(target)) {
        closeDropdown();
      }

      if (mobileMenu.value && mobileToggle.value &&
          !mobileMenu.value.contains(target) &&
          !mobileToggle.value.contains(target)) {
        closeMobileMenu();
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      user: auth0.user,
      isDropdownOpen,
      isMobileMenuOpen,
      toggleDropdown,
      closeDropdown,
      toggleMobileMenu,
      closeMobileMenu,
      handleLogout,
      handleMobileLogin: login,
      dropdownToggle,
      dropdownMenu,
      mobileMenu,
      mobileToggle,
      login
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
