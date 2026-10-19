export type Modality = 'weights' | 'calisthenics' | 'mobility' | 'yoga'

export type BlockName =
  | 'Prep / Dynamic Flow'
  | 'Primary Skill / Strength'
  | 'Accessory / Hypertrophy'
  | 'Down-Regulation / Cool Down'

export interface ExerciseItem {
  name: string
  modality: Modality
  target_pattern: string
  animation_slug?: string | null
  sets: number
  reps_or_duration: string
  allocated_seconds?: number | null
  rpe?: number | null
  rest_seconds?: number | null
  transition_notes?: string | null
  notes?: string | null
}

export type Structure = 'linear' | 'circuit'

export interface WorkoutBlock {
  block_name: BlockName
  structure?: Structure | null
  exercises: ExerciseItem[]
}

export interface CoachWorkoutResponse {
  flow_name: string
  estimated_total_minutes: number
  target_focus: string
  message: string
  diagnostic_needed: boolean
  diagnostic_question?: string | null
  workout_summary?: string | null
  blocks?: WorkoutBlock[] | null
}

export interface FlowRecord {
  id: number
  name: string
  target_focus: string
  duration_minutes: number
  routine_data: CoachWorkoutResponse
  created_at: string
}

export interface CreateFlowPayload {
  target_focus: string
  target_duration_minutes: number
  available_equipment?: string[]
  structure_preference?: Structure | null
  context_overrides?: Record<string, unknown>
}

export interface SuggestedFlow {
  focus: string
  estimated_minutes: number
}

export interface ChatMessage {
  id: number
  role: 'user' | 'coach'
  content: string
  diagnostic_needed?: boolean
  diagnostic_question?: string | null
  suggested_flow?: SuggestedFlow | null
  // Set after the suggested flow has been generated, so the card swaps for a link.
  created_flow?: FlowRecord | null
}
