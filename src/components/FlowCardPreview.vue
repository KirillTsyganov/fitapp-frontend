<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  flow: { type: Object, required: true },
  variant: { type: String, default: 'library' },
})

const blocks = computed(() => props.flow.routine_data?.blocks ?? [])
const exerciseCount = computed(() =>
  blocks.value.reduce((sum, b) => sum + b.exercises.length, 0),
)
const isInline = computed(() => props.variant === 'inline')
</script>

<template>
  <RouterLink :to="`/flows/${flow.id}`" class="flow-card" :class="{ inline: isInline }">
    <div class="card-top">
      <span class="flow-name">{{ flow.name }}</span>
      <span class="badge">{{ flow.duration_minutes }} min</span>
    </div>
    <div class="focus">{{ flow.target_focus }}</div>
    <p v-if="!isInline && flow.routine_data?.workout_summary" class="summary">
      {{ flow.routine_data.workout_summary }}
    </p>
    <div class="card-bottom">
      <span class="meta">{{ blocks.length }} blocks · {{ exerciseCount }} exercises</span>
      <span class="cta">{{ isInline ? `View & Start Flow: ${flow.name} →` : 'Open →' }}</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.flow-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1rem 1.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  text-decoration: none;
  color: var(--text);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.flow-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 20px var(--accent-glow);
}

.flow-card.inline {
  border-color: var(--accent);
  background: var(--bg-soft);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.flow-name {
  font-size: 1.02rem;
  font-weight: 700;
}

.badge {
  flex-shrink: 0;
  padding: 0.15rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--accent-glow);
  color: var(--accent-strong);
}

.focus {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.summary {
  font-size: 0.85rem;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.2rem;
}

.meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.cta {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-strong);
}
</style>
