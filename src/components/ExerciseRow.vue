<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  exercise: { type: Object, required: true },
})

const showCues = ref(false)
const showTransition = ref(false)

const modalityClass = computed(() => `modality-${props.exercise.modality}`)
</script>

<template>
  <div class="exercise-row">
    <div class="row-main">
      <div class="row-title">
        <span class="ex-name">{{ exercise.name }}</span>
        <span class="tag" :class="modalityClass">{{ exercise.modality }}</span>
      </div>
      <div class="row-meta">
        <span class="dose">{{ exercise.sets }} × {{ exercise.reps_or_duration }}</span>
        <span v-if="exercise.allocated_seconds" class="badge muted">~{{ exercise.allocated_seconds }}s / set</span>
        <span v-if="exercise.rpe" class="badge">RPE {{ exercise.rpe }}</span>
        <span v-if="exercise.rest_seconds" class="badge muted">Rest {{ exercise.rest_seconds }}s</span>
      </div>
    </div>

    <div v-if="exercise.notes || exercise.transition_notes" class="toggles">
      <button
        v-if="exercise.notes"
        class="toggle"
        :class="{ open: showCues }"
        :aria-expanded="showCues"
        @click="showCues = !showCues"
      >
        Form cues
      </button>
      <button
        v-if="exercise.transition_notes"
        class="toggle"
        :class="{ open: showTransition }"
        :aria-expanded="showTransition"
        @click="showTransition = !showTransition"
      >
        Transition
      </button>
    </div>

    <p v-if="showCues && exercise.notes" class="note">{{ exercise.notes }}</p>
    <p v-if="showTransition && exercise.transition_notes" class="note transition">
      {{ exercise.transition_notes }}
    </p>
  </div>
</template>

<style scoped>
.exercise-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ex-name {
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--text);
}

.tag {
  padding: 0.1rem 0.5rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
  background: var(--bg-muted);
  color: var(--text-muted);
}

.modality-weights { background: #fde8d4; color: #9a4a0e; }
.modality-calisthenics { background: #dbeafe; color: #1e4f9a; }
.modality-mobility { background: #d7f3e6; color: var(--accent-strong); }
.modality-yoga { background: #ece1f9; color: #6b3fa0; }

.row-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.dose {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.badge {
  padding: 0.1rem 0.5rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--accent-glow);
  color: var(--accent-strong);
}

.badge.muted {
  background: var(--bg-muted);
  color: var(--text-muted);
}

.toggles {
  display: flex;
  gap: 0.4rem;
}

.toggle {
  padding: 0.2rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.toggle:hover,
.toggle.open {
  background: var(--bg-soft);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.note {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
}

.note.transition {
  border-left: 3px solid var(--timer-rest);
}
</style>
