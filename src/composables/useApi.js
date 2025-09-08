import { ref } from 'vue'
import { useUser } from './useUser'

export function useApi() {
  const isLoading = ref(false)
  const error = ref(null)
  const { isAuthenticated, getAccessToken } = useUser()

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
          const token = await getAccessToken()
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
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
