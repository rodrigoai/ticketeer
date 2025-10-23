import { ref } from 'vue'
import { useUser } from './useUser'

// Global token cache shared across all useApi instances
let cachedToken = null
let tokenExpiryTime = null
const TOKEN_CACHE_DURATION = 50 * 60 * 1000 // 50 minutes (tokens typically expire in 60 mins)

export function useApi() {
  const isLoading = ref(false)
  const error = ref(null)
  const { isAuthenticated, getAccessToken } = useUser()

  // Get cached token or fetch new one if expired
  const getValidToken = async () => {
    const now = Date.now()
    
    // Return cached token if still valid
    if (cachedToken && tokenExpiryTime && now < tokenExpiryTime) {
      return cachedToken
    }
    
    // Fetch new token
    try {
      const token = await getAccessToken()
      if (token) {
        cachedToken = token
        tokenExpiryTime = now + TOKEN_CACHE_DURATION
      }
      return token
    } catch (error) {
      // Clear cache on error
      cachedToken = null
      tokenExpiryTime = null
      throw error
    }
  }

  // Generic API request function
  const request = async (url, options = {}) => {
    isLoading.value = true
    error.value = null

    try {
      // Get authentication headers if user is authenticated
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      }
      
      // Add Authorization header if user is authenticated
      if (isAuthenticated.value) {
        try {
          const token = await getValidToken()
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }
        } catch (authError) {
          console.warn('Failed to get access token:', authError)
          // Continue without token for public endpoints
        }
      }
      
      const response = await fetch(url, {
        headers,
        ...options
      })

      const data = await response.json()

      if (!response.ok) {
        // Create an error object with the response data
        const error = new Error(data.message || `HTTP error! status: ${response.status}`)
        error.status = response.status
        error.data = data
        throw error
      }

      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // GET request
  const get = (url, options = {}) => {
    return request(url, { method: 'GET', ...options })
  }

  // POST request
  const post = (url, data, options = {}) => {
    return request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    })
  }

  // PUT request
  const put = (url, data, options = {}) => {
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    })
  }

  // DELETE request
  const del = (url, options = {}) => {
    return request(url, { method: 'DELETE', ...options })
  }

  return {
    isLoading,
    error,
    request,
    get,
    post,
    put,
    delete: del
  }
}
