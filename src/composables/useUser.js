import { useAuth0 } from '@auth0/auth0-vue'
import { computed, reactive, ref } from 'vue'

// Global user state - this will be shared across all components
const globalUserState = reactive({
  // Auth0 states will be populated from the Auth0 composable
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null
})

// Access token state
const accessToken = ref(null)
const isLoadingToken = ref(false)
const tokenError = ref(null)

let auth0Instance = null

/**
 * Global user composable that provides centralized user state management
 * This composable ensures that user data is consistent across all components
 */
export function useUser() {
  // Get Auth0 instance if not already initialized
  if (!auth0Instance) {
    auth0Instance = useAuth0()
    
    // Watch Auth0 state changes and update global state
    const updateGlobalState = () => {
      globalUserState.isAuthenticated = auth0Instance.isAuthenticated.value
      globalUserState.isLoading = auth0Instance.isLoading.value
      globalUserState.user = auth0Instance.user.value
      globalUserState.error = auth0Instance.error.value
    }
    
    // Initial update
    updateGlobalState()
    
    // Watch for changes in Auth0 state
    if (typeof window !== 'undefined') {
      // Use a simple watcher pattern
      const watchAuth0State = () => {
        updateGlobalState()
        requestAnimationFrame(watchAuth0State)
      }
      watchAuth0State()
    }
  }

  // Get access token function
  const getAccessToken = async () => {
    if (!auth0Instance) return null
    
    try {
      isLoadingToken.value = true
      tokenError.value = null
      
      const token = await auth0Instance.getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://ticket.nova.money',
          scope: 'read:events write:events delete:events'
        }
      })
      
      accessToken.value = token
      return token
    } catch (error) {
      console.error('Error getting access token:', error)
      tokenError.value = error.message || 'Failed to get access token'
      return null
    } finally {
      isLoadingToken.value = false
    }
  }

  // Refresh access token
  const refreshAccessToken = async () => {
    accessToken.value = null
    return await getAccessToken()
  }

  // Login function
  const login = () => {
    if (auth0Instance) {
      auth0Instance.loginWithRedirect()
    }
  }

  // Logout function
  const logout = () => {
    if (auth0Instance) {
      auth0Instance.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      })
    }
  }

  // Computed properties for easier access
  const isAuthenticated = computed(() => globalUserState.isAuthenticated)
  const isLoading = computed(() => globalUserState.isLoading)
  const user = computed(() => globalUserState.user)
  const error = computed(() => globalUserState.error)

  // User display helpers
  const userName = computed(() => user.value?.name || 'User')
  const userEmail = computed(() => user.value?.email || '')
  const userPicture = computed(() => user.value?.picture || '')
  const userId = computed(() => user.value?.sub || '')

  return {
    // Authentication state
    isAuthenticated,
    isLoading,
    user,
    error,
    
    // User data helpers
    userName,
    userEmail,
    userPicture,
    userId,
    
    // Access token management
    accessToken,
    isLoadingToken,
    tokenError,
    getAccessToken,
    refreshAccessToken,
    
    // Auth actions
    login,
    logout,
    
    // Direct Auth0 instance access (for advanced use cases)
    auth0: auth0Instance
  }
}
