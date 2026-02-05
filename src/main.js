import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createAuth0 } from '@auth0/auth0-vue'
import App from './App.vue'
import { createRoutes } from './router/routes.js'
import { auth0Config } from './config/auth0.js'
import './assets/main.css'

// Create Vue app instance
const app = createApp(App)

// Setup Auth0 with centralized configuration
app.use(createAuth0(auth0Config));

// Create router instance with auth guards
const routes = createRoutes(app);
const router = createRouter({
  history: createWebHistory(),
  routes
})

app.use(router)
app.mount('#app')
