<script setup>
import { computed, onMounted, ref } from 'vue'
import { authFetch, useAuth } from '@/composables/useAuth.js'

const { user, logout } = useAuth()

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
const dailyTarget = ref(null)
const completedReps = ref(0)
const repsInput = ref('')
const inputError = ref('')
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')

function resetSession() {
  sessionId.value = null
  dailyTarget.value = null
  completedReps.value = 0
  repsInput.value = ''
}

function applySession(session) {
  sessionId.value = session.session_id
  sessionDate.value = session.date
  dailyTarget.value = session.target_pushups
  completedReps.value = session.total_reps
}

async function loadTodaySession() {
  loading.value = true
  loadError.value = ''

  const params = new URLSearchParams()
  const dateContext = getDateContext()
  params.set('date', dateContext.date)
  params.set('tzOffsetMinutes', String(dateContext.tzOffsetMinutes))

  try {
    const res = await authFetch(`/api/sessions/today?${params.toString()}`)
    if (!res.ok) {
      throw new Error('Unable to load session')
    }

    const data = await res.json()
    sessionDate.value = data.date ?? dateContext.date

    if (data.session === null) {
      resetSession()
      sessionDate.value = data.date ?? dateContext.date
    } else {
      applySession(data)
    }
  } catch {
    loadError.value = 'Could not sync today\'s target. Please try again.'
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
    if (!res.ok) {
      throw new Error('Unable to create target')
    }

    const data = await res.json()
    applySession(data)
  } catch {
    saveError.value = 'Could not create today\'s target. Please try again.'
  } finally {
    saving.value = false
  }
}

async function submitReps() {
  if (saving.value) return
  const reps = parseInt(repsInput.value, 10)
  if (!reps || reps <= 0) {
    inputError.value = 'Enter a valid number of reps'
    return
  }
  if (!sessionId.value) {
    inputError.value = 'Generate today\'s target first'
    return
  }

  saving.value = true
  inputError.value = ''
  saveError.value = ''

  const clientSetId = crypto.randomUUID()

  try {
    const res = await authFetch(`/api/sessions/${sessionId.value}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reps, client_id: clientSetId }),
    })
    if (!res.ok) {
      throw new Error('Unable to save reps')
    }

    const data = await res.json()
    completedReps.value = data.total_reps
    repsInput.value = ''
  } catch {
    saveError.value = 'Could not save this set. Please try again.'
  } finally {
    saving.value = false
  }
}

function handleKeydown(event) {
  if (event.key === 'Enter') submitReps()
}

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progressPct = computed(() => {
  if (!dailyTarget.value) return 0
  return Math.min(completedReps.value / dailyTarget.value, 1)
})

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progressPct.value))

const remaining = computed(() => {
  if (!dailyTarget.value) return 0
  return Math.max(dailyTarget.value - completedReps.value, 0)
})

const isComplete = computed(() => completedReps.value >= (dailyTarget.value ?? Infinity))
const sessionDateLabel = computed(() => formatSessionDate(sessionDate.value))

onMounted(loadTodaySession)
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <span class="brand">💪 PushLog</span>
        <p class="header-date">{{ sessionDateLabel }}</p>
      </div>
      <div class="user-area">
        <span class="user-name">{{ user?.name ?? user?.email ?? 'You' }}</span>
        <button class="logout-btn" @click="logout">Sign out</button>
      </div>
    </header>

    <main class="main">
      <div v-if="loading" class="state-card">
        <div class="generate-icon">☁️</div>
        <h2>Syncing today</h2>
        <p>Checking your target for {{ sessionDateLabel }}.</p>
      </div>

      <div v-else-if="loadError" class="state-card">
        <div class="generate-icon">⚠️</div>
        <h2>Sync paused</h2>
        <p>{{ loadError }}</p>
        <button class="btn-primary" @click="loadTodaySession">Try again</button>
      </div>

      <div v-else-if="!dailyTarget" class="generate-section">
        <div class="generate-icon">🎯</div>
        <h2>Ready for today?</h2>
        <p>Generate one target for {{ sessionDateLabel }} and keep it synced across your devices.</p>
        <button class="btn-primary pulse" :disabled="saving" @click="generateTarget">
          {{ saving ? 'Generating…' : "Generate Today's Target" }}
        </button>
        <p v-if="saveError" class="input-error">{{ saveError }}</p>
      </div>

      <div v-else class="tracker">
        <div class="session-chip">Tracked for {{ sessionDateLabel }}</div>

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
            <span class="ring-reps">{{ completedReps }}</span>
            <span class="ring-of">of {{ dailyTarget }}</span>
          </div>
        </div>

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

        <div v-if="isComplete" class="complete-banner">
          🎉 Target crushed! Great work today.
        </div>

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
              :disabled="saving"
              @keydown="handleKeydown"
            />
            <button class="btn-primary" :disabled="saving" @click="submitReps">
              {{ saving ? 'Saving…' : 'Add' }}
            </button>
          </div>
          <p v-if="inputError" class="input-error">{{ inputError }}</p>
          <p v-if="saveError" class="input-error">{{ saveError }}</p>
        </div>

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

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
}

.brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.header-date {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 0.1rem;
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
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, transform 0.1s;
}

.logout-btn:hover {
  border-color: var(--accent);
  color: var(--text);
  transform: translateY(-1px);
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
  max-width: 360px;
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

.tracker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
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

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  width: 100%;
}

.stat {
  background: rgba(255, 255, 255, 0.72);
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

.complete-banner {
  background: rgba(21, 128, 61, 0.12);
  border: 1px solid rgba(21, 128, 61, 0.24);
  color: var(--success);
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
  width: 100%;
}

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
  background: rgba(255, 255, 255, 0.9);
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
  color: #c2410c;
  font-size: 0.8rem;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s, transform 0.1s, box-shadow 0.2s;
  white-space: nowrap;
  box-shadow: 0 16px 30px rgba(31, 143, 106, 0.18);
}

.btn-primary:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled,
.rep-input:disabled {
  cursor: not-allowed;
  opacity: 0.7;
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

@media (max-width: 640px) {
  .header {
    align-items: flex-start;
    gap: 1rem;
    flex-direction: column;
  }

  .user-area {
    width: 100%;
    justify-content: space-between;
  }

  .tracker,
  .generate-section,
  .state-card {
    padding: 1.5rem;
  }

  .submit-row {
    flex-direction: column;
  }
}
</style>
