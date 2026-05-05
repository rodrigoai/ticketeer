/**
 * Centralized Auth0 Configuration
 * 
 * This file contains all Auth0 settings used throughout the application.
 * Both main.js and composables import from this single source of truth.
 */

const getRequiredEnv = (key) => {
  const value = import.meta.env[key]

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

const audience = getRequiredEnv('VITE_AUTH0_AUDIENCE')

// Auth0 configuration - single source of truth
export const auth0Config = {
  // Basic Auth0 settings
  domain: getRequiredEnv('VITE_AUTH0_DOMAIN'),
  clientId: getRequiredEnv('VITE_AUTH0_CLIENT_ID'),
  audience,
  
  // Authorization parameters
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience
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

export default auth0Config
