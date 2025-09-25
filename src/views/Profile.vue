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
        <div class="mt-2">
          <span class="badge bg-primary me-2">
            <i class="fas fa-id-card me-1"></i>User ID
          </span>
          <code class="text-primary">{{ userId }}</code>
          <button 
            class="btn btn-sm btn-outline-secondary ms-2" 
            @click="copyUserId"
            :disabled="!userId"
            title="Copy User ID"
          >
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="fas fa-user-tag me-2"></i>
              User Identity & Webhook Configuration
            </h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    <i class="fas fa-id-card me-2 text-primary"></i>User ID
                  </label>
                  <div class="input-group">
                    <input 
                      type="text" 
                      class="form-control font-monospace" 
                      :value="userId" 
                      readonly
                      style="background-color: #f8f9fa;"
                    />
                    <button 
                      class="btn btn-outline-primary" 
                      type="button" 
                      @click="copyUserId"
                      :disabled="!userId"
                      title="Copy User ID"
                    >
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                  <small class="form-text text-muted">
                    This ID is used to identify your account in webhook URLs.
                  </small>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    <i class="fas fa-webhook me-2 text-success"></i>Webhook URL
                  </label>
                  <div class="input-group">
                    <input 
                      type="text" 
                      class="form-control font-monospace" 
                      :value="webhookUrl" 
                      readonly
                      style="background-color: #f8f9fa; font-size: 0.85rem;"
                    />
                    <button 
                      class="btn btn-outline-success" 
                      type="button" 
                      @click="copyWebhookUrl"
                      :disabled="!webhookUrl"
                      title="Copy Webhook URL"
                    >
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                  <small class="form-text text-muted">
                    Use this URL for payment webhook configurations.
                  </small>
                </div>
              </div>
            </div>
            <div class="alert alert-info mt-3">
              <h6 class="alert-heading">
                <i class="fas fa-info-circle me-2"></i>Webhook Information
              </h6>
              <p class="mb-2">
                The webhook URL above is a <strong>public endpoint</strong> that accepts payment confirmations.
                It validates that tickets belong to your events before processing.
              </p>
              <p class="mb-0">
                <strong>Security:</strong> Only tickets from events you created can be processed through your webhook URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">API Access Token</h5>
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
import { useUser } from '@/composables/useUser';
import { ref, onMounted, computed } from 'vue';

export default {
  name: "profile-view",
  setup() {
    const {
      user, 
      userId,
      isAuthenticated, 
      isLoading, 
      accessToken, 
      isLoadingToken, 
      tokenError, 
      getAccessToken, 
      refreshAccessToken 
    } = useUser();
    
    const testResult = ref<any>(null);
    
    // Computed webhook URL based on current domain and userId
    const webhookUrl = computed(() => {
      if (!userId.value) return '';
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/webhooks/checkout/${encodeURIComponent(userId.value)}`;
    });
    
    // Get token function (wrapper around centralized function)
    const getToken = async () => {
      return await getAccessToken();
    };
    
    // Refresh token function (wrapper around centralized function)
    const refreshToken = async () => {
      return await refreshAccessToken();
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
    
    // Copy userId to clipboard
    const copyUserId = async () => {
      if (userId.value) {
        try {
          await navigator.clipboard.writeText(userId.value);
          console.log('User ID copied to clipboard');
          // You could add a toast notification here
        } catch (err) {
          console.error('Failed to copy User ID:', err);
        }
      }
    };
    
    // Copy webhook URL to clipboard
    const copyWebhookUrl = async () => {
      if (webhookUrl.value) {
        try {
          await navigator.clipboard.writeText(webhookUrl.value);
          console.log('Webhook URL copied to clipboard');
          // You could add a toast notification here
        } catch (err) {
          console.error('Failed to copy Webhook URL:', err);
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
      if (isAuthenticated.value && !isLoading.value) {
        getToken();
      }
    });
    
    return {
      user,
      userId,
      webhookUrl,
      accessToken,
      isLoadingToken,
      tokenError,
      testResult,
      getToken,
      refreshToken,
      copyToken,
      copyUserId,
      copyWebhookUrl,
      testToken
    }
  }
};
</script>

