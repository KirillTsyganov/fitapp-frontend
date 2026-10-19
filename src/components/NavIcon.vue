<script setup>
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg
    class="nav-icon"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'today'">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </template>
    <path v-else-if="name === 'progress'" d="M5 20v-9M12 20V5M19 20v-7" />
    <path v-else-if="name === 'coach'" d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    <path v-else-if="name === 'flows'" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    <template v-else-if="name === 'pose'">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 8v6M12 14l-3 6M12 14l3 6M7 11l5-3 5 3" />
    </template>
    <template v-else-if="name === 'settings'">
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </template>
  </svg>
</template>

<style scoped>
.nav-icon {
  flex-shrink: 0;
}
</style>
