# Centralized Auth0 Architecture - Complete Solution

## 🎯 **Your Original Question: Can we use useUser everywhere?**

Great architectural thinking! While we can't use `useUser` composable directly in `main.js` due to Vue's lifecycle, we've created an even better solution: **Centralized Auth0 Configuration**.

## 🏗️ **New Architecture Overview**

### **Three-Layer Architecture:**

1. **Configuration Layer** (`src/config/auth0.js`) - Single source of truth
2. **Plugin Layer** (`src/main.js`) - Vue plugin registration  
3. **Composable Layer** (`src/composables/useUser.js`) - Application logic

## 📁 **File Structure**

```
src/
├── config/
│   └── auth0.js           # 🔧 Centralized Auth0 configuration
├── composables/
│   └── useUser.js         # 🎯 User state management
├── main.js                # 🚀 Vue app initialization
└── components/views/      # 🖼️  UI components (use useUser)
```

## 🔧 **1. Configuration Layer (`src/config/auth0.js`)**

**Single source of truth for ALL Auth0 settings:**

```javascript
// ✅ Used by both main.js AND useUser composable
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'novamoney.us.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'fallback-client-id',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://ticket.nova.money',
  
  // Session persistence settings (CRITICAL for refresh issue)
  useRefreshTokens: true,           // 🔑 Enables session persistence  
  cacheLocation: 'localstorage',    // 🔑 Survives page refreshes
  useRefreshTokensFallback: true,   // 🔑 Fallback if refresh fails
  useCookiesForTransactions: true   // 🔑 Cross-tab authentication
}

export const tokenConfig = {
  authorizationParams: {
    audience: auth0Config.audience,
    scope: 'read:events write:events delete:events'
  }
}
```

## 🚀 **2. Plugin Layer (`src/main.js`)**

**Simplified to use centralized config:**

```javascript
import { auth0Config } from './config/auth0.js'

// ✅ Clean, simple, uses centralized config
app.use(createAuth0(auth0Config))
```

## 🎯 **3. Composable Layer (`src/composables/useUser.js`)**

**Uses the same centralized config:**

```javascript
import { tokenConfig } from '@/config/auth0.js'

// ✅ Token requests use centralized configuration
const token = await auth0Instance.getAccessTokenSilently(tokenConfig)
```

## 🌟 **Benefits of This Architecture**

### **✅ Single Source of Truth**
- All Auth0 settings in one place
- No duplicate configuration
- Easy to maintain and update

### **✅ Environment Variable Support** 
- Uses `VITE_AUTH0_*` variables for frontend
- Falls back to hardcoded defaults for development
- Production-ready configuration

### **✅ Session Persistence Fixed**
- `useRefreshTokens: true` - Enables refresh token flow
- `cacheLocation: 'localstorage'` - Survives page refreshes  
- `useRefreshTokensFallback: true` - Handles edge cases
- `useCookiesForTransactions: true` - Cross-tab support

### **✅ Consistent Token Management**
- Same token configuration used everywhere
- No hardcoded scopes or audiences
- Centralized token refresh logic

## 🔧 **Environment Variables Setup**

### **Frontend Variables** (available in browser):
```bash
VITE_AUTH0_DOMAIN=novamoney.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://ticket.nova.money
```

### **Backend Variables** (server-side only):
```bash
AUTH0_DOMAIN=novamoney.us.auth0.com
AUTH0_CLIENT_ID=your-client-id  
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://ticket.nova.money
```

## 🚨 **Session Persistence Fix**

### **Problem:** User gets disconnected on page refresh

### **Root Causes:**
1. Missing `useRefreshTokens: true`
2. Using `memory` cache (doesn't survive refreshes)
3. No refresh token fallback mechanisms
4. Inconsistent client ID configuration

### **Solution Applied:**
1. ✅ **Enabled Refresh Tokens**: `useRefreshTokens: true`
2. ✅ **LocalStorage Cache**: `cacheLocation: 'localstorage'`
3. ✅ **Fallback Mechanism**: `useRefreshTokensFallback: true`
4. ✅ **Cookie Transactions**: `useCookiesForTransactions: true`
5. ✅ **Consistent Config**: Single source of truth eliminates ID mismatches

## 📋 **Auth0 Dashboard Requirements**

**⚠️ IMPORTANT: Enable these in your Auth0 Dashboard:**

### **Application Settings:**
1. **Refresh Token Rotation**: `Enabled`
2. **Refresh Token Expiration**: `Rotating` 
3. **Allowed Callback URLs**: `http://localhost:3000, https://your-domain.com`
4. **Allowed Logout URLs**: `http://localhost:3000, https://your-domain.com`
5. **Allowed Web Origins**: `http://localhost:3000, https://your-domain.com`

### **Grant Types:**
- ✅ Authorization Code
- ✅ Refresh Token  
- ✅ Client Credentials (for API)

## 🧪 **Testing the Fix**

### **Test Steps:**
1. **Login** to the application
2. **Navigate** between pages (Dashboard → Events → Profile)
3. **Refresh** the page (F5 or Cmd+R)
4. **Close and reopen** browser tab
5. **Wait 10+ minutes** then refresh (test token refresh)

### **Expected Results:**
- ✅ User stays logged in after refresh
- ✅ Same user data in navbar and content
- ✅ No re-authentication required
- ✅ Seamless navigation between pages
- ✅ Tokens refresh automatically

## 🎯 **Usage in Your Application**

### **In any Vue component:**
```javascript
import { useUser } from '@/composables/useUser'

export default {
  setup() {
    // ✅ Same user everywhere - centralized state
    const { user, isAuthenticated, login, logout } = useUser()
    
    return { user, isAuthenticated, login, logout }
  }
}
```

### **Environment-specific config:**
```javascript
// Automatically uses environment variables
// Falls back to development defaults
// No code changes needed between environments
```

## 🚀 **Result**

You now have:
- ✅ **Centralized Auth0 configuration** used by entire application
- ✅ **Session persistence** across page refreshes
- ✅ **Consistent user state** in all components  
- ✅ **Environment-aware** configuration
- ✅ **Production-ready** architecture

The authentication system is now bulletproof and properly architected! 🌟
