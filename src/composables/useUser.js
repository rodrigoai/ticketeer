import { useAuth0 } from '@auth0/auth0-vue'
import { computed, reactive, ref, watch } from 'vue'
import { tokenConfig, auth0Config } from '@/config/auth0.js'

// Global user state - this will be shared across all components
// IMPORTANT: Don't initialize with hardcoded values - let Auth0 SDK set the initial state
let auth0Instance = null
let isInitialized = false

const globalUserState = reactive({
    // These will be populated from the Auth0 SDK's actual state
    isAuthenticated: null, // null indicates not yet initialized
    isLoading: null,       // null indicates not yet initialized  
    user: null,
    error: null
  })
const accessToken = ref(null)
const isLoadingToken = ref(false)
const tokenError = ref(null)
// Singleton Auth0 instance and initialization flag


// Global computed properties (singletons)
const isAuthenticated = computed(() => globalUserState.isAuthenticated ?? false) // Default to false if null
const isLoading = computed(() => globalUserState.isLoading ?? true) // Default to true if null (still loading)
const user = computed(() => globalUserState.user)
const error = computed(() => globalUserState.error)

// User display helpers (singletons)
const userName = computed(() => user.value?.name || 'User')
const userEmail = computed(() => user.value?.email || '')
const userPicture = computed(() => user.value?.picture || '')
const userId = computed(() => user.value?.sub || '')

// Initialize Auth0 and watchers only once
const initializeAuth0 = () => {
  if (!auth0Instance && !isInitialized) {
    auth0Instance = useAuth0()
    isInitialized = true
    
    // Immediately sync initial state from Auth0 SDK
    // This ensures we get the current Auth0 state, not our hardcoded defaults
    globalUserState.isAuthenticated = auth0Instance.isAuthenticated.value
    globalUserState.isLoading = auth0Instance.isLoading.value
    globalUserState.user = auth0Instance.user.value
    globalUserState.error = auth0Instance.error.value
    
    // Watch Auth0 state changes and update global state using Vue's watch API
    // This watcher will be created only ONCE for the entire application
    watch(
      [auth0Instance.isAuthenticated, auth0Instance.isLoading, auth0Instance.user, auth0Instance.error],
      ([isAuth, loading, userData, errorData]) => {
        globalUserState.isAuthenticated = isAuth
        globalUserState.isLoading = loading
        globalUserState.user = userData
        globalUserState.error = errorData
      },
      { immediate: false } // Don't run immediately since we already synced above
    )
  }
}

/**
 * Global user composable that provides centralized user state management
 * This composable ensures that user data is consistent across all components
 */
export function useUser() {
  // Initialize Auth0 only once
  initializeAuth0()

  // Get access token function - Fixed to prevent unexpected logouts
  const getAccessToken = async () => {
    // Ensure Auth0 is initialized (fallback safety)
    initializeAuth0()
    
    // Check if user is still authenticated before attempting token retrieval
    if (!auth0Instance.isAuthenticated.value) {
      console.warn('User is not authenticated, cannot get access token')
      tokenError.value = 'User is not authenticated'
      return null
    }
    
    try {
      isLoadingToken.value = true
      tokenError.value = null
      
      // Clear any existing token to force a fresh one
      // This prevents using expired/invalid cached tokens
      accessToken.value = null
      
      // Use minimal configuration to avoid scope/audience issues
      const tokenOptions = {
        authorizationParams: {
          audience: auth0Config.audience
          // Removed custom scopes that might cause issues
          // Auth0 will use the default scopes from the application settings
        }
      }
      
      console.log('Requesting access token with options:', tokenOptions)
      
      const token = await auth0Instance.getAccessTokenSilently(tokenOptions)
      
      if (!token) {
        throw new Error('No token returned from Auth0')
      }
      
      accessToken.value = token
      console.log('Access token retrieved successfully')
      return token
      
    } catch (error) {
      console.error('Error getting access token:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        error: error.error,
        error_description: error.error_description
      })
      
      // Handle specific Auth0 errors that shouldn't cause logout
      if (error.error === 'login_required' || error.error === 'consent_required') {
        console.warn('Auth0 requires re-authentication, but not logging out')
        tokenError.value = 'Authentication required for token access'
        return null
      }
      
      // Handle other errors gracefully without triggering logout
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
  
  // Get access token with minimal options (safer version)
  const getAccessTokenSimple = async () => {
    initializeAuth0()
    
    if (!auth0Instance.isAuthenticated.value) {
      console.warn('User not authenticated for simple token request')
      return null
    }
    
    try {
      isLoadingToken.value = true
      tokenError.value = null
      
      // Use the most minimal configuration possible
      const token = await auth0Instance.getAccessTokenSilently()
      
      console.log('Simple token request successful')
      return token
      
    } catch (error) {
      console.error('Simple token request failed:', error.message)
      tokenError.value = error.message
      return null
    } finally {
      isLoadingToken.value = false
    }
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

  // Return the singleton computed properties (not creating new ones each time)

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
    getAccessTokenSimple,    // 🆕 Safer token retrieval method
    refreshAccessToken,
    
    // Auth actions
    login,
    logout,
    
    // Direct Auth0 instance access (for advanced use cases)
    auth0: auth0Instance
  }
}
