<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useCoach } from '@/composables/useCoach.js'
import FlowCardPreview from '@/components/FlowCardPreview.vue'

const DURATION_CHIPS = [15, 20, 30, 45]
const STRUCTURE_CHIPS = [
  { value: 'circuit', label: 'Circuit flow' },
  { value: 'linear', label: 'Linear blocks' },
]
const STARTERS = [
  'My hamstrings feel tight today',
  'I want a shoulder mobility flow',
  'Give me a quick core session',
]
const GENERATION_STEPS = [
  'Analyzing joint readiness...',
  'Sequencing kinetic chain movements...',
  'Balancing volume and recovery...',
  'Writing form cues...',
  'Finalizing your flow...',
]

const { chatMessages, isLoading, isGeneratingFlow, errorMessage, sendMessage, generateAndSaveFlow, resetChat } =
  useCoach()

const input = ref('')
const feedEnd = ref(null)
const selectedMinutes = ref(null)
const selectedStructure = ref(null)
const generatingId = ref(null)
const stepIndex = ref(0)
let stepTimer = null

const lastMessage = computed(() => chatMessages.value[chatMessages.value.length - 1] ?? null)

const showChips = computed(() => {
  const msg = lastMessage.value
  if (!msg || msg.role !== 'coach' || isLoading.value || isGeneratingFlow.value) return false
  const text = `${msg.diagnostic_question ?? ''} ${msg.content}`
  return !!msg.diagnostic_needed || /how much time|how many minutes|minutes do you have/i.test(text)
})

const busy = computed(() => isLoading.value || isGeneratingFlow.value)

watch(isGeneratingFlow, (active) => {
  clearInterval(stepTimer)
  stepIndex.value = 0
  if (active) {
    stepTimer = setInterval(() => {
      stepIndex.value = Math.min(stepIndex.value + 1, GENERATION_STEPS.length - 1)
    }, 3500)
  }
})

onBeforeUnmount(() => clearInterval(stepTimer))

watch(
  [() => chatMessages.value.length, isLoading, isGeneratingFlow],
  async () => {
    await nextTick()
    feedEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  },
  { flush: 'post' },
)

async function send(text, durationMinutes = null) {
  const message = text.trim()
  if (!message || busy.value) return
  input.value = ''
  try {
    await sendMessage(message, { durationMinutes, structurePreference: selectedStructure.value })
  } catch {
    // errorMessage is already set by the composable
  }
}

function toggleStructure(value) {
  selectedStructure.value = selectedStructure.value === value ? null : value
}

function pickDuration(minutes) {
  selectedMinutes.value = minutes
  send(`I have ${minutes} minutes.`, minutes)
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send(input.value, selectedMinutes.value)
  }
}

async function generate(msg) {
  const suggested = msg.suggested_flow
  const minutes = Math.min(45, Math.max(5, selectedMinutes.value ?? suggested.estimated_minutes))
  generatingId.value = msg.id
  try {
    msg.created_flow = await generateAndSaveFlow({
      target_focus: suggested.focus,
      target_duration_minutes: minutes,
      structure_preference: selectedStructure.value ?? undefined,
    })
  } catch {
    // errorMessage is already set by the composable
  } finally {
    generatingId.value = null
  }
}

function newChat() {
  resetChat()
  selectedMinutes.value = null
  selectedStructure.value = null
}
</script>

