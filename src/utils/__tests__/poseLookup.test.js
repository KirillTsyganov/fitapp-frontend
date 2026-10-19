import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { SKELETON_BONES } from '../../constants/skeleton.js'
import { POSE_RULES } from '../poseRules.js'
import { createPoseResolver, dereference, matchesRule, normalizeToken } from '../poseResolver.js'

const library = JSON.parse(
  readFileSync(new URL('../../assets/poses/poseLibrary.json', import.meta.url), 'utf8'),
)
const getPoseData = createPoseResolver(library, POSE_RULES)
const keyOf = (pose) => Object.keys(library).find((k) => library[k] === pose)

describe('getPoseData', () => {
  const cases = [
    ['Supported Puppy Pose with Slow Nasal Breathing', [undefined, 'Active Mobility', 'Supported Puppy Pose with Slow Nasal Breathing'], 'puppy_pose'],
    ['Long-Sit Hamstring Hover Lift-Offs', [undefined, 'Active Mobility', 'Long-Sit Hamstring Hover Lift-Offs with Nasal Breathing'], 'seated_long_sit'],
    ['Walkout Hamstring Bridge Eccentric', [undefined, 'Hip Hinge', 'Walkout Hamstring Bridge Eccentric'], 'glute_bridge'],
    ['Scapular CARs in Tall Plank', [undefined, 'Horizontal Push / Scapular Control', 'Scapular CARs in Tall Plank'], 'scapular_plank'],
    ['Single-Leg Romanian Deadlift', [undefined, 'Hip Hinge', 'Single-Leg Romanian Deadlift'], 'hip_hinge'],
    ['Single-Leg RDL', [undefined, 'x', 'Single-Leg RDL'], 'hip_hinge'],
    ['Standard Push-Up', [undefined, 'Horizontal Push', 'Standard Push-Up'], 'horizontal_push'],
    ['Overhead Press (vertical_push)', [undefined, 'vertical_push', 'Overhead Press'], 'neutral_standing'],
    ['Wall Sit', [undefined, 'x', 'Wall Sit'], 'neutral_standing'],
    ['Sit-Up', [undefined, 'x', 'Sit-Up'], 'neutral_standing'],
    ['Opposite Arm Reach (no "sit" substring match)', [undefined, 'x', 'Opposite Arm Reach'], 'neutral_standing'],
    ['Bulgarian Split Squat', [undefined, 'x', 'Bulgarian Split Squat'], 'squat'],
    ['Box Breathing', [undefined, 'x', 'Box Breathing'], 'seated_long_sit'],
    ['Dead Bug with Exhale', [undefined, 'Core Stability', 'Dead Bug with Exhale'], 'dead_bug'],
    ['Supported Single-Leg Hip Airplane Iso', [undefined, 'Hip Hinge', 'Supported Single-Leg Hip Airplane Iso'], 'hip_airplane'],
    ['Prone Swimmer Pulls', [undefined, 'Spinal Extension', 'Prone Swimmer Pulls'], 'prone_swimmer'],
    ['Pronated Grip Row (no "prone" substring match)', [undefined, 'x', 'Pronated Grip Row'], 'neutral_standing'],
    ['alias warrior_three', ['warrior_three'], 'hip_airplane'],
    ['alias deadbug', ['deadbug'], 'dead_bug'],
    ['alias prone_pull', ['prone_pull'], 'prone_swimmer'],
    ['All-Fours Cat Cow', [undefined, 'x', 'All-Fours Cat Cow'], 'puppy_pose'],
    ['empty inputs', [undefined, undefined, undefined], 'neutral_standing'],
    ['null/blank inputs', [null, '', '  '], 'neutral_standing'],
    ['prototype key', ['constructor', '__proto__', 'toString'], 'neutral_standing'],
    ['exact slug', ['plank', 'x', 'y'], 'plank'],
    ['alias slug', ['child_pose', undefined, undefined], 'puppy_pose'],
  ]
  for (const [label, args, expected] of cases) {
    it(`${label} -> ${expected}`, () => assert.equal(keyOf(getPoseData(...args)), expected))
  }
})

describe('helpers', () => {
  it('normalizeToken', () => {
    assert.equal(normalizeToken("Child's Pose"), 'child_s_pose')
    assert.equal(normalizeToken(null), '')
  })
  it('matchesRule honours word boundaries and exclusions', () => {
    const rule = { slug: 's', keywords: ['sit'], requireWordBoundary: true, excludeIfAny: ['wall'] }
    assert.equal(matchesRule('long_sit', rule), true)
    assert.equal(matchesRule('position', rule), false)
    assert.equal(matchesRule('wall_sit', rule), false)
  })
  it('dereference follows chains and rejects cycles', () => {
    const lib = { a: { alias_of: 'b' }, b: { alias_of: 'c' }, c: { frames: [] }, x: { alias_of: 'y' }, y: { alias_of: 'x' } }
    assert.equal(dereference(lib, 'a'), lib.c)
    assert.equal(dereference(lib, 'x'), undefined)
    assert.equal(dereference(lib, 'missing'), undefined)
  })
})

describe('poseLibrary.json schema', () => {
  const joints = [...new Set(SKELETON_BONES.flatMap((b) => [b.from, b.to]))].sort()

  it('has 17 canonical joints', () => assert.equal(joints.length, 17))
  it('has a neutral_standing fallback', () => assert.ok(library.neutral_standing.frames.length))

  for (const [key, entry] of Object.entries(library)) {
    if (entry.alias_of) {
      it(`${key}: alias resolves to a canonical pose`, () => {
        assert.deepEqual(Object.keys(entry), ['alias_of'])
        assert.ok(dereference(library, key)?.frames)
      })
      continue
    }
    it(`${key}: canonical pose is well-formed`, () => {
      assert.ok(Number.isFinite(entry.tempo_seconds) && entry.tempo_seconds > 0, 'tempo_seconds')
      assert.ok(Number.isFinite(entry.ground_y), 'ground_y')
      assert.ok(Array.isArray(entry.frames) && entry.frames.length >= 2, 'frames')
      entry.frames.forEach((frame, i) => {
        assert.deepEqual(Object.keys(frame).sort(), joints, `frame ${i} joints`)
        for (const [joint, point] of Object.entries(frame)) {
          assert.ok(
            Array.isArray(point) && point.length === 2 && point.every((n) => Number.isFinite(n) && n >= 0 && n <= 100),
            `frame ${i} ${joint} ${JSON.stringify(point)}`,
          )
        }
      })
    })
  }

  it('every rule targets an existing pose', () => {
    for (const rule of POSE_RULES) assert.ok(dereference(library, rule.slug), rule.slug)
  })
})
