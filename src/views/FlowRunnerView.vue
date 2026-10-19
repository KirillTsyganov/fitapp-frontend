<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useCoach } from '@/composables/useCoach.js'
import { buildTimeline, formatClock } from '@/utils/flowSteps.js'
import TimerRing from '@/components/TimerRing.vue'
import StickmanPlayer from '@/components/StickmanPlayer.vue'
import { getPoseData } from '@/utils/poseLookup.js'

const TICK_MS = 200
const COUNTDOWN_SECONDS = 3

const route = useRoute()
const router = useRouter()
const { activeFlow, getFlowById } = useCoach()

const loaded = ref(false)
const index = ref(0)
const timeLeft = ref(0)
const elapsed = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const isComplete = ref(false)
const muted = ref(false)

// One wall-clock timeline: step and time-left are derived from elapsed time, so throttled tabs catch up.
let timerId = null
let startedAt = 0
let pausedAt = 0
let audioCtx = null

const flowId = computed(() => route.params.id)
const timeline = computed(() => buildTimeline(activeFlow.value?.routine_data?.blocks))
const steps = computed(() => timeline.value.steps)
const totalSeconds = computed(() => timeline.value.totalSeconds)
const step = computed(() => steps.value[index.value] ?? null)
const isRest = computed(() => step.value?.kind === 'rest')
const nextWork = computed(() => steps.value.slice(index.value + 1).find((s) => s.kind === 'work') ?? null)
const poseData = computed(() => {
  const ex = step.value?.exercise
  return ex ? getPoseData(ex.animation_slug, ex.target_pattern, ex.name) : null
})
const overallPct = computed(() => (totalSeconds.value ? Math.min(100, (elapsed.value / totalSeconds.value) * 100) : 0))
const isCountingDown = computed(
  () => isRunning.value && !isPaused.value && timeLeft.value >= 1 && timeLeft.value <= COUNTDOWN_SECONDS,
)

const ringProgress = computed(() => {
  if (!isRunning.value || !step.value) return 0
  return Math.min(1, Math.max(0, (elapsed.value - step.value.startAt) / step.value.seconds))
})

const setLabel = computed(() => {
  const s = step.value
  if (!s || s.kind !== 'work') return ''
  return s.circuit
    ? `Round ${s.set} of ${s.totalSets} · Station ${s.station}/${s.stations}`
    : `Set ${s.set} of ${s.totalSets}`
})

watch(
  flowId,
  async (id) => {
    loaded.value = false
    stop()
    await getFlowById(id).catch(() => null)
    loaded.value = true
  },
  { immediate: true },
)

onUnmounted(() => {
  clearTimer()
  audioCtx?.close()
})

function unlockAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return
  audioCtx ??= new AudioCtx()
  audioCtx.resume?.()
}

