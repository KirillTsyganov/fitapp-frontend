<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSequences } from '@/composables/useSequences.js'

const router = useRouter()
const { sequences, sequencesLoading, deleteSequence, loadSequences } = useSequences()

const savedFlows = computed(() =>
  sequences.value.filter(s => !s.isTemporary)
)

onMounted(loadSequences)

function run(id) {
  router.push(`/flow/${id}`)
}

async function del(id) {
  await deleteSequence(id)
}

function formatDuration(secs) {
  if (!secs) return '0s'
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function exerciseSummary(flow) {
  const names = (flow.exercises ?? []).map(e => e.name)
  if (!names.length) return 'No exercises'
  if (names.length <= 3) return names.join(' · ')
  return names.slice(0, 3).join(' · ') + ` +${names.length - 3} more`
}
</script>

<template>
  <div class="flows-page">
    <main class="flows-main">

      <div class="page-header">
        <h1 class="page-title">My Flows</h1>
        <RouterLink to="/flow" class="btn-new">+ New Flow</RouterLink>
      </div>

      <!-- Loading skeleton -->
      <div v-if="sequencesLoading && !savedFlows.length" class="state-card">
        <div class="loading-rows">
          <div class="loading-row" />
          <div class="loading-row" />
          <div class="loading-row" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!savedFlows.length" class="empty-state">
        <div class="empty-icon">🌊</div>
        <h2 class="empty-title">No flows yet</h2>
        <p class="empty-sub">Build your first timed exercise sequence</p>
        <RouterLink to="/flow" class="btn-primary">Build a Flow</RouterLink>
      </div>

      <!-- Flow list -->
      <TransitionGroup v-else name="flow-list" tag="div" class="flows-list">
        <div
          v-for="flow in savedFlows"
          :key="flow.id"
          class="flow-card"
        >
          <div class="flow-card-body" @click="run(flow.id)">
            <div class="flow-name">{{ flow.name }}</div>
            <div class="flow-exercises">{{ exerciseSummary(flow) }}</div>
            <div class="flow-meta">
              <span class="meta-chip">
                {{ (flow.exercises ?? []).length }}
                exercise{{ (flow.exercises ?? []).length !== 1 ? 's' : '' }}
              </span>
              <span class="meta-chip">{{ formatDuration(flow.total_duration ?? flow.totalDuration) }}</span>
            </div>
          </div>
          <div class="flow-card-actions">
            <button class="btn-run" @click="run(flow.id)" aria-label="Run flow">▶ Start</button>
            <button class="btn-del" @click.stop="del(flow.id)" aria-label="Delete flow">✕</button>
          </div>
        </div>
      </TransitionGroup>

    </main>
  </div>
</template>

<style scoped>
.flows-page {
  min-height: 100vh;
  background: var(--bg);
  padding: 2rem 1rem;
}

.flows-main {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text);
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
  transition: background 0.15s;
  white-space: nowrap;
}

.btn-new:hover {
  background: var(--accent-strong);
}

/* Loading skeleton */
.state-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem;
}

.loading-rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loading-row {
  height: 72px;
  background: var(--bg-muted);
  border-radius: 12px;
  animation: shimmer 1.4s ease-in-out infinite;
}

.loading-row:nth-child(2) { animation-delay: 0.15s; }
.loading-row:nth-child(3) { animation-delay: 0.3s; }

@keyframes shimmer {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.4; }
}

/* Empty state */
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

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.25rem;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.empty-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.btn-primary {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
  text-decoration: none;
}

.btn-primary:hover {
  background: var(--accent-strong);
}

/* Flow list */
.flows-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}

/* Flow card */
.flow-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.flow-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 20px var(--accent-glow);
}

.flow-card-body {
  flex: 1;
  padding: 1rem 1.25rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.flow-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-exercises {
  font-size: 0.82rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-meta {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.1rem;
  flex-wrap: wrap;
}

.meta-chip {
  padding: 0.15rem 0.5rem;
  background: var(--bg-muted);
  border-radius: 20px;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.flow-card-actions {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  flex-shrink: 0;
}

.btn-run {
  flex: 1;
  padding: 0 1rem;
  background: var(--accent);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.btn-run:hover {
  background: var(--accent-strong);
}

.btn-del {
  padding: 0.6rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.btn-del:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

/* List transition */
.flow-list-enter-active,
.flow-list-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.flow-list-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.flow-list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.flow-list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
