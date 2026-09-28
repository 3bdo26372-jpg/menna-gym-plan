export type Energy = 'low' | 'normal' | 'high'
export type Mood = 'bad' | 'okay' | 'good'
export type BodyFeeling = 'fresh' | 'normal' | 'tired'
export type Sweating = 'low' | 'medium' | 'high'
export type Overall = 'easy' | 'perfect' | 'hard'

export interface CheckIn {
  energy: Energy
  mood: Mood
  body: BodyFeeling
  at: string
}

export interface Feedback {
  difficulty: number
  energyAfter: Energy
  sweating: Sweating
  overall: Overall
  pain: boolean
  favoriteExerciseId?: string
  hardestExerciseId?: string
  note?: string
  at: string
}

export type BlockId = 'warmup' | 'cardio' | 'core' | 'light' | 'cooldown'
export type DayType = 'cardio-burn' | 'box-kick' | 'sculpt-sweat' | 'light'
export type Intensity = 'gentle' | 'normal'

export interface ExerciseLog {
  blockId: BlockId
  slot: number
  plannedExerciseId: string
  exerciseId: string
  plannedSeconds: number
  completedSeconds: number
  switched: boolean
}

export interface WorkoutResult {
  dayType: DayType
  intensity: Intensity
  level: number
  status: 'completed' | 'partial'
  startedAt: string
  finishedAt: string
  plannedSeconds: number
  activeSeconds: number
  /** Share (0–1) of the main blocks' work time that was done. */
  mainCompletion: number
  warmupDone: boolean
  cooldownDone: boolean
  exercises: ExerciseLog[]
}

export interface ScoreBreakdown {
  checkin: number
  workout: number
  warmupCooldown: number
  feedback: number
  total: number
}

export interface DayRecord {
  date: string
  dayNumber: number
  checkin: CheckIn | null
  workout: WorkoutResult | null
  feedback: Feedback | null
  score: ScoreBreakdown
}

export interface BaselineMetric {
  key: string
  value: number
  unit: string
}

export interface MeasurementEntry {
  id: number
  measuredOn: string
  values: Record<string, number>
  note: string | null
  createdAt: string
}

export interface RewardState {
  id: string
  thresholdDays: number
  title: string
  description: string
  emoji: string
  sortOrder: number
  unlockedOn: string | null
  celebratedAt: string | null
}

export interface ReportMeta {
  periodIndex: number
  startDate: string
  endDate: string
  generatedAt: string
}

export interface AppState {
  today: string
  profile: { name: string; programStartDate: string | null; timezone: string }
  baseline: BaselineMetric[]
  measurements: MeasurementEntry[]
  days: DayRecord[]
  rewards: RewardState[]
  reports: ReportMeta[]
}

export interface MeasurementInput {
  measuredOn: string
  values: Record<string, number>
  note?: string
}

export interface RewardPatch {
  title?: string
  description?: string
  emoji?: string
}
