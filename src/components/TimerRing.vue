<script setup>
const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

defineProps({
  progress: { type: Number, default: 0 },
  color: { type: String, default: 'var(--accent)' },
  active: { type: Boolean, default: false },
})
</script>

<template>
  <div class="ring-wrap">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="ring-svg">
      <circle cx="100" cy="100" :r="RADIUS" fill="none" stroke="var(--bg-muted)" stroke-width="10" />
      <circle
        cx="100"
        cy="100"
        :r="RADIUS"
        fill="none"
        :stroke="color"
        stroke-width="10"
        stroke-linecap="round"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)))"
        class="ring-arc"
        :class="{ 'ring-arc-active': active }"
      />
    </svg>
    <div class="ring-center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ring-wrap {
  position: relative;
  width: 240px;
  height: 240px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-arc {
  transition: stroke-dashoffset 0.9s linear, stroke 0.4s ease;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0 1.5rem;
  text-align: center;
}
</style>
