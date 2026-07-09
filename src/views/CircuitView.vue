<script setup>
import { computed, onMounted, ref } from 'vue'
import { authFetch } from '@/composables/useAuth.js'
import { useSessions } from '@/composables/useSessions.js'

const { updateSessionInCache } = useSessions()

// Circuit definition (mirrors backend CIRCUIT constant)
const CIRCUIT_EXERCISES = [
  { exercise: 'Pushups', reps: 20 },
  { exercise: 'Lunges', reps: 20 },
]

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateContext() {
  const today = new Date()
  return {
    date: getLocalDateString(today),
    tzOffsetMinutes: today.getTimezoneOffset(),
  }
}

function formatSessionDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const sessionId = ref(null)
const sessionDate = ref(getDateContext().date)
const targetRounds = ref(null)
const roundsCompleted = ref(0)
const movementPoints = ref(0)
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')

function resetSession() {
  sessionId.value = null
  targetRounds.value = null
  roundsCompleted.value = 0
  movementPoints.value = 0
}

function applySession(session) {
  sessionId.value = session.session_id
  sessionDate.value = session.date
  targetRounds.value = session.target_rounds
  roundsCompleted.value = session.rounds_completed ?? 0
  movementPoints.value = session.movement_points ?? 0
}

async function loadTodaySession() {
  loading.value = true
  loadError.value = ''

  const dateContext = getDateContext()
  const params = new URLSearchParams({
    date: dateContext.date,
    tzOffsetMinutes: String(dateContext.tzOffsetMinutes),
  })

  try {
    const res = await authFetch(`/api/sessions/today?${params.toString()}`)
    if (!res.ok) throw new Error('Unable to load session')

    const data = await res.json()
    sessionDate.value = data.date ?? dateContext.date

    if (data.session === null) {
      resetSession()
      sessionDate.value = data.date ?? dateContext.date
    } else {
      applySession(data)
    }
  } catch {
    loadError.value = "Could not sync today's circuit. Please try again."
    resetSession()
    sessionDate.value = dateContext.date
  } finally {
    loading.value = false
  }
}

async function generateTarget() {
  saving.value = true
  saveError.value = ''

  try {
    const res = await authFetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getDateContext()),
    })
    if (!res.ok) throw new Error('Unable to create target')

    const data = await res.json()
    applySession(data)
    updateSessionInCache({
      session_id: data.session_id,
      date: data.date,
      rounds_completed: data.rounds_completed ?? 0,
      movement_points: data.movement_points ?? 0,
      target_rounds: data.target_rounds,
      is_completed: false,
    })
  } catch {
    saveError.value = "Could not create today's circuit. Please try again."
  } finally {
    saving.value = false
  }
}

