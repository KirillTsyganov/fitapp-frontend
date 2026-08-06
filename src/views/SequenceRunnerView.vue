<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSequences } from '@/composables/useSequences.js'

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS  // ~565.49
const TRANSITION_SECS = 5

const router = useRouter()
const route = useRoute()
const { findOrFetchSequence, removeTemporary } = useSequences()

const sequence = ref(null)
const loaded = ref(false)

// Timer state
const currentIndex = ref(0)
const currentRepeat = ref(1)
const timeLeft = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const isTransition = ref(false)
const isComplete = ref(false)
let intervalId = null

onMounted(async () => {
  sequence.value = await findOrFetchSequence(route.params.id)
  loaded.value = true
})

onUnmounted(() => {
  clearTick()
  if (sequence.value?.isTemporary) {
    removeTemporary(sequence.value.id)
  }
})

const currentExercise = computed(() =>
  sequence.value?.exercises[currentIndex.value] ?? null
)

// Arc fills from empty to full as time elapses (satisfying completion feel)
const arcProgress = computed(() => {
  if (!isRunning.value) return 0
  const total = isTransition.value ? TRANSITION_SECS : (currentExercise.value?.duration ?? 1)
  return (total - timeLeft.value) / total
})

const dashOffset = computed(() =>
  CIRCUMFERENCE * (1 - arcProgress.value)
)

