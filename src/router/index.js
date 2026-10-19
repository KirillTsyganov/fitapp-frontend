import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import CircuitView from '@/views/CircuitView.vue'
import ProgressView from '@/views/ProgressView.vue'
import AuthCallbackView from '@/views/AuthCallbackView.vue'
import SettingsView from '@/views/SettingsView.vue'
import CoachView from '@/views/CoachView.vue'
import FlowsLibraryView from '@/views/FlowsLibraryView.vue'
import FlowDetailView from '@/views/FlowDetailView.vue'
import FlowRunnerView from '@/views/FlowRunnerView.vue'
import PoseSandboxView from '@/views/PoseSandboxView.vue'
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
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/coach',
      name: 'coach',
      component: CoachView,
      meta: { requiresAuth: true },
    },
    {
      path: '/flows',
      name: 'coach-flows',
      component: FlowsLibraryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/flows/:id',
      name: 'coach-flow-detail',
      component: FlowDetailView,
      meta: { requiresAuth: true },
    },
    {
      path: '/flows/:id/run',
      name: 'coach-flow-run',
      component: FlowRunnerView,
      meta: { requiresAuth: true },
    },
    // Legacy Timed Sequences paths, kept so old bookmarks and history entries land on My Flows.
    { path: '/sequences', redirect: '/flows' },
    { path: '/flow', redirect: '/flows' },
    { path: '/flow/:id', redirect: '/flows' },
    {
      path: '/pose-sandbox',
      name: 'pose-sandbox',
      component: PoseSandboxView,
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
