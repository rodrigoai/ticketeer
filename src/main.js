import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createAuth0 } from '@auth0/auth0-vue'
import App from './App.vue'
import { createRoutes } from './router/routes.js'

// Auth0 configuration
const authConfig = {
  domain: 'novamoney.us.auth0.com',
  clientId: '1PlShClpoRxkSeKWZtgq4vVnUxLg40F4'
}

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Create Vue app instance
const app = createApp(App)

// Setup Auth0
app.use(
    createAuth0({
      domain: authConfig.domain,
      clientId: authConfig.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: 'https://ticket.nova.money'
      }
    })
);

// Create router instance with auth guards
const routes = createRoutes(app);
const router = createRouter({
  history: createWebHistory(),
  routes
})

app.use(router)
app.mount('#app')