const formattedTime = computed(() => {
  const t = timeLeft.value
  if (isTransition.value) return String(t)
  const m = Math.floor(t / 60)
  const s = t % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}`
})

// Breathing cue: 4s inhale, 4s exhale cycle during active exercise
const breathKey = computed(() => {
  if (!currentExercise.value || isTransition.value) return 0
  const elapsed = currentExercise.value.duration - timeLeft.value
  return Math.floor(elapsed / 4)
})

const breathPhase = computed(() => {
  if (!isRunning.value || isPaused.value || isTransition.value || isComplete.value) return null
  return breathKey.value % 2 === 0 ? 'in' : 'out'
})

function start() {
  if (!sequence.value?.exercises.length) return
  isRunning.value = true
  currentIndex.value = 0
  currentRepeat.value = 1
  startExercise()
}

function startExercise() {
  isTransition.value = false
  timeLeft.value = currentExercise.value.duration
  tick()
}

function startTransition() {
  isTransition.value = true
  timeLeft.value = TRANSITION_SECS
  tick()
}

function tick() {
  clearTick()
  intervalId = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearTick()
      handleComplete()
    }
  }, 1000)
}

function handleComplete() {
  if (!sequence.value || !currentExercise.value) return

  if (isTransition.value) {
    startExercise()
    return
  }

  if (currentRepeat.value < currentExercise.value.repeats) {
    currentRepeat.value++
    startTransition()
  } else if (currentIndex.value < sequence.value.exercises.length - 1) {
    currentIndex.value++
    currentRepeat.value = 1
    startTransition()
  } else {
    isComplete.value = true
    isRunning.value = false
  }
}

function pause() {
  isPaused.value = true
  clearTick()
}

function resume() {
  isPaused.value = false
  tick()
}

function clearTick() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function exit() {
  clearTick()
  router.back()
}
</script>

<template>
  <div class="runner-page">

    <!-- Not found -->
    <div v-if="loaded && !sequence" class="runner-state">
      <p class="state-msg">Flow not found.</p>
      <button class="btn-ghost" @click="router.push('/flow')">← Back to Flows</button>
    </div>

    <!-- Complete -->
    <div v-else-if="isComplete" class="runner-state">
      <div class="complete-ring">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="complete-svg">
          <circle
            cx="100" cy="100" :r="RADIUS"
            fill="none"
            stroke="var(--bg-muted)"
            stroke-width="10"
          />
          <circle
            cx="100" cy="100" :r="RADIUS"
            fill="none"
            stroke="var(--success)"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            stroke-dashoffset="0"
          />
        </svg>
        <div class="complete-center">✨</div>
      </div>
      <h2 class="complete-title">Flow complete</h2>
      <p class="complete-name">{{ sequence.name }}</p>
      <button class="btn-primary" @click="router.push('/flow')">Done</button>
    </div>

    <!-- Runner -->
    <div v-else-if="sequence" class="runner-content">

      <!-- Header -->
      <div class="runner-header">
        <button class="btn-exit" @click="exit" aria-label="Exit flow">✕</button>
        <div class="runner-title">
          <span class="runner-exercise-name">
            {{ isTransition ? 'Rest' : (currentExercise?.name ?? sequence.name) }}
          </span>
          <span v-if="isRunning" class="runner-progress">
            <template v-if="isTransition">
              up next: {{ currentExercise?.name }}
            </template>
            <template v-else>
              {{ currentIndex + 1 }} of {{ sequence.exercises.length }}
              <template v-if="currentExercise && currentExercise.repeats > 1">
                · rep {{ currentRepeat }}/{{ currentExercise.repeats }}
              </template>
            </template>
          </span>
          <span v-else-if="!isComplete" class="runner-progress">
            {{ sequence.exercises.length }} exercise{{ sequence.exercises.length !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- Circular timer -->
      <div class="ring-wrap">
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          class="ring-svg"
        >
          <!-- Background track -->
          <circle
            cx="100" cy="100" :r="RADIUS"
            fill="none"
            stroke="var(--bg-muted)"
            stroke-width="10"
          />
          <!-- Progress arc -->
          <circle
            cx="100" cy="100" :r="RADIUS"
            fill="none"
            :stroke="isTransition ? 'var(--timer-rest)' : 'var(--accent)'"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset"
            class="ring-arc"
            :class="{ 'ring-arc-active': isRunning && !isPaused }"
          />
        </svg>

        <div class="ring-center">
          <div class="ring-time" :class="{ 'ring-time-rest': isTransition }">
            {{ isRunning ? formattedTime : '—' }}
          </div>
          <div v-if="!isRunning" class="ring-hint">tap to begin</div>
          <div v-else-if="isPaused" class="ring-sub">paused</div>
          <div v-else-if="isTransition" class="ring-sub ring-sub-rest">rest</div>
        </div>
      </div>

      <!-- Breathing cue -->
      <div class="breath-area">
        <Transition name="breath" mode="out-in">
          <span v-if="breathPhase" :key="breathKey" class="breath-label">
            {{ breathPhase === 'in' ? '↑ breathe in' : '↓ breathe out' }}
          </span>
        </Transition>
      </div>

      <!-- Exercise instructions during active exercise -->
      <Transition name="fade">
        <div
          v-if="isRunning && !isTransition && currentExercise?.instructions"
          class="instructions"
        >
          <ol class="instruction-list">
            <li
              v-for="(step, i) in currentExercise.instructions"
              :key="i"
              class="instruction-step"
            >
              {{ step }}
            </li>
          </ol>
        </div>
      </Transition>

      <!-- Controls -->
      <div class="controls">
        <button
          v-if="!isRunning"
          class="btn-primary"
          @click="start"
        >
          Begin Flow
        </button>
        <template v-else>
          <button
            v-if="isPaused"
            class="btn-primary"
            @click="resume"
          >
            Resume
          </button>
          <button
            v-else
            class="btn-secondary"
            @click="pause"
          >
            Pause
          </button>
          <button class="btn-ghost" @click="exit">End</button>
        </template>
      </div>

    </div>
  </div>
</template>

<style scoped>
.runner-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  background: var(--bg);
}

/* States */
.runner-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.state-msg {
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* Complete */
.complete-ring {
  position: relative;
  width: 200px;
  height: 200px;
}

.complete-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.complete-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.complete-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
  margin-top: 0.5rem;
}

.complete-name {
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* Main content */
.runner-content {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

/* Header */
.runner-header {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.btn-exit {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1;
  transition: background 0.15s;
  flex-shrink: 0;
  margin-top: 2px;
}

.btn-exit:hover {
  background: var(--bg-muted);
}

.runner-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.runner-exercise-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.runner-progress {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Ring */
.ring-wrap {
  position: relative;
  width: 240px;
  height: 240px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-arc {
  transition: stroke-dashoffset 0.9s linear, stroke 0.4s ease;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.ring-time {
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.ring-time-rest {
  font-size: 3rem;
  color: var(--timer-rest);
}

.ring-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: 0.25rem;
}

.ring-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ring-sub-rest {
  color: var(--timer-rest);
}

/* Breathing cue */
.breath-area {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breath-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  letter-spacing: 0.03em;
}

.breath-enter-active,
.breath-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.breath-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.breath-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Instructions */
.instructions {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.875rem 1rem;
}

.instruction-list {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.instruction-step {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Fade transition for instructions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Controls */
.controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn-primary {
  padding: 0.8rem 2.25rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.btn-primary:hover {
  background: var(--accent-strong);
}

.btn-secondary {
  padding: 0.8rem 1.75rem;
  background: var(--bg-soft);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.btn-secondary:hover {
  background: var(--bg-muted);
}

.btn-ghost {
  padding: 0.8rem 1.25rem;
  background: none;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}

.btn-ghost:hover {
  background: var(--bg-soft);
  color: var(--text);
}
</style>
