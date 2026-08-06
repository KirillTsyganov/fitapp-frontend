import { ref, computed } from 'vue'
import { authFetch } from '@/composables/useAuth.js'
import { exercisesList } from '@/utils/exerciseData.js'

// Module-level state shared across all component instances
const sequences = ref([])
const sequencesLoading = ref(false)
const builderExercises = ref([])

const builderTotal = computed(() =>
  builderExercises.value.reduce((sum, ex) => sum + ex.duration * ex.repeats, 0)
)

// Merge backend exercise fields with local library data (instructions, muscleGroup, etc.)
function _enrich(exercises) {
  return exercises.map(ex => {
    const base = exercisesList.find(e => e.id === ex.id) ?? {}
    return { ...base, ...ex }
  })
}

function _normalize(flow) {
  return {
    ...flow,
    totalDuration: flow.total_duration ?? flow.totalDuration ?? 0,
    exercises: _enrich(flow.exercises ?? []),
  }
}

async function loadSequences() {
  sequencesLoading.value = true
  try {
    const res = await authFetch('/api/flows')
    if (!res.ok) return
    const data = await res.json()
    const tempSeqs = sequences.value.filter(s => s.isTemporary)
    sequences.value = [...data.map(_normalize), ...tempSeqs]
  } catch {
    // silently fail — existing list retained
  } finally {
    sequencesLoading.value = false
  }
}

function addToBuilder(baseExercise, duration, repeats) {
  builderExercises.value.push({ ...baseExercise, duration, repeats })
}

function removeFromBuilder(index) {
  builderExercises.value.splice(index, 1)
}

function clearBuilder() {
  builderExercises.value = []
}

async function saveSequence(name) {
  const res = await authFetch('/api/flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      exercises: builderExercises.value.map((ex, i) => ({
        exercise_id: ex.id,
        exercise_name: ex.name,
        duration: ex.duration,
        repeats: ex.repeats,
        position: i,
      })),
    }),
  })
  if (!res.ok) throw new Error('Failed to save flow')
  const data = await res.json()
  const normalized = _normalize(data)
  const tempSeqs = sequences.value.filter(s => s.isTemporary)
  sequences.value = [normalized, ...sequences.value.filter(s => !s.isTemporary && s.id !== normalized.id), ...tempSeqs]
  clearBuilder()
  return String(data.id)
}

// Quick-start: in-memory only, never sent to the backend
function createTemporary() {
  const seq = {
    id: crypto.randomUUID(),
    name: 'Quick Flow',
    exercises: builderExercises.value.map(ex => ({ ...ex })),
    totalDuration: builderTotal.value,
    isTemporary: true,
  }
  sequences.value.push(seq)
  return seq.id
}

function removeTemporary(id) {
  sequences.value = sequences.value.filter(s => !(s.id === id && s.isTemporary))
}

async function deleteSequence(id) {
  // Optimistic remove
  sequences.value = sequences.value.filter(s => String(s.id) !== String(id))
  const res = await authFetch(`/api/flows/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    await loadSequences()
    throw new Error('Failed to delete flow')
  }
}

async function findOrFetchSequence(id) {
  const found = sequences.value.find(s => String(s.id) === String(id))
  if (found) return found
  // Not in memory — fetch directly (e.g. direct URL navigation)
  try {
    const res = await authFetch(`/api/flows/${id}`)
    if (!res.ok) return null
    const data = _normalize(await res.json())
    sequences.value.push(data)
    return data
  } catch {
    return null
  }
}

export function useSequences() {
  return {
    sequences,
    sequencesLoading,
    builderExercises,
    builderTotal,
    loadSequences,
    addToBuilder,
    removeFromBuilder,
    clearBuilder,
    saveSequence,
    createTemporary,
    removeTemporary,
    deleteSequence,
    findOrFetchSequence,
  }
}

