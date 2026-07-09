<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'

const { user, logout } = useAuth()
const route = useRoute()
const isOpen = ref(false)

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}
</script>

<template>
  <!-- Mobile hamburger button -->
  <button class="hamburger" :class="{ open: isOpen }" aria-label="Toggle navigation" @click="toggleMenu">
    <span></span>
    <span></span>
    <span></span>
  </button>

  <!-- Backdrop (mobile only) -->
  <Transition name="fade">
    <div v-if="isOpen" class="backdrop" @click="closeMenu" />
  </Transition>

  <!-- Sidebar -->
  <nav class="sidebar" :class="{ open: isOpen }">
    <div class="sidebar-brand">
      <span class="brand-icon">💪</span>
      <span class="brand-name">FitLog</span>
    </div>

    <div class="nav-links">
      <RouterLink
        to="/"
        class="nav-link"
        :class="{ active: route.name === 'circuit' }"
        @click="closeMenu"
      >
        <span class="nav-icon">🎯</span>
        Today
      </RouterLink>
      <RouterLink
        to="/progress"
        class="nav-link"
        :class="{ active: route.name === 'progress' }"
        @click="closeMenu"
      >
        <span class="nav-icon">📊</span>
        Progress
      </RouterLink>
    </div>

    <div class="sidebar-footer">
      <div class="user-info">
        <span class="user-avatar">{{ (user?.name ?? user?.email ?? 'Y')[0].toUpperCase() }}</span>
        <span class="user-name">{{ user?.name ?? user?.email ?? 'You' }}</span>
      </div>
      <button class="logout-btn" @click="logout">Sign out</button>
    </div>
  </nav>
</template>

<style scoped>
/* ── Sidebar ── */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 220px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  z-index: 200;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Brand ── */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 1.5rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.brand-icon {
  font-size: 1.4rem;
}

.brand-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
}

/* ── Nav links ── */
.nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  background: var(--bg-soft);
  color: var(--text);
}

.nav-link.active {
  background: var(--accent-glow);
  color: var(--accent-strong);
  font-weight: 600;
}

.nav-icon {
  font-size: 1.1rem;
  width: 1.4rem;
  text-align: center;
}

/* ── Footer ── */
.sidebar-footer {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-glow);
  color: var(--accent-strong);
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.82rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.logout-btn:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
  background: var(--bg-soft);
}

/* ── Hamburger (mobile only) ── */
.hamburger {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 300;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(46, 90, 72, 0.1);
}

.hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: transform 0.25s, opacity 0.25s;
  transform-origin: center;
}

.hamburger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.hamburger.open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.hamburger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ── Backdrop ── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 190;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Mobile overrides ── */
@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .sidebar {
    transform: translateX(-100%);
    box-shadow: 4px 0 24px rgba(46, 90, 72, 0.12);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}
</style>
