<script>
import { ref } from 'vue'

// Only one row stays pinned open at a time.
const pinnedId = ref(null)
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, useId, watch } from 'vue'

const HOVER_DELAY_MS = 120
const HOVER_CLOSE_DELAY_MS = 80
const POPOVER_WIDTH = 340
const GAP = 8
const MARGIN = 8

const props = defineProps({
  exercise: { type: Object, required: true },
})

const popId = useId()
const rootEl = ref(null)
const popEl = ref(null)
const hovering = ref(false)
const pos = reactive({ top: 0, left: 0, width: POPOVER_WIDTH, placement: 'below' })
let hoverTimer = null

const modalityClass = computed(() => `modality-${props.exercise.modality}`)
const pinned = computed(() => pinnedId.value === popId)
const open = computed(() => hovering.value || pinned.value)
const pattern = computed(() => (props.exercise.target_pattern ?? '').replace(/_/g, ' '))

function onEnter(e) {
  if (e.pointerType !== 'mouse') return
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    if (pinnedId.value !== popId) pinnedId.value = null
    hovering.value = true
  }, HOVER_DELAY_MS)
}

function onLeave(e) {
  if (e.pointerType !== 'mouse') return
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => (hovering.value = false), HOVER_CLOSE_DELAY_MS)
}

// Click pins the preview on every device; this is also the touch and keyboard path.
function togglePinned() {
  pinnedId.value = pinned.value ? null : popId
}

function close() {
  clearTimeout(hoverTimer)
  hovering.value = false
  if (pinned.value) pinnedId.value = null
}

function place() {
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const height = popEl.value?.offsetHeight ?? 220
  const width = Math.min(POPOVER_WIDTH, vw - MARGIN * 2)
  const spaceBelow = vh - rect.bottom
  const below = spaceBelow >= height + GAP + MARGIN || spaceBelow >= rect.top

  const top = below ? rect.bottom + GAP : rect.top - GAP - height
  pos.placement = below ? 'below' : 'above'
  pos.top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - height - MARGIN))
  pos.left = Math.min(Math.max(rect.left, MARGIN), Math.max(MARGIN, vw - width - MARGIN))
  pos.width = width
}

function onDocPointerDown(e) {
  if (pinned.value && !rootEl.value?.contains(e.target)) pinnedId.value = null
}

function listen(active) {
  const method = active ? 'addEventListener' : 'removeEventListener'
  window[method]('scroll', place, true)
  window[method]('resize', place)
  document[method]('pointerdown', onDocPointerDown)
}

watch(open, async (isOpen) => {
  listen(isOpen)
  if (isOpen) {
    await nextTick()
    place()
  }
})

onBeforeUnmount(() => {
  clearTimeout(hoverTimer)
  listen(false)
  if (pinned.value) pinnedId.value = null
})
</script>

<template>
  <div
    ref="rootEl"
    class="exercise-row"
    :class="{ active: open }"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
    @click="togglePinned"
    @keydown.esc="close"
  >
    <div class="row-main">
      <div class="row-title">
        <span class="ex-name">{{ exercise.name }}</span>
        <span class="tag" :class="modalityClass">{{ exercise.modality }}</span>
        <span v-if="exercise.rpe" class="badge">RPE {{ exercise.rpe }}</span>
      </div>
      <span class="dose">{{ exercise.sets }} × {{ exercise.reps_or_duration }}</span>
    </div>

    <button
      type="button"
      class="info-btn"
      :aria-expanded="open"
      :aria-controls="popId"
      :aria-label="`Movement details: ${exercise.name}`"
    >
      ℹ
    </button>

    <Teleport to="body">
      <Transition name="preview">
        <div
          v-if="open"
          :id="popId"
          ref="popEl"
          class="preview"
          :class="pos.placement"
          role="region"
          :aria-label="`${exercise.name} details`"
          :style="{ top: pos.top + 'px', left: pos.left + 'px', width: pos.width + 'px' }"
        >
          <div class="preview-head">
            <span class="preview-name">{{ exercise.name }}</span>
            <span class="tag" :class="modalityClass">{{ exercise.modality }}</span>
            <span v-if="exercise.rpe" class="badge">RPE {{ exercise.rpe }}</span>
          </div>

          <div class="preview-meta">
            <span class="dose">{{ exercise.sets }} × {{ exercise.reps_or_duration }}</span>
            <span v-if="exercise.allocated_seconds" class="badge muted">~{{ exercise.allocated_seconds }}s / set</span>
            <span v-if="exercise.rest_seconds" class="badge muted">Rest {{ exercise.rest_seconds }}s</span>
          </div>

          <dl class="preview-sections">
            <div v-if="pattern" class="section">
              <dt>Movement pattern</dt>
              <dd class="pattern">{{ pattern }}</dd>
            </div>
            <div v-if="exercise.notes" class="section">
              <dt>Form cues</dt>
              <dd>{{ exercise.notes }}</dd>
            </div>
            <div v-if="exercise.transition_notes" class="section transition">
              <dt>Transition</dt>
              <dd>{{ exercise.transition_notes }}</dd>
            </div>
          </dl>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.exercise-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.exercise-row:hover,
.exercise-row.active {
  border-color: var(--accent);
  background: var(--bg-soft);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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

.dose {
  font-size: 0.88rem;
  font-weight: 600;
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

.info-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}

.exercise-row:hover .info-btn,
.exercise-row.active .info-btn,
.info-btn:focus-visible {
  opacity: 1;
  color: var(--accent-strong);
  border-color: var(--accent);
}

.preview {
  position: fixed;
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  background: #fff;
  border: 1px solid var(--accent);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(23, 53, 43, 0.16);
  /* Hover opens it, so it must never take the pointer away from the row. */
  pointer-events: none;
}

.preview-head,
.preview-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.preview-name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
}

.preview-sections {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section {
  padding: 0.55rem 0.7rem;
  background: var(--bg-soft);
  border-radius: 10px;
}

.section.transition {
  border-left: 3px solid var(--timer-rest);
}

.section dt {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.15rem;
}

.section dd {
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--text);
}

.section dd.pattern {
  text-transform: capitalize;
  font-weight: 600;
}

.preview-enter-active,
.preview-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
}

.preview.below.preview-enter-from,
.preview.below.preview-leave-to {
  transform: translateY(-4px);
}

.preview.above.preview-enter-from,
.preview.above.preview-leave-to {
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .preview-enter-active,
  .preview-leave-active {
    transition: opacity 0.01s;
  }

  .preview.below.preview-enter-from,
  .preview.below.preview-leave-to,
  .preview.above.preview-enter-from,
  .preview.above.preview-leave-to {
    transform: none;
  }
}
</style>
