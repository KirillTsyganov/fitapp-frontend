<script setup>
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'

const route = useRoute()
const showNav = computed(() => !!route.meta?.requiresAuth)
</script>

<template>
  <div v-if="showNav" class="app-shell">
    <NavBar />
    <div class="app-content">
      <RouterView />
    </div>
  </div>
  <RouterView v-else />
</template>

<style>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  min-width: 0;
  margin-left: 220px;
}

@media (max-width: 768px) {
  .app-content {
    margin-left: 0;
    padding-top: 56px;
  }
}
</style>
