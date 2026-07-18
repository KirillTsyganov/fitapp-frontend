<script setup>
import { computed, onMounted, ref } from 'vue'
import { authFetch } from '@/composables/useAuth.js'
import { useSessions } from '@/composables/useSessions.js'

const { updateSessionInCache, removeSessionFromCache } = useSessions()

// Circuit exercise names (order mirrors backend CIRCUIT)
const EXERCISE_NAMES = ['Pushups', 'Lunges']

// Reactive reps value — updated from session data or settings
const repsPerExercise = ref(20)
const circuitExercises = computed(() =>
  EXERCISE_NAMES.map(name => ({ exercise: name, reps: repsPerExercise.value }))
)

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
const resetting = ref(false)
const loadError = ref('')
const saveError = ref('')
const resettingError = ref('')
const showResetConfirm = ref(false)

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
  repsPerExercise.value = session.reps_per_exercise ?? 20
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
      repsPerExercise.value = data.settings?.reps_per_exercise ?? 20
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

function requestDiscard() {
  if (isComplete.value || resetting.value) return
  if (roundsCompleted.value > 0) {
    showResetConfirm.value = true
  } else {
    discardSession()
  }
}

async function discardSession() {
  showResetConfirm.value = false
  if (!sessionId.value || resetting.value) return
  resetting.value = true
  resettingError.value = ''
  try {
    const res = await authFetch(`/api/sessions/${sessionId.value}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Could not reset session')
    removeSessionFromCache(sessionId.value)
    resetSession()
  } catch {
    resettingError.value = 'Could not reset. Please try again.'
  } finally {
    resetting.value = false
  }
}

async function generateTarget(energyLevel) {
  saving.value = true
  saveError.value = ''

  try {
    const res = await authFetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...getDateContext(), energy_level: energyLevel }),
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
        <p>Pick your energy level to generate today's circuit for {{ sessionDateLabel }}.</p>
        <div class="circuit-preview">
          <span class="circuit-preview-label">1 Round =</span>
          <span
            v-for="(ex, i) in circuitExercises"
            :key="ex.exercise"
            class="circuit-preview-ex"
          >
            <span v-if="i > 0" class="plus">+</span>
            {{ ex.reps }} {{ ex.exercise }}
          </span>
        </div>
        <div class="energy-group" :class="{ disabled: saving }">
          <button
            class="energy-btn energy-low"
            :disabled="saving"
            @click="generateTarget('low')"
          >
            🔋 Low
          </button>
          <button
            class="energy-btn energy-standard"
            :disabled="saving"
            @click="generateTarget('standard')"
          >
            ⚡ Standard
          </button>
          <button
            class="energy-btn energy-high"
            :disabled="saving"
            @click="generateTarget('high')"
          >
            🚀 High
          </button>
        </div>
        <p v-if="saving" class="generating-hint">Generating…</p>
        <p v-if="saveError" class="input-error">{{ saveError }}</p>
      </div>

      <div v-else class="tracker">
        <div v-if="!isComplete" class="back-tooltip-wrap">
          <button
            class="btn-back-arrow"
            :disabled="resetting"
            aria-label="Change energy level"
            @click="requestDiscard"
          >
            ←
          </button>
          <span class="back-tooltip">Change energy level</span>
        </div>

        <!-- Confirm overlay: shown when resetting mid-session -->
        <Transition name="confirm-fade">
          <div v-if="showResetConfirm" class="confirm-overlay">
            <p class="confirm-msg">You’ve logged {{ roundsCompleted }} round{{ roundsCompleted !== 1 ? 's' : '' }}. Changing energy level will delete this session and you’ll start fresh.</p>
            <div class="confirm-actions">
              <button class="confirm-cancel" @click="showResetConfirm = false">Keep going</button>
              <button class="confirm-ok" :disabled="resetting" @click="discardSession">
                {{ resetting ? 'Resetting…' : 'Yes, reset' }}
              </button>
            </div>
            <p v-if="resettingError" class="input-error">{{ resettingError }}</p>
          </div>
        </Transition>

        <div class="tracker-header">
          <div class="session-chip">Circuit for {{ sessionDateLabel }}</div>
          <div class="round-def">
            <template v-for="(ex, i) in circuitExercises" :key="ex.exercise">
              <span v-if="i > 0" class="round-def-sep">+</span>
              <span class="round-def-ex">{{ ex.reps }} {{ ex.exercise }}</span>
            </template>
            <span class="round-def-label">· per round</span>
          </div>
        </div>

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
            <span class="ring-score" :class="{ 'text-success': isComplete }">{{ movementPoints }}%</span>
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

/* Energy profile button group */
.energy-group {
  display: flex;
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1.5px solid var(--border);
  width: 100%;
}

.energy-group.disabled {
  opacity: 0.55;
}

.energy-btn {
  flex: 1;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.8rem 0.5rem;
  transition: filter 0.15s, opacity 0.15s;
  background: var(--bg-surface);
  color: var(--text);
}

.energy-btn + .energy-btn {
  border-left: 1.5px solid var(--border);
}

.energy-btn:disabled {
  cursor: default;
}

.energy-btn:not(:disabled):hover {
  filter: brightness(0.93);
}

.energy-low:not(:disabled):hover,
.energy-low:focus-visible {
  background: rgba(100, 160, 240, 0.18);
  color: #2a6db8;
}

.energy-standard:not(:disabled):hover,
.energy-standard:focus-visible {
  background: rgba(80, 180, 120, 0.18);
  color: #226e43;
}

.energy-high:not(:disabled):hover,
.energy-high:focus-visible {
  background: rgba(240, 100, 60, 0.18);
  color: #c03a10;
}

.generating-hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.tracker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
  width: 100%;
  max-width: 420px;
  padding: 2rem;
  position: relative;
}

.tracker-header {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
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

/* Back arrow button */
.back-tooltip-wrap {
  position: absolute;
  bottom: 1.1rem;
  left: 1.1rem;
}

.btn-back-arrow {
  width: 2.1rem;
  height: 2.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  border: 1.5px solid var(--border);
  border-radius: 50%;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.btn-back-arrow:hover:not(:disabled) {
  background: var(--bg-muted, var(--border));
  color: var(--text);
  border-color: var(--text-muted);
}

.btn-back-arrow:disabled {
  opacity: 0.4;
  cursor: default;
}

.back-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  background: var(--text);
  color: var(--bg-surface);
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
}

.back-tooltip-wrap:hover .back-tooltip {
  opacity: 1;
  transform: translateY(0);
}

/* Confirm overlay */
.confirm-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: color-mix(in srgb, var(--bg-surface) 96%, transparent);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  padding: 2rem;
  z-index: 10;
}

.confirm-msg {
  font-size: 0.95rem;
  color: var(--text);
  text-align: center;
  line-height: 1.5;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.confirm-cancel {
  flex: 1;
  background: var(--bg-soft);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.7rem 1rem;
  transition: background 0.15s;
}

.confirm-cancel:hover {
  background: var(--bg-muted, var(--border));
}

.confirm-ok {
  flex: 1;
  background: var(--accent);
  border: none;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.7rem 1rem;
  transition: opacity 0.15s;
}

.confirm-ok:disabled {
  opacity: 0.55;
  cursor: default;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.18s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
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

.ring-score {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 0.15rem;
  letter-spacing: 0.03em;
}

/* Round definition row (in tracker header) */
.round-def {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  flex-wrap: wrap;
  justify-content: center;
}

.round-def-ex {
  color: var(--text);
  font-weight: 600;
}

.round-def-sep {
  color: var(--text-muted);
  font-weight: 500;
}

.round-def-label {
  color: var(--text-muted);
  font-weight: 400;
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
