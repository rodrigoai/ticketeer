/**
 * Centralized Auth0 Configuration
 * 
 * This file contains all Auth0 settings used throughout the application.
 * Both main.js and composables import from this single source of truth.
 */

// Auth0 configuration - single source of truth
export const auth0Config = {
  // Basic Auth0 settings
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'novamoney.us.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '1PlShClpoRxkSeKWZtgq4vVnUxLg40F4',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://ticket.nova.money',
  
  // Authorization parameters
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://ticket.nova.money'
  },
  
  // Session persistence settings
  useRefreshTokens: true,
  cacheLocation: 'localstorage',
  useRefreshTokensFallback: true,
  useCookiesForTransactions: true
}

// Token configuration for API calls
export const tokenConfig = {
  authorizationParams: {
    audience: auth0Config.audience,
    scope: 'read:events write:events delete:events'
  }
}

// Environment validation
const validateConfig = () => {
  const required = ['domain', 'clientId', 'audience']
  const missing = required.filter(key => !auth0Config[key])
  
  if (missing.length > 0) {
    console.warn(`Auth0 configuration missing: ${missing.join(', ')}`)
    console.warn('Using fallback values. For production, set VITE_AUTH0_* environment variables.')
  }
}

// Validate configuration on import
validateConfig()

export default auth0Config
