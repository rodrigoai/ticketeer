<template>
  <div class="container">
    <div class="row align-items-center profile-header">
      <div class="col-md-2 mb-3">
        <img
          :src="user?.picture"
          alt="User's profile picture"
          class="rounded-circle img-fluid profile-picture"
        />
      </div>
      <div class="col-md text-center text-md-left">
        <h2>{{ user?.name }}</h2>
        <p class="lead text-muted">{{ user?.email }}</p>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Access Token</h5>
          </div>
          <div class="card-body">
            <div v-if="isLoadingToken" class="text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2">Retrieving access token...</p>
            </div>
            <div v-else-if="tokenError" class="alert alert-danger">
              <strong>Error:</strong> {{ tokenError }}
            </div>
            <div v-else-if="accessToken">
              <div class="mb-3">
                <label class="form-label"><strong>Token:</strong></label>
                <div class="input-group">
                  <textarea 
                    class="form-control font-monospace" 
                    :value="accessToken" 
                    readonly 
                    rows="4"
                    style="font-size: 0.8rem; word-break: break-all;"
                  ></textarea>
                  <button 
                    class="btn btn-outline-secondary" 
                    type="button" 
                    @click="copyToken"
                    :disabled="!accessToken"
                  >
                    <i class="fas fa-copy"></i> Copy
                  </button>
                </div>
                <small class="form-text text-muted">This token can be used to authenticate API requests.</small>
              </div>
              <div class="mt-3">
                <button class="btn btn-primary btn-sm" @click="refreshToken">
                  <i class="fas fa-sync-alt"></i> Refresh Token
                </button>
                <button class="btn btn-success btn-sm ms-2" @click="testToken">
                  <i class="fas fa-flask"></i> Test Token
                </button>
              </div>
            </div>
            <div v-else>
              <button class="btn btn-primary" @click="getToken">
                <i class="fas fa-key"></i> Get Access Token
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">User Information</h5>
          </div>
          <div class="card-body">
            <highlightjs language="json" :code="JSON.stringify(user, null, 2)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Test Result Modal -->
    <div v-if="testResult" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">API Test Result</h5>
            <button type="button" class="btn-close" @click="testResult = null"></button>
          </div>
          <div class="modal-body">
            <div class="alert" :class="testResult.success ? 'alert-success' : 'alert-danger'">
              <strong>{{ testResult.success ? 'Success!' : 'Error!' }}</strong>
              {{ testResult.message }}
            </div>
            <div v-if="testResult.data">
              <h6>Response:</h6>
              <highlightjs language="json" :code="JSON.stringify(testResult.data, null, 2)" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="testResult = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';
import { ref, onMounted } from 'vue';

export default {
  name: "profile-view",
  setup() {
    const auth0 = useAuth0();
    
    // Reactive state for access token
    const accessToken = ref<string | null>(null);
    const isLoadingToken = ref(false);
    const tokenError = ref<string | null>(null);
    const testResult = ref<any>(null);
    
    // Get access token function
    const getToken = async () => {
      try {
        isLoadingToken.value = true;
        tokenError.value = null;
        
        // Get access token silently
        const token = await auth0.getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://ticket.nova.money',
            scope: 'read:events write:events delete:events'
          }
        });
        
        accessToken.value = token;
        console.log('Access token retrieved:', token);
      } catch (error: any) {
        console.error('Error getting access token:', error);
        tokenError.value = error.message || 'Failed to get access token';
      } finally {
        isLoadingToken.value = false;
      }
    };
    
    // Refresh token function
    const refreshToken = async () => {
      accessToken.value = null;
      await getToken();
    };
    
    // Copy token to clipboard
    const copyToken = async () => {
      if (accessToken.value) {
        try {
          await navigator.clipboard.writeText(accessToken.value);
          // You could add a toast notification here
          console.log('Token copied to clipboard');
        } catch (err) {
          console.error('Failed to copy token:', err);
        }
      }
    };
    
    // Test token with API
    const testToken = async () => {
      if (!accessToken.value) return;
      
      try {
        const response = await fetch('/api/test/protected', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken.value}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        testResult.value = {
          success: response.ok,
          message: response.ok ? 'Token is valid and API call succeeded!' : `API call failed: ${data.message || data.error}`,
          data: data
        };
      } catch (error: any) {
        testResult.value = {
          success: false,
          message: `Network error: ${error.message}`,
          data: null
        };
      }
    };
    
    // Automatically get token on component mount if user is authenticated
    onMounted(() => {
      if (auth0.isAuthenticated.value && !auth0.isLoading.value) {
        getToken();
      }
    });
    
    return {
      user: auth0.user,
      accessToken,
      isLoadingToken,
      tokenError,
      testResult,
      getToken,
      refreshToken,
      copyToken,
      testToken
    }
  }
};
</script>

