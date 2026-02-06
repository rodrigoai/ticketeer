<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-center gap-6 mb-8">
      <div class="flex-shrink-0">
        <img
          :src="user?.picture"
          alt="User's profile picture"
          class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-white"
        />
      </div>
      <div class="text-center md:text-left flex-1">
        <h2 class="text-3xl font-bold text-slate-900">{{ user?.name }}</h2>
        <p class="text-lg text-slate-500">{{ user?.email }}</p>
        <div class="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 border border-primary-100">
            <i class="fas fa-id-card"></i>
            User ID
          </span>
          <div class="flex items-center gap-2">
            <code class="font-mono text-sm text-primary-600 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">{{ userId }}</code>
            <button 
              class="text-slate-400 hover:text-primary-600 transition p-1" 
              @click="copyUserId"
              :disabled="!userId"
              title="Copy User ID"
            >
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- User Identity & Webhook -->
    <div class="bg-white shadow-sm rounded-2xl border border-slate-200 mb-8 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h5 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <i class="fas fa-user-tag text-slate-400"></i>
          User Identity & Webhook Configuration
        </h5>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- User ID Field -->
          <div>
             <label class="block text-sm font-semibold text-slate-700 mb-2">
               <i class="fas fa-id-card me-2 text-primary-600"></i>User ID
             </label>
             <div class="flex rounded-xl shadow-sm">
               <input 
                  type="text" 
                  class="flex-1 min-w-0 block w-full rounded-l-xl border-slate-200 bg-slate-50 text-slate-500 font-mono text-sm focus:border-primary-500 focus:ring-primary-500" 
                  :value="userId" 
                  readonly
                />
                <button 
                  class="inline-flex items-center px-4 py-2 border border-l-0 border-slate-200 rounded-r-xl bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 transition"
                  type="button" 
                  @click="copyUserId"
                  :disabled="!userId"
                  title="Copy User ID"
                >
                  <i class="fas fa-copy"></i>
                </button>
             </div>
             <p class="mt-2 text-xs text-slate-500">This ID is used to identify your account in webhook URLs.</p>
          </div>

          <!-- Webhook URL Field -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">
               <i class="fas fa-webhook me-2 text-emerald-600"></i>Webhook URL
            </label>
            <div class="flex rounded-xl shadow-sm">
               <input 
                  type="text" 
                  class="flex-1 min-w-0 block w-full rounded-l-xl border-slate-200 bg-slate-50 text-slate-500 font-mono text-xs md:text-sm focus:border-emerald-500 focus:ring-emerald-500" 
                  :value="webhookUrl" 
                  readonly
                />
                <button 
                  class="inline-flex items-center px-4 py-2 border border-l-0 border-slate-200 rounded-r-xl bg-white text-emerald-600 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:z-10 transition"
                  type="button" 
                  @click="copyWebhookUrl"
                  :disabled="!webhookUrl"
                  title="Copy Webhook URL"
                >
                  <i class="fas fa-copy"></i>
                </button>
            </div>
            <p class="mt-2 text-xs text-slate-500">Use this URL for payment webhook configurations.</p>
          </div>
        </div>

        <!-- Alert Info -->
        <div class="mt-6 rounded-xl bg-sky-50 border border-sky-100 p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0 mt-0.5">
              <i class="fas fa-info-circle text-sky-500"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-semibold text-sky-800">Webhook Information</h3>
              <div class="mt-2 text-sm text-sky-700 space-y-2">
                <p>The webhook URL above is a <strong>public endpoint</strong> that accepts payment confirmations. It validates that tickets belong to your events before processing.</p>
                <p><strong>Security:</strong> Only tickets from events you created can be processed through your webhook URL.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- API Access Token -->
    <div class="bg-white shadow-sm rounded-2xl border border-slate-200 mb-8 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h5 class="text-lg font-semibold text-slate-900">API Access Token</h5>
      </div>
      <div class="p-6">
        <div v-if="isLoadingToken" class="text-center py-8">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent align-[-0.125em]" role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <p class="mt-2 text-slate-500">Retrieving access token...</p>
        </div>
        
        <div v-else-if="tokenError" class="rounded-xl bg-red-50 p-4 border border-red-100 text-red-700 flex items-center gap-3">
          <i class="fas fa-exclamation-circle text-lg"></i>
          <div>
            <strong>Error:</strong> {{ tokenError }}
          </div>
        </div>

        <div v-else-if="accessToken" class="space-y-6">
           <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Token:</label>
              <div class="relative group">
                <textarea 
                  class="block w-full rounded-xl border-slate-200 bg-slate-50 text-slate-600 font-mono text-xs p-4 pr-12 focus:border-primary-500 focus:ring-primary-500 transition shadow-inner"
                  :value="accessToken" 
                  readonly 
                  rows="4"
                  style="word-break: break-all;"
                ></textarea>
                <button 
                  class="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-lg border border-slate-200 shadow-sm transition hover:scale-105 active:scale-95"
                  @click="copyToken"
                  :disabled="!accessToken"
                  title="Copy Token"
                >
                  <i class="fas fa-copy"></i>
                </button>
              </div>
              <p class="mt-2 text-xs text-slate-500">This token can be used to authenticate API requests.</p>
           </div>
           
           <div class="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
             <button class="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition" @click="refreshToken">
                <i class="fas fa-sync-alt text-slate-400"></i> Refresh Token
             </button>
             <button class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition" @click="testToken">
                <i class="fas fa-flask"></i> Test Token
             </button>
           </div>
        </div>

        <div v-else class="text-center py-6">
           <button class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition" @click="getToken">
             <i class="fas fa-key"></i> Get Access Token
           </button>
        </div>
      </div>
    </div>

    <!-- Nova.Money Integration -->
    <div class="bg-white shadow-sm rounded-2xl border border-slate-200 mb-8 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h5 class="text-lg font-semibold text-slate-900">Nova.Money Integration</h5>
      </div>
      <div class="p-6 space-y-4">
        <div v-if="isLoadingNovaProfile" class="text-center py-6 text-slate-500">
          Loading Nova.Money settings...
        </div>

        <div v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Tenant</label>
              <input
                type="text"
                class="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                v-model="novaMoneyTenant"
                placeholder="your-tenant"
              />
              <p class="mt-2 text-xs text-slate-500">Subdomain used to access Nova.Money APIs.</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">API Key</label>
              <input
                type="password"
                class="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-primary-500"
                v-model="novaMoneyApiKey"
                placeholder="••••••••••••"
              />
              <p class="mt-2 text-xs text-slate-500">
                {{ hasNovaMoneyApiKey ? 'A key is already saved. Leave blank to keep it.' : 'Required to connect Nova.Money.' }}
              </p>
            </div>
          </div>

          <div v-if="novaProfileError" class="rounded-xl bg-red-50 p-3 border border-red-100 text-red-700 text-sm">
            {{ novaProfileError }}
          </div>
          <div v-if="novaProfileSuccess" class="rounded-xl bg-emerald-50 p-3 border border-emerald-100 text-emerald-700 text-sm">
            {{ novaProfileSuccess }}
          </div>

          <div class="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <button
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition"
              @click="saveNovaProfile"
              :disabled="isSavingNovaProfile"
            >
              <i class="fas fa-save"></i> {{ isSavingNovaProfile ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- User Information -->
    <div class="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h5 class="text-lg font-semibold text-slate-900">User Information</h5>
      </div>
      <div class="p-6 bg-slate-50 overflow-x-auto">
        <highlightjs language="json" :code="JSON.stringify(user, null, 2)" />
      </div>
    </div>

    <!-- Test Result Modal -->
    <div v-if="testResult" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" @click.self="testResult = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up transform transition-all">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h5 class="text-lg font-semibold text-slate-900">API Test Result</h5>
          <button @click="testResult = null" class="text-slate-400 hover:text-slate-600 transition p-2 rounded-full hover:bg-slate-100">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <div :class="['rounded-xl p-4 border flex gap-3', testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800']">
             <div class="flex-shrink-0 mt-0.5">
               <i :class="['fas text-lg', testResult.success ? 'fa-check-circle' : 'fa-exclamation-circle']"></i>
             </div>
             <div>
               <strong class="block mb-1 font-semibold">{{ testResult.success ? 'Success!' : 'Error!' }}</strong>
               <p>{{ testResult.message }}</p>
             </div>
          </div>
          
          <div v-if="testResult.data">
            <h6 class="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <i class="fas fa-code text-slate-400"></i> Response Data:
            </h6>
            <div class="rounded-xl overflow-hidden bg-[#282c34] shadow-inner text-xs font-mono max-h-96 overflow-y-auto">
               <highlightjs language="json" :code="JSON.stringify(testResult.data, null, 2)" />
            </div>
          </div>
        </div>
        
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
           <button class="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:shadow-sm transition active:scale-95" @click="testResult = null">Close</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { useUser } from '@/composables/useUser';
import { useApi } from '@/composables/useApi';
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
    const { get, put } = useApi();
    
    const testResult = ref<any>(null);
    const novaMoneyTenant = ref('');
    const novaMoneyApiKey = ref('');
    const hasNovaMoneyApiKey = ref(false);
    const isLoadingNovaProfile = ref(false);
    const isSavingNovaProfile = ref(false);
    const novaProfileError = ref('');
    const novaProfileSuccess = ref('');
    
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

    const loadNovaProfile = async () => {
      if (!isAuthenticated.value) return;
      isLoadingNovaProfile.value = true;
      novaProfileError.value = '';
      novaProfileSuccess.value = '';

      try {
        const data = await get('/api/profile/nova-money');
        novaMoneyTenant.value = data?.profile?.novaMoneyTenant || '';
        hasNovaMoneyApiKey.value = Boolean(data?.profile?.hasNovaMoneyApiKey);
      } catch (error: any) {
        novaProfileError.value = error?.data?.message || error?.message || 'Failed to load Nova.Money settings';
      } finally {
        isLoadingNovaProfile.value = false;
      }
    };

    const saveNovaProfile = async () => {
      if (!novaMoneyTenant.value) {
        novaProfileError.value = 'Nova.Money tenant is required';
        return;
      }

      if (!novaMoneyApiKey.value && !hasNovaMoneyApiKey.value) {
        novaProfileError.value = 'Nova.Money API key is required';
        return;
      }

      isSavingNovaProfile.value = true;
      novaProfileError.value = '';
      novaProfileSuccess.value = '';

      try {
        await put('/api/profile/nova-money', {
          novaMoneyTenant: novaMoneyTenant.value,
          novaMoneyApiKey: novaMoneyApiKey.value
        });
        hasNovaMoneyApiKey.value = true;
        novaMoneyApiKey.value = '';
        novaProfileSuccess.value = 'Nova.Money settings saved successfully';
      } catch (error: any) {
        novaProfileError.value = error?.data?.message || error?.message || 'Failed to save Nova.Money settings';
      } finally {
        isSavingNovaProfile.value = false;
      }
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
      loadNovaProfile();
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
      testToken,
      novaMoneyTenant,
      novaMoneyApiKey,
      hasNovaMoneyApiKey,
      isLoadingNovaProfile,
      isSavingNovaProfile,
      novaProfileError,
      novaProfileSuccess,
      saveNovaProfile
    }
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
