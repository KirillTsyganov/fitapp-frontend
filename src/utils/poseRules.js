// Evaluated top to bottom; the first match wins, so order encodes specificity (floor planes before upper-body patterns).
// slug: target key in poseLibrary.json
// keywords: normalized snake_case tokens; substring match unless requireWordBoundary
// excludeIfAny: whole-word tokens that veto the rule
export const POSE_RULES = [
  // Supine ground
  { slug: 'glute_bridge', keywords: ['bridge', 'thrust'] },
  { slug: 'dead_bug', keywords: ['dead_bug', 'deadbug', 'anti_extension', 'hollow_body'] },

  // Kneeling / quadruped
  { slug: 'puppy_pose', keywords: ['puppy', 'child', 'all_fours', 'kneeling'] },

  // Prone / planks
  { slug: 'scapular_plank', keywords: ['scapular'] },
  { slug: 'plank', keywords: ['plank'] },
  { slug: 'prone_swimmer', keywords: ['swimmer', 'spinal_extension', 'cobra'] },
  { slug: 'prone_swimmer', keywords: ['prone'], requireWordBoundary: true },

  // Seated / compression
  { slug: 'seated_long_sit', keywords: ['straddle', 'hover', 'lift_off'] },
  {
    slug: 'seated_long_sit',
    keywords: ['long_sit', 'l_sit', 'sit', 'seated'],
    requireWordBoundary: true,
    excludeIfAny: ['wall', 'up', 'stand'],
  },

  // Upper-body push
  { slug: 'horizontal_push', keywords: ['push'], excludeIfAny: ['vertical'] },

  // Lower-body dynamics
  { slug: 'hamstring_sweep', keywords: ['sweep'] },
  { slug: 'hip_airplane', keywords: ['airplane', 'arabesque', 'warrior'] },
  { slug: 'good_morning', keywords: ['good_morning', 'kickstand', 'b_stance'] },
  { slug: 'hip_hinge', keywords: ['hinge', 'deadlift'] },
  { slug: 'hip_hinge', keywords: ['rdl'], requireWordBoundary: true },
  { slug: 'squat', keywords: ['squat', 'lunge', 'split'] },

  // Down-regulation / breathwork
  { slug: 'seated_long_sit', keywords: ['breathing', 'breath', 'down_regulation', 'downregulation', 'fold'] },
]
