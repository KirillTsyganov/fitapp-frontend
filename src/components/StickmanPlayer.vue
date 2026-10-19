<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BACKGROUND_PREFIX, SKELETON_BONES } from '@/constants/skeleton.js'

const props = defineProps({
  poseData: { type: Object, default: null }, // { tempo_seconds?, frames: [{ joint: [x, y] }] }
  size: { type: [String, Number], default: 140 },
  playing: { type: Boolean, default: true },
})

const DEFAULT_TEMPO_SECONDS = 2
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const frames = computed(() => props.poseData?.frames ?? [])
const pose = ref({})
const animate = computed(() => props.playing && !reducedMotion && frames.value.length > 1)

// Paused time is not counted, so the figure resumes where it stopped.
let animatedMs = 0
let lastTs = 0
let rafId = null

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function render() {
  const list = frames.value
  if (!list.length) {
    pose.value = {}
    return
  }
  const periodMs = (props.poseData.tempo_seconds || DEFAULT_TEMPO_SECONDS) * 1000
  const pos = ((animatedMs / periodMs) % 1) * list.length
  const i = Math.floor(pos)
  const t = ease(pos - i)
  const from = list[i]
  const to = list[(i + 1) % list.length]
  const next = {}
  for (const joint of Object.keys(from)) {
    const [x0, y0] = from[joint]
    const [x1, y1] = to[joint] ?? from[joint]
    next[joint] = [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
  }
  pose.value = next
}

function tick(ts) {
  if (lastTs) animatedMs += ts - lastTs
  lastTs = ts
  render()
  rafId = requestAnimationFrame(tick)
}

function stop() {
  cancelAnimationFrame(rafId)
  rafId = null
  lastTs = 0
}

function sync() {
  stop()
  if (animate.value) rafId = requestAnimationFrame(tick)
  else render()
}

watch(
  () => props.poseData,
  () => {
    animatedMs = 0
    sync()
  },
)
watch(animate, sync)
onMounted(sync)
onBeforeUnmount(stop)

const bones = computed(() =>
  SKELETON_BONES.filter(({ from, to }) => pose.value[from] && pose.value[to])
    .map(({ from, to }) => ({
      key: `${from}-${to}`,
      x1: pose.value[from][0],
      y1: pose.value[from][1],
      x2: pose.value[to][0],
      y2: pose.value[to][1],
      back: from.startsWith(BACKGROUND_PREFIX) || to.startsWith(BACKGROUND_PREFIX),
    }))
    .sort((a, b) => b.back - a.back),
)

const joints = computed(() => Object.entries(pose.value).filter(([name]) => name !== 'head'))
const dimension = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
const groundY = computed(() => props.poseData?.ground_y ?? 96)
</script>

<template>
  <svg
    class="stickman"
    viewBox="0 0 100 100"
    role="img"
    aria-label="Movement animation"
    :style="{ width: dimension, height: dimension }"
  >
    <line x1="8" :y1="groundY" x2="92" :y2="groundY" class="ground" />

    <line
      v-for="bone in bones"
      :key="bone.key"
      :x1="bone.x1"
      :y1="bone.y1"
      :x2="bone.x2"
      :y2="bone.y2"
      class="bone"
      :class="{ back: bone.back }"
    />

    <circle v-if="pose.head" :cx="pose.head[0]" :cy="pose.head[1]" r="4.5" class="head" />

    <circle
      v-for="[name, [x, y]] in joints"
      :key="name"
      :cx="x"
      :cy="y"
      r="1.4"
      class="node"
      :class="{ back: name.startsWith(BACKGROUND_PREFIX) }"
    />
  </svg>
</template>

<style scoped>
.stickman {
  display: block;
  overflow: visible;
  max-width: 100%;
}
.ground {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 2 2;
}
.bone {
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
}
.bone.back {
  stroke: var(--text-secondary);
  opacity: 0.55;
  stroke-width: 2.5;
}
.head {
  fill: var(--accent);
}
.node {
  fill: var(--surface);
  opacity: 0.85;
}
.node.back {
  opacity: 0.4;
}
</style>
