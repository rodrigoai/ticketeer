/**
 * Ticketeer Authentication UI
 * Handles authentication UI for server-side Auth0 integration
 */

class TicketeerAuth {
    constructor() {
        this.initialized = false;
        this.user = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        try {
            // Check authentication status from server
            const response = await fetch('/api/auth/status');
            const authData = await response.json();
            
            this.isAuthenticated = authData.isAuthenticated;
            this.user = authData.user;
            
            this.initialized = true;
            
            // Update UI
            this.updateAuthUI();
            
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.initialized = true; // Mark as initialized even on error
        }
    }

    async getAccessToken() {
        // For server-side auth, we don't need to manually get tokens
        // The server handles authentication via cookies/sessions
        // We can make API calls directly and the server will handle auth
        return null;
    }

    updateAuthUI() {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        if (this.isAuthenticated && this.user) {
            authSection.innerHTML = `
                <div class="navbar-nav">
                    <div class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle"></i>
                            ${this.user.name || this.user.email || 'User'}
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/dashboard">
                                <i class="bi bi-speedometer2"></i> Dashboard
                            </a></li>
                            <li><a class="dropdown-item" href="/events">
                                <i class="bi bi-calendar-event"></i> Events
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="/logout">
                                <i class="bi bi-box-arrow-right"></i> Logout
                            </a></li>
                        </ul>
                    </div>
                </div>
            `;
        } else {
            authSection.innerHTML = `
                <div class="navbar-nav">
                    <a class="btn btn-outline-light btn-sm me-2" href="/login">
                        <i class="bi bi-box-arrow-in-right"></i> Login
                    </a>
                    <a class="btn btn-light btn-sm" href="/login">
                        <i class="bi bi-person-plus"></i> Sign Up
                    </a>
                </div>
            `;
        }
    }

    // Check if user is authenticated (can be called by other scripts)
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Get current user (can be called by other scripts)
    getCurrentUser() {
        return this.user;
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.ticketeerAuth = new TicketeerAuth();
});
