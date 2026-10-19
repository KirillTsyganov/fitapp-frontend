const FALLBACK_META = { accent: 'var(--accent)' }

export const BLOCK_META = [
  { name: 'Prep / Dynamic Flow', accent: '#c06c47' },
  { name: 'Primary Skill / Strength', accent: '#2d4f3f' },
  { name: 'Accessory / Hypertrophy', accent: '#5f7f8a' },
  { name: 'Down-Regulation / Cool Down', accent: '#8c7a56' },
]

// Used only when the schema's rest_seconds is null or 0.
const FALLBACK_REST_SECONDS = {
  yoga: 5,
  mobility: 5,
  calisthenics: 25,
  weights: 25,
}
const DEFAULT_REST_SECONDS = 15
const LEGACY_SECONDS_PER_REP = 3
const LEGACY_DEFAULT_WORK_SECONDS = 30

// Setup time added at every change of exercise; backend rules.TRANSITION_BUFFER_SECONDS must match.
export const TRANSITION_BUFFER_SECONDS = 5

export function orderBlocks(blocks) {
  return (blocks ?? [])
    .map((block) => {
      const idx = BLOCK_META.findIndex((b) => b.name === block.block_name)
      return { ...block, meta: BLOCK_META[idx] ?? FALLBACK_META, order: idx === -1 ? 99 : idx }
    })
    .sort((a, b) => a.order - b.order)
}

// Seconds for "45s hold" / "90 sec" / "1 min"; null for rep-based or unparseable text.
export function parseSeconds(text = '') {
  if (/\breps?\b/i.test(text)) return null
  const m = text.match(/(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|m|s(?:ec(?:ond)?s?)?)\b/i)
  if (!m) return null
  const n = parseFloat(m[1])
  return Math.round(/^m/i.test(m[2]) ? n * 60 : n)
}

export function isUnilateral(text = '') {
  return /\b(per|each)\s+(side|leg|arm)\b|\/\s*(side|leg|arm)\b|\bboth sides\b/i.test(text)
}

export function restSecondsFor(exercise) {
  return exercise.rest_seconds || FALLBACK_REST_SECONDS[exercise.modality] || DEFAULT_REST_SECONDS
}

// Flows saved before allocated_seconds existed fall back to an estimate from reps_or_duration.
export function workSecondsFor(exercise) {
  if (exercise.allocated_seconds > 0) return exercise.allocated_seconds
  const text = exercise.reps_or_duration ?? ''
  const sides = isUnilateral(text) ? 2 : 1
  const timed = parseSeconds(text)
  if (timed) return timed * sides
  const reps = text.match(/(\d+)\s*reps?\b/i)
  if (reps) return Number(reps[1]) * LEGACY_SECONDS_PER_REP * sides
  return LEGACY_DEFAULT_WORK_SECONDS
}

// One entry per set, in play order: linear blocks finish an exercise first, circuits cycle rounds.
function sequence(blocks) {
  const out = []
  orderBlocks(blocks).forEach((block, bi) => {
    const items = block.exercises.map((exercise, ei) => ({ exercise, key: `${bi}-${ei}`, block }))
    const setsOf = (item) => Math.max(1, item.exercise.sets || 1)

    if (block.structure === 'circuit' && items.length > 1) {
      const rounds = Math.max(...items.map(setsOf))
      for (let round = 1; round <= rounds; round++) {
        items.forEach((item, si) => {
          if (round <= setsOf(item)) {
            out.push({ ...item, set: round, totalSets: rounds, circuit: true, station: si + 1, stations: items.length })
          }
        })
      }
    } else {
      items.forEach((item) => {
        for (let set = 1; set <= setsOf(item); set++) {
          out.push({ ...item, set, totalSets: setsOf(item), circuit: false })
        }
      })
    }
  })
  return out
}

// Mirrors backend rules.total_seconds: work + rest after every set but the last + buffer per exercise change.
export function buildTimeline(blocks) {
  const seq = sequence(blocks)
  const steps = []
  let cursor = 0

  const push = (step) => {
    steps.push({ ...step, startAt: cursor })
    cursor += step.seconds
  }

  seq.forEach((item, i) => {
    const ex = item.exercise
    push({
      kind: 'work',
      exercise: ex,
      blockName: item.block.block_name,
      meta: item.block.meta,
      circuit: item.circuit,
      set: item.set,
      totalSets: item.totalSets,
      station: item.station ?? null,
      stations: item.stations ?? null,
      seconds: workSecondsFor(ex),
      unilateral: isUnilateral(ex.reps_or_duration),
    })

    const next = seq[i + 1]
    if (!next) return
    const changes = next.key !== item.key
    push({
      kind: 'rest',
      seconds: restSecondsFor(ex) + (changes ? TRANSITION_BUFFER_SECONDS : 0),
      upNext: next.exercise.name,
      transitionNotes: changes ? ex.transition_notes : null,
    })
  })

  return { steps, totalSeconds: cursor }
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
