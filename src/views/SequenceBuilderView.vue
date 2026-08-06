<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSequences } from '@/composables/useSequences.js'
import { exercisesList } from '@/utils/exerciseData.js'

const router = useRouter()
const {
  builderExercises,
  builderTotal,
  addToBuilder,
  removeFromBuilder,
  saveSequence,
  createTemporary,
} = useSequences()

const selectedId = ref('')
const duration = ref(30)
const repeats = ref(1)
const flowName = ref('')
const saving = ref(false)
const saveError = ref('')

const selectedExercise = computed(() =>
  exercisesList.find(e => e.id === selectedId.value) ?? null
)

const byCategory = computed(() => {
  const map = {}
  for (const ex of exercisesList) {
    if (!map[ex.category]) map[ex.category] = []
    map[ex.category].push(ex)
  }
  return map
})

const categories = computed(() =>
  Object.keys(byCategory.value).sort()
)

function onExerciseChange() {
  if (selectedExercise.value?.defaultDuration) {
    duration.value = selectedExercise.value.defaultDuration
  }
}

function add() {
  if (!selectedExercise.value) return
  addToBuilder(selectedExercise.value, duration.value, repeats.value)
  selectedId.value = ''
  duration.value = 30
  repeats.value = 1
}

function quickStart() {
  if (!builderExercises.value.length) return
  const id = createTemporary()
  router.push(`/flow/${id}`)
}

async function save() {
  if (!flowName.value.trim() || !builderExercises.value.length) return
  saving.value = true
  saveError.value = ''
  try {
    const id = await saveSequence(flowName.value)
    flowName.value = ''
    router.push(`/flow/${id}`)
  } catch {
    saveError.value = 'Could not save flow. Please try again.'
  } finally {
    saving.value = false
  }
}

function run(id) {
  router.push(`/flow/${id}`)
}

function formatDuration(secs) {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
</script>

<template>
  <div class="flow-page">
    <main class="flow-main">

      <!-- Builder Card -->
      <section class="builder-card">
        <h2 class="section-title">
          <span class="section-icon">🌊</span>
          Build a Flow
        </h2>

        <div class="add-form">
          <div class="field">
            <label class="field-label">Exercise</label>
            <select
              v-model="selectedId"
              class="field-select"
              @change="onExerciseChange"
            >
              <option value="" disabled>Choose an exercise…</option>
              <optgroup
                v-for="cat in categories"
                :key="cat"
                :label="cat"
              >
                <option
                  v-for="ex in byCategory[cat]"
                  :key="ex.id"
                  :value="ex.id"
                >
                  {{ ex.name }}
                </option>
              </optgroup>
            </select>
          </div>

          <div v-if="selectedExercise" class="exercise-preview">
            {{ selectedExercise.muscleGroup?.join(' · ') }}
            <span class="difficulty-chip" :class="selectedExercise.difficulty">
              {{ selectedExercise.difficulty }}
            </span>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label">Duration (sec)</label>
              <div class="stepper">
                <button class="stepper-btn" @click="duration = Math.max(10, duration - 5)">−</button>
                <span class="stepper-val">{{ duration }}</span>
                <button class="stepper-btn" @click="duration = Math.min(300, duration + 5)">+</button>
              </div>
            </div>
            <div class="field">
              <label class="field-label">Repeats</label>
              <div class="stepper">
                <button class="stepper-btn" @click="repeats = Math.max(1, repeats - 1)">−</button>
                <span class="stepper-val">{{ repeats }}</span>
                <button class="stepper-btn" @click="repeats = Math.min(10, repeats + 1)">+</button>
              </div>
            </div>
          </div>

          <button class="btn-add" :disabled="!selectedId" @click="add">
            + Add to Flow
          </button>
        </div>

        <!-- Exercise list -->
        <div v-if="builderExercises.length" class="exercise-list">
          <div class="list-header">
            <span class="list-title">Current Flow</span>
            <span class="list-total">{{ formatDuration(builderTotal) }} total</span>
          </div>

          <TransitionGroup name="list-item" tag="div">
            <div
              v-for="(ex, i) in builderExercises"
              :key="`${ex.id}-${i}`"
              class="list-item"
            >
              <div class="list-item-info">
                <span class="list-item-name">{{ ex.name }}</span>
                <span class="list-item-meta">
                  {{ ex.duration }}s
                  <template v-if="ex.repeats > 1">× {{ ex.repeats }}</template>
                </span>
              </div>
              <button class="btn-remove" @click="removeFromBuilder(i)" aria-label="Remove">✕</button>
            </div>
          </TransitionGroup>

          <div class="builder-actions">
            <button class="btn-start" @click="quickStart">▶ Start Now</button>
            <div class="save-row">
              <input
                v-model="flowName"
                type="text"
                placeholder="Name this flow…"
                class="name-input"
              />
              <button
                class="btn-save"
                :disabled="!flowName.trim() || saving"
                @click="save"
              >
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
            </div>
            <p v-if="saveError" class="save-error">{{ saveError }}</p>
          </div>
        </div>

        <div v-else class="empty-hint">
          <p>Select exercises above to build your sequence</p>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
.flow-page {
  min-height: 100vh;
  background: var(--bg);
  padding: 2rem 1rem;
}

.flow-main {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
.builder-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 1.75rem 1.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.section-icon {
  font-size: 1.15rem;
}

/* Add form */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-select {
  width: 100%;
  padding: 0.6rem 2.4rem 0.6rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background-color: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23668075' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  cursor: pointer;
}

.field-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
}

/* Exercise preview */
.exercise-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  background: var(--bg-soft);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.difficulty-chip {
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: capitalize;
}

.difficulty-chip.beginner {
  background: rgba(31, 143, 106, 0.12);
  color: var(--accent-strong);
}

.difficulty-chip.intermediate {
  background: rgba(234, 179, 8, 0.12);
  color: #a16207;
}

.difficulty-chip.advanced {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg);
}

.stepper-btn {
  padding: 0.5rem 0.875rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.05rem;
  color: var(--text-muted);
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}

.stepper-btn:hover {
  background: var(--bg-soft);
  color: var(--accent);
}

.stepper-val {
  flex: 1;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  min-width: 2.5rem;
}

/* Add button */
.btn-add {
  padding: 0.7rem 1rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-family: inherit;
}

.btn-add:hover:not(:disabled) {
  background: var(--accent-strong);
}

.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Exercise list */
.exercise-list {
  margin-top: 1.25rem;
  border-top: 1px solid var(--border);
  padding-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.list-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.list-total {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 600;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  background: var(--bg-soft);
  border-radius: 10px;
  gap: 0.5rem;
}

.list-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.list-item-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-item-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
  line-height: 1;
}

.btn-remove:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

/* Builder actions */
.builder-actions {
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-start {
  width: 100%;
  padding: 0.875rem 1rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
  letter-spacing: 0.01em;
}

.btn-start:hover {
  background: var(--accent-strong);
}

.save-row {
  display: flex;
  gap: 0.5rem;
}

.name-input {
  flex: 1;
  padding: 0.6rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
}

.name-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.name-input::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.btn-save {
  padding: 0.6rem 1rem;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.btn-save:hover:not(:disabled) {
  background: var(--bg-muted);
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Empty hint */
.empty-hint {
  margin-top: 1rem;
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  border: 1px dashed var(--border);
  border-radius: 12px;
}

/* List animation */
.list-item-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.list-item-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.list-item-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  position: absolute;
  width: 100%;
}

.list-item-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.save-error {
  font-size: 0.82rem;
  color: #dc2626;
  text-align: center;
}
</style>
