import Profile from "../views/Profile.vue";
import Dashboard from '@/views/Dashboard.vue'
import Events from '@/views/Events.vue'
import EventDetail from '@/views/EventDetail.vue'
import Newpro from '@/views/Newpro.vue'
import BuyerConfirmation from '@/views/BuyerConfirmation.vue'
import TicketCheckin from '@/views/TicketCheckin.vue'
import QRCodeCheckin from '@/views/QRCodeCheckin.vue'

import { createAuthGuard } from "@auth0/auth0-vue";
// Export function that takes app instance to create routes with auth guards
export const createRoutes = (app) => {
  
  const authGuard = createAuthGuard(app);

  return [
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard
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
      path: '/checkin/:hash',
      name: 'TicketCheckin',
      component: TicketCheckin,
      props: true
      // Note: No authGuard - check-in pages should be public
    },
    {
      path: '/qr-checkin',
      name: 'QRCodeCheckin',
      component: QRCodeCheckin
      // Note: No authGuard - QR code scanning should be public
    }
  ];
}