function beep(frequency, ms = 110) {
  if (muted.value || !audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  const t = audioCtx.currentTime
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(t)
  osc.stop(t + ms / 1000 + 0.02)
}

function clearTimer() {
  clearInterval(timerId)
  timerId = null
}

function onTick() {
  const now = (Date.now() - startedAt) / 1000
  if (now >= totalSeconds.value) {
    finish()
    return
  }
  elapsed.value = now

  let i = index.value
  while (i < steps.value.length - 1 && now >= steps.value[i + 1].startAt) i++
  const changed = i !== index.value
  index.value = i

  const s = steps.value[i]
  const left = Math.ceil(s.startAt + s.seconds - now)
  if (changed && s.kind === 'work') beep(880, 180)
  else if (left !== timeLeft.value && left >= 1 && left <= COUNTDOWN_SECONDS) beep(660)
  timeLeft.value = left
}

function start() {
  if (!steps.value.length) return
  unlockAudio()
  index.value = 0
  elapsed.value = 0
  timeLeft.value = steps.value[0].seconds
  isComplete.value = false
  isPaused.value = false
  isRunning.value = true
  startedAt = Date.now()
  beep(880, 180)
  clearTimer()
  timerId = setInterval(onTick, TICK_MS)
}

function pause() {
  isPaused.value = true
  pausedAt = Date.now()
  clearTimer()
}

function resume() {
  isPaused.value = false
  startedAt += Date.now() - pausedAt
  timerId = setInterval(onTick, TICK_MS)
}

// Pulls the clock forward to the start of the next interval.
function skip() {
  if (!step.value) return
  startedAt -= (step.value.startAt + step.value.seconds - elapsed.value) * 1000
  onTick()
}

function finish() {
  clearTimer()
  elapsed.value = totalSeconds.value
  isRunning.value = false
  isComplete.value = true
  beep(880, 400)
}

function stop() {
  clearTimer()
  isRunning.value = false
  isPaused.value = false
  isComplete.value = false
  index.value = 0
  elapsed.value = 0
}

function exit() {
  clearTimer()
  router.push(`/flows/${flowId.value}`)
}
</script>

<template>
  <div class="runner-page">
    <div v-if="!loaded" class="runner-state">
      <p class="state-msg">Loading workout...</p>
    </div>

    <div v-else-if="!activeFlow || !steps.length" class="runner-state">
      <p class="state-msg">{{ activeFlow ? 'This flow has no exercises.' : 'Flow not found.' }}</p>
      <RouterLink to="/flows" class="btn-ghost">← Back to Library</RouterLink>
    </div>

    <div v-else-if="isComplete" class="runner-state">
      <svg class="complete-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="m7.5 12.5 3 3 6-6.5" />
      </svg>
      <h2 class="complete-title">Workout complete</h2>
      <p class="state-msg">{{ activeFlow.name }} · {{ formatClock(totalSeconds) }}</p>
      <div class="controls">
        <button class="btn-primary" @click="exit">Back to Flow</button>
        <button class="btn-ghost" @click="start">Run again</button>
      </div>
    </div>

    <div v-else class="runner-content">
      <div class="runner-header">
        <button class="btn-exit" aria-label="Exit workout" @click="exit">✕</button>
        <div class="runner-title">
          <span class="runner-name">
            <template v-if="!isRunning">{{ activeFlow.name }}</template>
            <template v-else-if="isRest">Rest</template>
            <template v-else>{{ step.exercise.name }}</template>
          </span>
          <span class="runner-progress">
            <template v-if="!isRunning">Hands-free · {{ formatClock(totalSeconds) }} total</template>
            <template v-else-if="isRest">Up next: {{ step.upNext }}</template>
            <template v-else>{{ setLabel }} · {{ step.exercise.reps_or_duration }}</template>
          </span>
        </div>
        <button class="btn-mute" :aria-pressed="muted" :title="muted ? 'Unmute cues' : 'Mute cues'" @click="muted = !muted">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            <path v-if="muted" d="M3 3l18 18" />
          </svg>
        </button>
      </div>

      <div class="overall">
        <div class="overall-clock">
          <span>{{ formatClock(elapsed) }}</span>
          <span class="overall-total">/ {{ formatClock(totalSeconds) }}</span>
        </div>
        <div
          class="overall-bar"
          role="progressbar"
          aria-label="Session progress"
          :aria-valuenow="Math.round(overallPct)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="overall-fill" :style="{ width: overallPct + '%' }" />
        </div>
      </div>

      <div v-if="isRunning && !isRest" class="chips">
        <span class="chip" :style="{ borderColor: step.meta.accent, color: step.meta.accent }">
          {{ step.blockName }}
        </span>
        <span v-if="step.circuit" class="chip muted">Circuit</span>
        <span v-if="step.exercise.rpe" class="chip muted">RPE {{ step.exercise.rpe }}</span>
      </div>

      <StickmanPlayer
        v-if="isRunning && !isRest && poseData"
        class="runner-anim"
        :pose-data="poseData"
        :playing="!isPaused"
        :size="140"
      />

      <TimerRing
        :progress="ringProgress"
        :color="isRest ? 'var(--timer-rest)' : 'var(--highlight)'"
        :active="isRunning && !isPaused"
      >
        <template v-if="!isRunning">
          <div class="ring-time">{{ formatClock(steps[0].seconds) }}</div>
          <div class="ring-sub">first interval</div>
        </template>
        <template v-else>
          <div :key="timeLeft" class="ring-time" :class="{ rest: isRest, pulse: isCountingDown }">
            {{ formatClock(timeLeft) }}
          </div>
          <div class="ring-sub" :class="{ rest: isRest }">{{ isPaused ? 'paused' : isRest ? 'rest' : 'work' }}</div>
        </template>
      </TimerRing>

      <p v-if="isRunning && !isRest && nextWork" class="next-line">Next: {{ nextWork.exercise.name }}</p>
      <p v-else-if="isRunning && !isRest" class="next-line">Last interval</p>

      <div v-if="isRunning && !isRest" class="cues">
        <p v-if="step.unilateral" class="cue strong">Work both sides within this interval.</p>
        <p v-if="step.exercise.notes" class="cue">{{ step.exercise.notes }}</p>
      </div>

      <div v-if="isRunning && isRest && step.transitionNotes" class="cues">
        <p class="cue transition">{{ step.transitionNotes }}</p>
      </div>

      <div class="controls">
        <button v-if="!isRunning" class="btn-primary" @click="start">Begin Workout</button>
        <template v-else>
          <button class="btn-primary" @click="isPaused ? resume() : pause()">
            {{ isPaused ? 'Resume' : 'Pause' }}
          </button>
          <button class="btn-secondary" :disabled="isPaused" @click="skip">Skip</button>
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

.complete-icon { color: var(--accent); }

.complete-title {
  font-size: 1.6rem;
  font-weight: 700;
}

.runner-content {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
}

.runner-header {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.btn-exit,
.btn-mute {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

.btn-exit:hover,
.btn-mute:hover { background: var(--bg-muted); }

.runner-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.runner-name {
  font-size: 1.2rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runner-progress {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.overall {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.overall-clock {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.overall-total {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
}

.overall-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-muted);
  border-radius: 6px;
  overflow: hidden;
}

.overall-fill {
  height: 100%;
  background: var(--accent);
}

.chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

.runner-anim {
  align-self: center;
}

.chip {
  padding: 0.15rem 0.65rem;
  border: 1px solid var(--accent);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.chip.muted {
  border-color: var(--border);
  color: var(--text-muted);
}

.ring-time {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.ring-time.rest {
  color: var(--timer-rest);
  font-size: 3rem;
}

/* Re-triggers every second because the element is keyed on timeLeft. */
.ring-time.pulse {
  color: var(--highlight);
  animation: pulse 0.9s ease-out;
}

@keyframes pulse {
  0% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

.ring-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ring-sub.rest { color: var(--timer-rest); }

.next-line {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.cues {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cue {
  font-size: 0.87rem;
  line-height: 1.5;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.7rem 1rem;
}

.cue.strong {
  color: var(--accent-strong);
  font-weight: 600;
}

.cue.transition {
  color: var(--text);
  border-left: 3px solid var(--timer-rest);
}

.controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary,
.btn-ghost {
  padding: 0.8rem 1.75rem;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  font-weight: 700;
}

.btn-primary:hover:not(:disabled) { background: var(--accent-strong); }

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-soft);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 0.8rem 1.25rem;
}

.btn-secondary:hover:not(:disabled) { background: var(--bg-muted); }

.btn-ghost {
  background: none;
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 0.8rem 1.25rem;
}

.btn-ghost:hover {
  background: var(--bg-soft);
  color: var(--text);
}
</style>
