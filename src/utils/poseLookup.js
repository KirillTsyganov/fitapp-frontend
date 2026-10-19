import library from '@/assets/poses/poseLibrary.json'
import { POSE_RULES } from '@/utils/poseRules.js'
import { createPoseResolver } from '@/utils/poseResolver.js'

export const getPoseData = createPoseResolver(library, POSE_RULES)

export const poseSlugs = Object.keys(library).filter((slug) => !library[slug].alias_of)
