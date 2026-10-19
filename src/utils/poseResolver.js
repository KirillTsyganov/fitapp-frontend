const FALLBACK_SLUG = 'neutral_standing'
const MAX_ALIAS_DEPTH = 8

export function normalizeToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const hasWord = (text, word) => new RegExp(`(^|_)${word}(_|$)`).test(text)

// `text` must already be normalized.
export function matchesRule(text, rule) {
  const found = rule.keywords.some((kw) => {
    const word = normalizeToken(kw)
    return rule.requireWordBoundary ? hasWord(text, word) : text.includes(word)
  })
  return found && !(rule.excludeIfAny ?? []).some((word) => hasWord(text, normalizeToken(word)))
}

// Follows `alias_of` links; a missing target or a cycle yields undefined.
export function dereference(library, key) {
  const get = (k) => (Object.hasOwn(library, k) ? library[k] : undefined)
  let entry = get(key)
  for (let depth = 0; entry?.alias_of; depth++) {
    if (depth >= MAX_ALIAS_DEPTH) return undefined
    entry = get(entry.alias_of)
  }
  return entry
}

export function createPoseResolver(library, rules) {
  const lookup = (value) => dereference(library, normalizeToken(value))
  const byRules = (...values) => {
    const text = values.map(normalizeToken).filter(Boolean).join('_')
    for (const rule of rules) {
      if (matchesRule(text, rule)) {
        const pose = dereference(library, rule.slug)
        if (pose) return pose
      }
    }
    return null
  }

  // The exercise name is the most specific evidence, so its keywords outrank a generic exact pattern
  // (a "Hip Hinge" pattern must not hide a "Bridge" in the name).
  return function getPoseData(slug, targetPattern, exerciseName) {
    return (
      lookup(slug) ??
      lookup(exerciseName) ??
      byRules(exerciseName) ??
      lookup(targetPattern) ??
      byRules(slug, targetPattern, exerciseName) ??
      dereference(library, FALLBACK_SLUG)
    )
  }
}
