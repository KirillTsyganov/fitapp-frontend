<template>
  <span class="brand-logo">
    <svg class="brand-mark" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <path d="M6 26C6 14.5 13.5 6 26 6c0 12.5-8 20-20 20Z" fill="#2C4A3E" />
      <path d="M7.5 24.5 20 12" fill="none" stroke="#F9F7F2" stroke-width="1.8" stroke-linecap="round" />
    </svg>
    <span class="brand-word">Quokka</span>
  </span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.brand-mark {
  flex-shrink: 0;
}

.brand-word {
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-primary);
}
</style>