async function logRound() {
  if (saving.value || isComplete.value) return
  if (!sessionId.value) {
    saveError.value = "Generate today's circuit first"
    return
  }

  // Optimistic update: reflect the round immediately in the UI
  const prevRoundsCompleted = roundsCompleted.value
  const prevMovementPoints = movementPoints.value
  const optimisticRounds = roundsCompleted.value + 1
  roundsCompleted.value = optimisticRounds
  movementPoints.value = Math.min(Math.round((optimisticRounds / targetRounds.value) * 100), 100)

  saving.value = true
  saveError.value = ''

  const clientId = crypto.randomUUID()

  try {
    const res = await authFetch(`/api/sessions/${sessionId.value}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    if (!res.ok) throw new Error('Unable to log round')

    const data = await res.json()
    // Reconcile with server truth
    roundsCompleted.value = data.rounds_completed
    movementPoints.value = data.movement_points
    targetRounds.value = data.target_rounds
    updateSessionInCache({
      session_id: sessionId.value,
      date: sessionDate.value,
      rounds_completed: data.rounds_completed,
      movement_points: data.movement_points,
      target_rounds: data.target_rounds,
      is_completed: data.movement_points >= 100,
    })
  } catch {
    // Revert optimistic update on failure
    roundsCompleted.value = prevRoundsCompleted
    movementPoints.value = prevMovementPoints
    saveError.value = 'Could not log round. Please try again.'
  } finally {
    saving.value = false
  }
}

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progressPct = computed(() => movementPoints.value / 100)
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progressPct.value))
const isComplete = computed(() => movementPoints.value >= 100)
const remainingRounds = computed(() => Math.max((targetRounds.value ?? 0) - roundsCompleted.value, 0))
const sessionDateLabel = computed(() => formatSessionDate(sessionDate.value))

onMounted(loadTodaySession)
</script>

<template>
  <div class="page">
    <main class="main">
      <div v-if="loading" class="state-card">
        <div class="generate-icon">☁️</div>
        <h2>Syncing today</h2>
        <p>Checking your circuit for {{ sessionDateLabel }}.</p>
      </div>

      <div v-else-if="loadError" class="state-card">
        <div class="generate-icon">⚠️</div>
        <h2>Sync paused</h2>
        <p>{{ loadError }}</p>
        <button class="btn-primary" @click="loadTodaySession">Try again</button>
      </div>

      <div v-else-if="!targetRounds" class="generate-section">
        <div class="generate-icon">🎯</div>
        <h2>Ready for today?</h2>
        <p>Generate your circuit target for {{ sessionDateLabel }}.</p>
        <div class="circuit-preview">
          <span class="circuit-preview-label">1 Round =</span>
          <span
            v-for="(ex, i) in CIRCUIT_EXERCISES"
            :key="ex.exercise"
            class="circuit-preview-ex"
          >
            <span v-if="i > 0" class="plus">+</span>
            {{ ex.reps }} {{ ex.exercise }}
          </span>
        </div>
        <button class="btn-primary pulse" :disabled="saving" @click="generateTarget">
          {{ saving ? 'Generating…' : "Generate Today's Circuit" }}
        </button>
        <p v-if="saveError" class="input-error">{{ saveError }}</p>
      </div>

      <div v-else class="tracker">
        <div class="session-chip">Circuit for {{ sessionDateLabel }}</div>

        <div class="ring-wrapper">
          <svg class="ring" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="100"
              cy="100"
              :r="RADIUS"
              fill="none"
              stroke="var(--bg-muted)"
              stroke-width="12"
            />
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
            <span class="ring-reps">{{ roundsCompleted }}</span>
            <span class="ring-of">of {{ targetRounds }} rounds</span>
          </div>
        </div>

        <div class="stats">
          <div class="stat">
            <span class="stat-value">{{ targetRounds }}</span>
            <span class="stat-label">Target</span>
          </div>
          <div class="stat">
            <span class="stat-value" :class="{ 'text-success': isComplete }">{{ roundsCompleted }}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat">
            <span class="stat-value" :class="{ 'text-success': isComplete }">
              {{ isComplete ? '✓' : remainingRounds }}
            </span>
            <span class="stat-label">Left</span>
          </div>
          <div class="stat">
            <span class="stat-value" :class="{ 'text-success': isComplete }">
              {{ movementPoints }}%
            </span>
            <span class="stat-label">Score</span>
          </div>
        </div>

        <!-- Circuit breakdown -->
        <div class="circuit-info">
          <p class="circuit-label">1 Round =</p>
          <div class="circuit-exercises">
            <span
              v-for="(ex, i) in CIRCUIT_EXERCISES"
              :key="ex.exercise"
              class="exercise-chip-row"
            >
              <span v-if="i > 0" class="exercise-plus">+</span>
              <span class="exercise-chip">{{ ex.reps }} {{ ex.exercise }}</span>
            </span>
          </div>
        </div>

        <div v-if="isComplete" class="complete-banner">
          🎉 Circuit crushed! Great work today.
        </div>

        <button
          class="btn-log-round"
          :disabled="saving || isComplete"
          @click="logRound"
        >
          {{ saving ? 'Syncing…' : 'Log 1 Round' }}
        </button>
        <p v-if="saveError" class="input-error">{{ saveError }}</p>

        <button class="btn-ghost" @click="loadTodaySession">Refresh from server</button>
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

.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.state-card,
.generate-section,
.tracker {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 28px;
  box-shadow: 0 28px 60px rgba(46, 90, 72, 0.08);
}

.generate-section,
.state-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 380px;
  padding: 2.4rem 2rem;
}

.generate-icon {
  font-size: 4rem;
  line-height: 1;
}

.generate-section h2,
.state-card h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text);
}

.generate-section p,
.state-card p {
  color: var(--text-muted);
  font-size: 1rem;
}

/* Circuit preview on generate screen */
.circuit-preview {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
  background: var(--bg-soft);
  border-radius: 12px;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
}

.circuit-preview-label {
  color: var(--text-muted);
  font-weight: 600;
  margin-right: 0.2rem;
}

.circuit-preview-ex {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.plus {
  color: var(--text-muted);
  font-weight: 600;
}

.tracker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
  width: 100%;
  max-width: 420px;
  padding: 2rem;
}

.session-chip {
  align-self: stretch;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--accent-strong);
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

/* Ring */
.ring-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.arc {
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-reps {
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--text);
  line-height: 1;
}

.ring-of {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 0.25rem;
}

/* Stats row */
.stats {
  display: flex;
  gap: 0.75rem;
  align-self: stretch;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  background: var(--bg-soft);
  border-radius: 14px;
  padding: 0.75rem 0.5rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Circuit info */
.circuit-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.circuit-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.circuit-exercises {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

.exercise-chip-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.exercise-plus {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.exercise-chip {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

/* Complete banner */
.complete-banner {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--success);
  text-align: center;
  align-self: stretch;
}

/* Log Round button */
.btn-log-round {
  align-self: stretch;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 1.1rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: opacity 0.15s, transform 0.1s, background 0.2s;
}

.btn-log-round:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-log-round:active:not(:disabled) {
  transform: translateY(0);
}

.btn-log-round:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Misc */
.text-success {
  color: var(--success) !important;
}

.input-error {
  color: #e05252;
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
  50%       { box-shadow: 0 0 0 8px transparent; }
}

.btn-ghost {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: color 0.15s;
}

.btn-ghost:hover {
  color: var(--text);
}
</style>
