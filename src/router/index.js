import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import CircuitView from '@/views/CircuitView.vue'
import ProgressView from '@/views/ProgressView.vue'
import AuthCallbackView from '@/views/AuthCallbackView.vue'
import { checkAuthStatus } from '@/composables/useAuth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/auth/callback',
      name: 'authCallback',
      component: AuthCallbackView,
    },
    {
      path: '/',
      name: 'circuit',
      component: CircuitView,
      meta: { requiresAuth: true },
    },
    {
      path: '/progress',
      name: 'progress',
      component: ProgressView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const authenticated = await checkAuthStatus()
    if (!authenticated) {
      return { name: 'login' }
    }
  }
})

export default router
