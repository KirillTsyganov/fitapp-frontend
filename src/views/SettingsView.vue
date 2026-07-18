<script setup>
import { onMounted, ref } from 'vue'
import { authFetch } from '@/composables/useAuth.js'
import { useAuth } from '@/composables/useAuth.js'

const { user } = useAuth()

const minRounds = ref(2)
const maxRounds = ref(8)
const repsPerExercise = ref(20)
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref(false)

async function loadSettings() {
  if (!user.value?.id) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await authFetch(`/api/users/${user.value.id}/settings`)
    if (!res.ok) throw new Error('Failed to load settings')
    const data = await res.json()
    minRounds.value = data.min_rounds
    maxRounds.value = data.max_rounds
    repsPerExercise.value = data.reps_per_exercise ?? 20
  } catch {
    loadError.value = 'Could not load settings. Showing defaults.'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!user.value?.id) return
  saveError.value = ''
  saveSuccess.value = false

  const min = Number(minRounds.value)
  const max = Number(maxRounds.value)
  const rpe = Number(repsPerExercise.value)

  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < 1) {
    saveError.value = 'Round values must be whole numbers of at least 1.'
    return
  }
  if (min > max) {
    saveError.value = 'Minimum rounds cannot exceed maximum rounds.'
    return
  }
  if (max > 50) {
    saveError.value = 'Maximum rounds cannot exceed 50.'
    return
  }
  if (!Number.isInteger(rpe) || rpe < 1 || rpe > 100) {
    saveError.value = 'Reps per exercise must be a whole number between 1 and 100.'
    return
  }

  saving.value = true
  try {
    const res = await authFetch(`/api/users/${user.value.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ min_rounds: min, max_rounds: max, reps_per_exercise: rpe }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Save failed')
    }
    const data = await res.json()
    minRounds.value = data.min_rounds
    maxRounds.value = data.max_rounds
    repsPerExercise.value = data.reps_per_exercise ?? 20
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e) {
    saveError.value = e.message || 'Could not save settings. Please try again.'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="page">
    <main class="main">
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">⚙️</span>
          <h2>Settings</h2>
          <p class="subtitle">Configure your daily circuit targets.</p>
        </div>

        <div v-if="loading" class="loading-text">Loading…</div>

        <template v-else>
          <p v-if="loadError" class="input-error">{{ loadError }}</p>

          <div class="field-group">
            <label class="field-label" for="reps-per-exercise">Reps per Exercise</label>
            <p class="field-hint">Applied to every exercise in a round (pushups, lunges, etc.).</p>
            <input
              id="reps-per-exercise"
              v-model.number="repsPerExercise"
              class="field-input"
              type="number"
              min="1"
              max="100"
              step="1"
            />
          </div>

          <div class="field-group">
            <label class="field-label" for="min-rounds">Minimum Rounds</label>
            <p class="field-hint">Lowest target on low-energy days.</p>
            <input
              id="min-rounds"
              v-model.number="minRounds"
              class="field-input"
              type="number"
              min="1"
              max="50"
              step="1"
            />
          </div>

          <div class="field-group">
            <label class="field-label" for="max-rounds">Maximum Rounds</label>
            <p class="field-hint">Highest target on high-energy days.</p>
            <input
              id="max-rounds"
              v-model.number="maxRounds"
              class="field-input"
              type="number"
              min="1"
              max="50"
              step="1"
            />
          </div>

          <div class="range-preview">
            <span class="range-label">Range preview · {{ repsPerExercise }} reps × 2 exercises = {{ repsPerExercise * 2 }} reps/round</span>
            <div class="range-chips">
              <span class="chip chip-low">🔋 Low: {{ minRounds }}–{{ Math.max(minRounds, minRounds + Math.floor((maxRounds - minRounds) * 0.33)) }}</span>
              <span class="chip chip-std">⚡ Std: {{ Math.min(maxRounds, minRounds + Math.ceil((maxRounds - minRounds) * 0.34)) }}–{{ Math.max(minRounds, minRounds + Math.floor((maxRounds - minRounds) * 0.66)) }}</span>
              <span class="chip chip-high">🚀 High: {{ Math.min(maxRounds, minRounds + Math.ceil((maxRounds - minRounds) * 0.66)) }}–{{ maxRounds }}</span>
            </div>
          </div>

          <p v-if="saveError" class="input-error">{{ saveError }}</p>
          <p v-if="saveSuccess" class="save-success">✓ Settings saved!</p>

          <button class="btn-primary" :disabled="saving" @click="saveSettings">
            {{ saving ? 'Saving…' : 'Save Settings' }}
          </button>
        </template>
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
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
}

.settings-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 28px;
  box-shadow: 0 28px 60px rgba(46, 90, 72, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 2.4rem 2rem;
  width: 100%;
  max-width: 420px;
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
}

.card-icon {
  font-size: 3rem;
  line-height: 1;
}

.card-header h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
}

.subtitle {
  color: var(--text-muted);
  font-size: 1rem;
  margin: 0;
}

.loading-text {
  color: var(--text-muted);
  text-align: center;
  padding: 1rem 0;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.field-hint {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.field-input {
  background: var(--bg-soft, var(--bg));
  border: 1.5px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.65rem 0.9rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--accent);
  outline: none;
}

.range-preview {
  background: var(--bg-soft, var(--bg));
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
}

.range-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.range-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
}

.chip-low  { background: rgba(100, 160, 240, 0.15); color: #3a80c8; }
.chip-std  { background: rgba(80, 180, 120, 0.15);  color: #2d8a56; }
.chip-high { background: rgba(240, 100, 60, 0.15);  color: #d44a20; }

.btn-primary {
  background: var(--accent);
  border: none;
  border-radius: 14px;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.85rem 1.5rem;
  transition: opacity 0.15s;
  width: 100%;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: default;
}

.input-error {
  color: var(--error, #c0392b);
  font-size: 0.9rem;
  margin: 0;
}

.save-success {
  color: var(--success, #27ae60);
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}
</style>
