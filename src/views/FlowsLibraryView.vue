<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCoach } from '@/composables/useCoach.js'
import FlowCardPreview from '@/components/FlowCardPreview.vue'

const DURATION_FILTERS = [
  { label: 'All', test: () => true },
  { label: '≤ 15 min', test: (m) => m <= 15 },
  { label: '20 min', test: (m) => m > 15 && m <= 20 },
  { label: '30 min', test: (m) => m > 20 && m <= 30 },
  { label: '45 min', test: (m) => m > 30 },
]

const { savedFlows, flowsLoading, errorMessage, fetchSavedFlows } = useCoach()

const query = ref('')
const durationIdx = ref(0)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const test = DURATION_FILTERS[durationIdx.value].test
  return savedFlows.value.filter(
    (f) =>
      test(f.duration_minutes) &&
      (!q || f.name.toLowerCase().includes(q) || f.target_focus.toLowerCase().includes(q)),
  )
})

onMounted(() => {
  fetchSavedFlows().catch(() => {})
})
</script>

<template>
  <div class="library-page">
    <main class="library-main">
      <div class="page-header">
        <h1 class="page-title">My Flows</h1>
        <RouterLink to="/coach" class="btn-new">+ New Flow</RouterLink>
      </div>

      <div v-if="savedFlows.length" class="filters">
        <input v-model="query" type="search" class="search" placeholder="Search by name or focus (e.g. hamstrings)" />
        <div class="chips">
          <button
            v-for="(f, i) in DURATION_FILTERS"
            :key="f.label"
            class="chip"
            :class="{ active: durationIdx === i }"
            @click="durationIdx = i"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div v-if="errorMessage && !savedFlows.length" class="error" role="alert">{{ errorMessage }}</div>

      <div v-if="flowsLoading && !savedFlows.length" class="grid">
        <div class="skeleton" />
        <div class="skeleton" />
        <div class="skeleton" />
      </div>

      <div v-else-if="!savedFlows.length && !errorMessage" class="empty-state">
        <div class="empty-icon">🌊</div>
        <h2 class="empty-title">No flows yet</h2>
        <p class="empty-sub">Chat with the coach to generate your first routine.</p>
        <RouterLink to="/coach" class="btn-new">Talk to the Coach</RouterLink>
      </div>

      <p v-else-if="savedFlows.length && !filtered.length" class="empty-sub">No flows match your filters.</p>

      <div v-else class="grid">
        <FlowCardPreview v-for="flow in filtered" :key="flow.id" :flow="flow" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.library-page {
  min-height: 100vh;
  background: var(--bg);
  padding: 2rem 1rem;
}

.library-main {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.btn-new {
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: white;
  border-radius: 10px;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-new:hover {
  background: var(--accent-strong);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.search {
  padding: 0.6rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text);
}

.search:focus {
  outline: none;
  border-color: var(--accent);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  padding: 0.3rem 0.85rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.9rem;
}

.skeleton {
  height: 130px;
  background: var(--bg-muted);
  border-radius: 18px;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.4; }
}

.empty-state {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 3rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-icon { font-size: 2.5rem; }

.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
}

.empty-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.error {
  padding: 0.6rem 0.9rem;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 12px;
  color: #b91c1c;
  font-size: 0.85rem;
}
</style>
