<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useCoach } from '@/composables/useCoach.js'
import ExerciseRow from '@/components/ExerciseRow.vue'
import { orderBlocks } from '@/utils/flowSteps.js'

const route = useRoute()
const { activeFlow, getFlowById } = useCoach()

const loading = ref(true)
const loadError = ref('')

const routine = computed(() => activeFlow.value?.routine_data ?? null)

const blocks = computed(() => orderBlocks(routine.value?.blocks))

const createdLabel = computed(() =>
  activeFlow.value
    ? new Date(activeFlow.value.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '',
)

watch(
  () => route.params.id,
  async (id) => {
    loading.value = true
    loadError.value = ''
    try {
      await getFlowById(id)
    } catch {
      loadError.value = 'Could not load this flow.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="detail-page">
    <main class="detail-main">
      <div v-if="loading" class="state-card">Loading flow...</div>

      <div v-else-if="loadError || !activeFlow" class="state-card">
        <p>{{ loadError || 'Flow not found.' }}</p>
        <RouterLink to="/flows" class="btn-secondary">← Back to Library</RouterLink>
      </div>

      <template v-else>
        <header class="header">
          <h1 class="title">{{ activeFlow.name }}</h1>
          <div class="badges">
            <span class="badge">{{ activeFlow.duration_minutes }} min</span>
            <span class="badge focus">{{ activeFlow.target_focus }}</span>
            <span class="badge muted">{{ createdLabel }}</span>
          </div>
          <p v-if="routine?.workout_summary" class="summary">{{ routine.workout_summary }}</p>
        </header>

        <section v-for="block in blocks" :key="block.block_name" class="block">
          <h2 class="block-title" :style="{ borderColor: block.meta.accent }">
            <span>{{ block.meta.icon }}</span>
            {{ block.block_name }}
            <span v-if="block.structure === 'circuit'" class="structure-tag">
              Circuit · {{ Math.max(...block.exercises.map((e) => e.sets)) }} rounds
            </span>
          </h2>
          <div class="exercises">
            <ExerciseRow v-for="(ex, i) in block.exercises" :key="`${ex.name}-${i}`" :exercise="ex" />
          </div>
        </section>

        <p v-if="!blocks.length" class="state-card">This flow has no exercises.</p>

        <div class="toolbar">
          <RouterLink to="/flows" class="btn-secondary">← Back to Library</RouterLink>
          <RouterLink v-if="blocks.length" :to="`/flows/${activeFlow.id}/run`" class="btn-primary">
            Start Workout
          </RouterLink>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg);
  padding: 2rem 1rem;
}

.detail-main {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
}

.header {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.badge {
  padding: 0.15rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--accent-glow);
  color: var(--accent-strong);
}

.badge.focus {
  background: #dbeafe;
  color: #1e4f9a;
  text-transform: capitalize;
}

.badge.muted {
  background: var(--bg-muted);
  color: var(--text-muted);
  font-weight: 500;
}

.summary {
  font-size: 0.92rem;
  color: var(--text);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  padding-left: 0.6rem;
  border-left: 4px solid var(--accent);
}

.structure-tag {
  padding: 0.1rem 0.55rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--bg-muted);
  color: var(--text-muted);
}

.exercises {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-secondary {
  padding: 0.6rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--bg-surface);
}

.btn-secondary:hover {
  border-color: var(--accent);
}

.btn-primary {
  display: inline-block;
  text-decoration: none;
  padding: 0.65rem 1.25rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
}

.btn-primary:hover {
  background: var(--accent-strong);
}
</style>
