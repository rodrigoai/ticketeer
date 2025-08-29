// Ticketeer Auth0 Integration
// This file handles authentication using Auth0 SPA SDK

class TicketeerAuth {
  constructor() {
    this.auth0Client = null;
    this.isInitialized = false;
    this.currentUser = null;
  }

  // Initialize Auth0 client
  async init() {
    try {
      // Configuration - replace with your actual Auth0 settings
      const config = {
        domain: 'your-domain.auth0.com',     // Replace with your Auth0 domain
        clientId: 'your-client-id',          // Replace with your Auth0 client ID
        authorizationParams: {
          redirect_uri: window.location.origin + '/callback',
          audience: 'https://your-api.example.com' // Optional: your API identifier
        },
        useRefreshTokens: true,
        cacheLocation: 'localstorage' // Store tokens in localStorage
      };

      console.log('Initializing Auth0 with config:', config);
      
      // Create the Auth0 client
      this.auth0Client = await auth0.createAuth0Client(config);
      
      // Check if we're returning from authentication
      if (window.location.search.includes('code=') && window.location.pathname === '/') {
        console.log('Handling redirect callback on main page...');
        await this.handleRedirectCallback();
        return;
      }

      // Check if user is already authenticated
      const isAuthenticated = await this.auth0Client.isAuthenticated();
      console.log('User authenticated:', isAuthenticated);

      if (isAuthenticated) {
        this.currentUser = await this.auth0Client.getUser();
        console.log('Current user:', this.currentUser);
        this.updateUI(true);
      } else {
        this.updateUI(false);
      }

      this.isInitialized = true;
      console.log('Auth0 initialization complete');

    } catch (error) {
      console.error('Error initializing Auth0:', error);
      this.updateUI(false, error.message);
    }
  }

  // Handle redirect callback
  async handleRedirectCallback() {
    try {
      console.log('Processing Auth0 callback...');
      const redirectResult = await this.auth0Client.handleRedirectCallback();
      
      this.currentUser = await this.auth0Client.getUser();
      console.log('Authentication successful:', this.currentUser);
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Update UI
      this.updateUI(true);
      
      return redirectResult;
    } catch (error) {
      console.error('Error handling callback:', error);
      this.updateUI(false, error.message);
      throw error;
    }
  }