<template>
  <div class="coach-page">
    <header class="coach-header">
      <div>
        <h1 class="page-title">AI Coach</h1>
        <p class="page-sub">Tell me how you feel and what you want to train.</p>
      </div>
      <button v-if="chatMessages.length" class="btn-ghost" :disabled="busy" @click="newChat">New chat</button>
    </header>

    <div class="feed">
      <div v-if="!chatMessages.length" class="empty">
        <h2 class="empty-title">What are we working on today?</h2>
        <div class="starters">
          <button v-for="s in STARTERS" :key="s" class="chip" @click="send(s)">{{ s }}</button>
        </div>
      </div>

      <template v-for="msg in chatMessages" :key="msg.id">
        <div class="bubble" :class="msg.role">{{ msg.content }}</div>

        <div v-if="msg.role === 'coach' && msg.created_flow" class="inline-card">
          <FlowCardPreview :flow="msg.created_flow" variant="inline" />
        </div>

        <div v-else-if="msg.role === 'coach' && msg.suggested_flow" class="confirm-card">
          <template v-if="generatingId === msg.id">
            <div class="generating" role="status" aria-live="polite">
              <span class="spinner" />
              <div>
                <div class="gen-step">{{ GENERATION_STEPS[stepIndex] }}</div>
                <div class="gen-hint">This usually takes 12–18 seconds.</div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="confirm-text">
              Target: {{ msg.suggested_flow.focus }} • Target:
              {{ selectedMinutes ?? msg.suggested_flow.estimated_minutes }} min
              <template v-if="selectedStructure"> • {{ selectedStructure }}</template>
            </div>
            <button class="btn-primary" :disabled="busy" @click="generate(msg)">
              Generate &amp; Save This Flow
            </button>
          </template>
        </div>
      </template>

      <div v-if="isLoading" class="bubble coach typing" aria-label="Coach is typing">
        <span /><span /><span />
      </div>

      <div v-if="showChips" class="chip-groups">
        <div class="chips" role="group" aria-label="Workout style (optional)">
          <button
            v-for="s in STRUCTURE_CHIPS"
            :key="s.value"
            class="chip"
            :class="{ active: selectedStructure === s.value }"
            :aria-pressed="selectedStructure === s.value"
            @click="toggleStructure(s.value)"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="chips" role="group" aria-label="Available time">
          <button v-for="m in DURATION_CHIPS" :key="m" class="chip" @click="pickDuration(m)">{{ m }} min</button>
        </div>
      </div>

      <div v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</div>
      <div ref="feedEnd" />
    </div>

    <form class="composer" @submit.prevent="send(input, selectedMinutes)">
      <textarea
        v-model="input"
        rows="1"
        placeholder="Describe how you feel or what you want to train..."
        maxlength="2000"
        :disabled="isGeneratingFlow"
        @keydown="onKeydown"
      />
      <button type="submit" class="btn-send" :disabled="busy || !input.trim()">Send</button>
    </form>
  </div>
</template>

<style scoped>
.coach-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 680px;
  margin: 0 auto;
  padding: 1.5rem 1rem 1rem;
  gap: 1rem;
}

@media (max-width: 768px) {
  .coach-page {
    height: calc(100vh - 56px);
  }
}

.coach-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.page-sub {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.btn-ghost {
  padding: 0.4rem 0.9rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent-strong);
}

.feed {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem;
}

.empty {
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.starters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.bubble {
  max-width: 85%;
  padding: 0.7rem 1rem;
  border-radius: 18px;
  font-size: 0.93rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.bubble.user {
  align-self: flex-end;
  background: var(--accent);
  color: white;
  border-bottom-right-radius: 6px;
}

.bubble.coach {
  align-self: flex-start;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-bottom-left-radius: 6px;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 0.9rem 1rem;
}

.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: blink 1.2s infinite ease-in-out;
}

.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.45rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--accent);
  border-radius: 20px;
  color: var(--accent-strong);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.chip:hover,
.chip.active {
  background: var(--accent);
  color: white;
}

.chip-groups {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.confirm-card,
.inline-card {
  align-self: stretch;
}

.confirm-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.9rem 1.1rem;
  background: var(--bg-soft);
  border: 1px dashed var(--accent);
  border-radius: 16px;
}

.confirm-text {
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: capitalize;
}

.btn-primary {
  padding: 0.6rem 1.2rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-strong);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generating {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--bg-muted);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.gen-step {
  font-weight: 700;
  font-size: 0.92rem;
}

.gen-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.error {
  padding: 0.6rem 0.9rem;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 12px;
  color: #b91c1c;
  font-size: 0.85rem;
}

.composer {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.composer textarea {
  flex: 1;
  resize: none;
  padding: 0.7rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.93rem;
  color: var(--text);
  max-height: 120px;
}

.composer textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.btn-send {
  padding: 0.7rem 1.2rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 14px;
  font-family: inherit;
  font-weight: 700;
  cursor: pointer;
}

.btn-send:hover:not(:disabled) {
  background: var(--accent-strong);
}
</style>
