import Profile from "../views/Profile.vue";
import Dashboard from '@/views/Dashboard.vue'
import Events from '@/views/Events.vue'
import EventDetail from '@/views/EventDetail.vue'
import Newpro from '@/views/Newpro.vue'
import BuyerConfirmation from '@/views/BuyerConfirmation.vue'
import TicketCheckin from '@/views/TicketCheckin.vue'
import TicketAccessoryPickup from '@/views/TicketAccessoryPickup.vue'
import QRCodeCheckin from '@/views/QRCodeCheckin.vue'
import QRCodeAccessoryPickup from '@/views/QRCodeAccessoryPickup.vue'
import PublicEventLanding from '@/views/PublicEventLanding.vue'
import LandingPage from '@/views/LandingPage.vue'

import { createAuthGuard } from "@auth0/auth0-vue";
import { watchEffect } from 'vue';

// Export function that takes app instance to create routes with auth guards
export const createRoutes = (app) => {

  const authGuard = createAuthGuard(app);
  const { isAuthenticated, isLoading } = app.config.globalProperties.$auth0;

  return [
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage,
      beforeEnter: (to, from, next) => {
        // Redirection logic: if user is logged in, send to dashboard
        // We use a watchEffect or check the ref value if possible
        // Since this is a router guard, we check the current state
        if (isAuthenticated.value) {
          next('/dashboard');
        } else {
          next();
        }
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      beforeEnter: authGuard
    },
    {
      path: '/events',
      name: 'Events',
      component: Events,
      beforeEnter: authGuard
    },
    {
      path: '/events/:id',
      name: 'EventDetail',
      component: EventDetail,
      beforeEnter: authGuard,
      props: true
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      beforeEnter: authGuard
    },
    {
      path: '/newpro',
      name: 'NewPro',
      component: Newpro,
      beforeEnter: authGuard
    },
    {
      path: '/confirmation/:hash',
      name: 'BuyerConfirmation',
      component: BuyerConfirmation,
      props: true
      // Note: No authGuard - confirmation pages should be public
    },
    {
      path: '/event/:id',
      name: 'PublicEventLanding',
      component: PublicEventLanding,
      props: true
      // Note: No authGuard - public event landing page
    },
    {
      path: '/checkin/:hash',
      name: 'TicketCheckin',
      component: TicketCheckin,
      props: true
      // Note: No authGuard - check-in pages should be public
    },
    {
      path: '/accessory-pickup/:hash',
      name: 'TicketAccessoryPickup',
      component: TicketAccessoryPickup,
      props: true
      // Note: No authGuard - accessory pickup pages should be public
    },
    {
      path: '/qr-checkin',
      name: 'QRCodeCheckin',
      component: QRCodeCheckin,
      beforeEnter: authGuard
    },
    {
      path: '/qr-accessory-pickup',
      name: 'QRCodeAccessoryPickup',
      component: QRCodeAccessoryPickup,
      beforeEnter: authGuard
    }
  ];
}
