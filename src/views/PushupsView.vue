<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

const { user, logout } = useAuth()

// ── Daily state ──────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
const STORAGE_KEY = `pushlog_${TODAY}`

function loadDayState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveDayState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const dailyTarget = ref(null)
const completedReps = ref(0)

onMounted(() => {
  const saved = loadDayState()
  if (saved) {
    dailyTarget.value = saved.target
    completedReps.value = saved.completedReps ?? 0
  }
})

// ── Target generation ─────────────────────────────────────────────────────────
function generateTarget() {
  const target = Math.floor(Math.random() * (150 - 80 + 1)) + 80
  dailyTarget.value = target
  completedReps.value = 0
  saveDayState({ target, completedReps: 0 })
}

// ── Rep submission ────────────────────────────────────────────────────────────
const repsInput = ref('')
const inputError = ref('')

function submitReps() {
  const reps = parseInt(repsInput.value, 10)
  if (!reps || reps <= 0) {
    inputError.value = 'Enter a valid number of reps'
    return
  }
  inputError.value = ''
  completedReps.value += reps
  repsInput.value = ''
  saveDayState({ target: dailyTarget.value, completedReps: completedReps.value })
}

function handleKeydown(e) {
  if (e.key === 'Enter') submitReps()
}

// ── Progress ──────────────────────────────────────────────────────────────────
const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progressPct = computed(() => {
  if (!dailyTarget.value) return 0
  return Math.min(completedReps.value / dailyTarget.value, 1)
})

const dashOffset = computed(() => {
  return CIRCUMFERENCE * (1 - progressPct.value)
})

const remaining = computed(() => {
  if (!dailyTarget.value) return 0
  return Math.max(dailyTarget.value - completedReps.value, 0)
})

const isComplete = computed(() => completedReps.value >= (dailyTarget.value ?? Infinity))
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="header">
      <span class="brand">💪 PushLog</span>
      <div class="user-area">
        <span class="user-name">{{ user?.name ?? user?.email ?? 'You' }}</span>
        <button class="logout-btn" @click="logout">Sign out</button>
      </div>
    </header>

    <main class="main">
      <!-- No target yet -->
      <div v-if="!dailyTarget" class="generate-section">
        <div class="generate-icon">🎯</div>
        <h2>Ready for today?</h2>
        <p>Hit the button to get your daily pushup target.</p>
        <button class="btn-primary pulse" @click="generateTarget">Generate Today's Target</button>
      </div>

      <!-- Target set -->
      <div v-else class="tracker">
        <!-- Circular progress -->
        <div class="ring-wrapper">
          <svg class="ring" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Track -->
            <circle
              cx="100"
              cy="100"
              :r="RADIUS"
              fill="none"
              stroke="var(--bg-muted)"
              stroke-width="12"
            />
            <!-- Progress arc -->
            <circle
              cx="100"
              cy="100"
              :r="RADIUS"
              fill="none"
              :stroke="isComplete ? 'var(--success)' : 'var(--accent)'"
              stroke-width="12"
              stroke-linecap="round"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="dashOffset"
              class="arc"
            />
          </svg>
          <div class="ring-label">
            <span class="ring-reps">{{ completedReps }}</span>
            <span class="ring-of">of {{ dailyTarget }}</span>
          </div>
        </div>

        <!-- Stats row -->
        <div class="stats">
          <div class="stat">
            <span class="stat-value">{{ dailyTarget }}</span>
            <span class="stat-label">Target</span>
          </div>
          <div class="stat">
            <span class="stat-value" :class="{ 'text-success': isComplete }">{{ completedReps }}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat">
            <span class="stat-value" :class="{ 'text-success': isComplete }">
              {{ isComplete ? '✓' : remaining }}
            </span>
            <span class="stat-label">Left</span>
          </div>
        </div>

        <!-- Completion banner -->
        <div v-if="isComplete" class="complete-banner">
          🎉 Target crushed! Great work today.
        </div>

        <!-- Rep submission -->
        <div class="submit-section">
          <p class="submit-label">Log a set</p>
          <div class="submit-row">
            <input
              v-model="repsInput"
              type="number"
              min="1"
              max="999"
              placeholder="Reps done"
              class="rep-input"
              @keydown="handleKeydown"
            />
            <button class="btn-primary" @click="submitReps">Add</button>
          </div>
          <p v-if="inputError" class="input-error">{{ inputError }}</p>
        </div>

        <!-- Regenerate -->
        <button class="btn-ghost" @click="generateTarget">↺ New target for today</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.user-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-name {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.logout-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.logout-btn:hover {
  border-color: var(--accent);
  color: var(--text);
}

/* ── Main ── */
.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

/* ── Generate section ── */
.generate-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 340px;
}

.generate-icon {
  font-size: 4rem;
  line-height: 1;
}

.generate-section h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text);
}

.generate-section p {
  color: var(--text-muted);
  font-size: 1rem;
}

/* ── Tracker ── */
.tracker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  max-width: 400px;
}

/* ── Progress ring ── */
.ring-wrapper {
  position: relative;
  width: 220px;
  height: 220px;
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.arc {
  transition: stroke-dashoffset 0.5s ease, stroke 0.4s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
}

.ring-reps {
  font-size: 2.75rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.ring-of {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* ── Stats ── */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  width: 100%;
}

.stat {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Complete banner ── */
.complete-banner {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: var(--success);
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
  width: 100%;
}

/* ── Submit section ── */
.submit-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.submit-label {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.submit-row {
  display: flex;
  gap: 0.75rem;
}

.rep-input {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  color: var(--text);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  -moz-appearance: textfield;
}

.rep-input::-webkit-outer-spin-button,
.rep-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

.rep-input:focus {
  border-color: var(--accent);
}

.input-error {
  color: #f87171;
  font-size: 0.8rem;
}

/* ── Buttons ── */
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s, transform 0.1s;
  white-space: nowrap;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-ghost {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: color 0.2s;
}

.btn-ghost:hover {
  color: var(--text);
}

/* ── Utilities ── */
.text-success {
  color: var(--success) !important;
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: 0 0 0 12px transparent; }
}
</style>