  // Login with redirect
  async login() {
    if (!this.auth0Client) {
      console.error('Auth0 client not initialized');
      return;
    }

    try {
      console.log('Starting login process...');
      await this.auth0Client.loginWithRedirect({
        authorizationParams: {
          screen_hint: 'login' // Can be 'login' or 'signup'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('Login failed: ' + error.message, 'danger');
    }
  }

  // Login with signup hint
  async signup() {
    if (!this.auth0Client) {
      console.error('Auth0 client not initialized');
      return;
    }

    try {
      console.log('Starting signup process...');
      await this.auth0Client.loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup'
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      this.showMessage('Signup failed: ' + error.message, 'danger');
    }
  }

  // Logout
  async logout() {
    if (!this.auth0Client) {
      console.error('Auth0 client not initialized');
      return;
    }

    try {
      console.log('Logging out...');
      await this.auth0Client.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      this.showMessage('Logout failed: ' + error.message, 'danger');
    }
  }

  // Get access token for API calls
  async getAccessToken() {
    if (!this.auth0Client) {
      throw new Error('Auth0 client not initialized');
    }

    try {
      return await this.auth0Client.getTokenSilently();
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Make authenticated API call
  async apiCall(url, options = {}) {
    try {
      const token = await this.getAccessToken();
      
      const defaultOptions = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      };

      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  // Update UI based on authentication state
  updateUI(isAuthenticated, errorMessage = null) {
    console.log('Updating UI - authenticated:', isAuthenticated);
    
    // Add authentication UI to navigation
    this.addAuthenticationUI(isAuthenticated, errorMessage);
    
    // Enable/disable protected features
    this.toggleProtectedFeatures(isAuthenticated);
  }

  // Add authentication UI to navbar
  addAuthenticationUI(isAuthenticated, errorMessage) {
    const navbar = document.querySelector('.navbar-nav.me-auto');
    if (!navbar) return;

    // Remove existing auth UI
    const existingAuthUI = document.getElementById('auth-ui');
    if (existingAuthUI) {
      existingAuthUI.remove();
    }

    // Create new auth UI
    const authContainer = document.createElement('div');
    authContainer.id = 'auth-ui';
    authContainer.className = 'navbar-nav ms-auto';

    if (errorMessage) {
      // Show error state
      authContainer.innerHTML = `
        <li class=\"nav-item\">
          <span class=\"nav-link text-danger\">❌ Auth Error</span>
        </li>
        <li class=\"nav-item\">
          <button class=\"btn btn-outline-light btn-sm\" onclick=\"ticketeerAuth.init()\">Retry</button>
        </li>
      `;
    } else if (isAuthenticated && this.currentUser) {
      // Show authenticated state
      const userName = this.currentUser.name || this.currentUser.email || 'User';
      const userPicture = this.currentUser.picture || 'https://via.placeholder.com/32x32';
      
      authContainer.innerHTML = `
        <li class=\"nav-item dropdown\">
          <a class=\"nav-link dropdown-toggle d-flex align-items-center\" href=\"#\" role=\"button\" data-bs-toggle=\"dropdown\">
            <img src=\"${userPicture}\" alt=\"Profile\" class=\"rounded-circle me-2\" width=\"32\" height=\"32\">
            ${userName}
          </a>
          <ul class=\"dropdown-menu\">
            <li><a class=\"dropdown-item\" href=\"#\" onclick=\"ticketeerAuth.showProfile()\">👤 Profile</a></li>
            <li><a class=\"dropdown-item\" href=\"#\" onclick=\"ticketeerAuth.showSettings()\">⚙️ Settings</a></li>
            <li><hr class=\"dropdown-divider\"></li>
            <li><a class=\"dropdown-item\" href=\"#\" onclick=\"ticketeerAuth.logout()\">🚪 Logout</a></li>
          </ul>
        </li>
      `;
    } else {
      // Show unauthenticated state
      authContainer.innerHTML = `
        <li class=\"nav-item\">
          <button class=\"btn btn-outline-light btn-sm me-2\" onclick=\"ticketeerAuth.login()\">🔑 Login</button>
        </li>
        <li class=\"nav-item\">
          <button class=\"btn btn-light btn-sm\" onclick=\"ticketeerAuth.signup()\">📝 Sign Up</button>
        </li>
      `;
    }

    // Add to navbar
    navbar.parentElement.appendChild(authContainer);
  }

  // Toggle protected features
  toggleProtectedFeatures(isAuthenticated) {
    const protectedButtons = document.querySelectorAll('.btn-primary');
    protectedButtons.forEach(button => {
      if (!isAuthenticated) {
        button.setAttribute('data-original-onclick', button.getAttribute('onclick') || '');
        button.onclick = () => {
          this.showMessage('Please login to access this feature', 'warning');
          this.login();
        };
      } else {
        const originalOnclick = button.getAttribute('data-original-onclick');
        if (originalOnclick) {
          button.setAttribute('onclick', originalOnclick);
        }
      }
    });
  }

  // Show user profile modal
  showProfile() {
    if (!this.currentUser) return;

    const profileData = {
      'Name': this.currentUser.name || 'Not provided',
      'Email': this.currentUser.email || 'Not provided',
      'Email Verified': this.currentUser.email_verified ? '✅ Yes' : '❌ No',
      'Last Login': this.currentUser.updated_at ? new Date(this.currentUser.updated_at).toLocaleString() : 'Unknown',
      'User ID': this.currentUser.sub || 'Unknown'
    };

    let profileHtml = '<div class=\"row\">';
    for (const [key, value] of Object.entries(profileData)) {
      profileHtml += `
        <div class=\"col-12 mb-2\">
          <strong>${key}:</strong> ${value}
        </div>
      `;
    }
    profileHtml += '</div>';

    this.showModal('User Profile', profileHtml);
  }

  // Show settings modal
  showSettings() {
    const settingsHtml = `
      <div class=\"alert alert-info\">
        <h6>Settings</h6>
        <p>User settings and preferences will be implemented here.</p>
        <button class=\"btn btn-sm btn-outline-primary\" onclick=\"ticketeerAuth.testApiCall()\">
          🧪 Test API Call
        </button>
      </div>
    `;
    
    this.showModal('Settings', settingsHtml);
  }

  // Test API call with authentication
  async testApiCall() {
    try {
      this.showMessage('Testing API call...', 'info');
      const result = await this.apiCall('/api/auth/profile');
      console.log('API test result:', result);
      this.showMessage('API call successful! Check console for details.', 'success');
    } catch (error) {
      console.error('API test failed:', error);
      this.showMessage('API call failed: ' + error.message, 'danger');
    }
  }

  // Utility function to show modal
  showModal(title, body) {
    // Remove existing modal
    const existingModal = document.getElementById('ticketeer-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modalHtml = `
      <div class=\"modal fade\" id=\"ticketeer-modal\" tabindex=\"-1\">
        <div class=\"modal-dialog\">
          <div class=\"modal-content\">
            <div class=\"modal-header\">
              <h5 class=\"modal-title\">${title}</h5>
              <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\"></button>
            </div>
            <div class=\"modal-body\">
              ${body}
            </div>
            <div class=\"modal-footer\">
              <button type=\"button\" class=\"btn btn-secondary\" data-bs-dismiss=\"modal\">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('ticketeer-modal'));
    modal.show();
  }

  // Utility function to show messages
  showMessage(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.ticketeer-alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create alert
    const alertHtml = `
      <div class=\"alert alert-${type} alert-dismissible fade show ticketeer-alert\" role=\"alert\">
        ${message}
        <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\"></button>
      </div>
    `;

    // Add to page
    const container = document.querySelector('.container');
    if (container) {
      container.insertAdjacentHTML('afterbegin', alertHtml);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        const alert = document.querySelector('.ticketeer-alert');
        if (alert) {
          alert.remove();
        }
      }, 5000);
    }
  }
}

// Initialize authentication when DOM is loaded
const ticketeerAuth = new TicketeerAuth();

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing authentication...');
  ticketeerAuth.init().catch(error => {
    console.error('Failed to initialize authentication:', error);
  });
});

// Make it available globally for onclick handlers
window.ticketeerAuth = ticketeerAuth;
