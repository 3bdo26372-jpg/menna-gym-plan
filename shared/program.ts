import { addDays } from './date'
import { EXERCISE_BY_ID, exercisesWithRole, type Exercise } from './exercises'
import { isPainRest } from './period'
import type { BlockId, CheckIn, DayRecord, DayType, Intensity } from './types'

/**
 * Workout generation. Everything here is data-driven: day templates list
 * which kinds of exercise fill each slot, and exercises are rotated through
 * their pools so consecutive weeks do not repeat.
 *
 * A 4-day cycle: three active days, then a Light Movement Day (standing
 * stretching + easy movement). There is no "rest day".
 */
export interface PlanBlock {
  id: BlockId
  title: string
  rounds: number
  workSeconds: number
  restSeconds: number
  exerciseIds: string[]
}

export interface WorkoutPlan {
  date: string
  dayNumber: number
  dayType: DayType
  title: string
  subtitle: string
  intensity: Intensity
  level: number
  blocks: PlanBlock[]
  totalSeconds: number
  notes: string[]
}

export interface LevelSettings {
  workSeconds: number
  restSeconds: number
  cardioRounds: number
  coreRounds: number
  moreJumps: boolean
  change: string
}

/** Each level changes exactly one variable from the previous one. */
export const LEVELS: LevelSettings[] = [
  { workSeconds: 30, restSeconds: 20, cardioRounds: 2, coreRounds: 2, moreJumps: false, change: 'نقطة البداية' },
  { workSeconds: 35, restSeconds: 20, cardioRounds: 2, coreRounds: 2, moreJumps: false, change: 'وقت التمرين زاد ٥ ثواني' },
  { workSeconds: 35, restSeconds: 15, cardioRounds: 2, coreRounds: 2, moreJumps: false, change: 'الراحة بقت أقصر ٥ ثواني' },
  { workSeconds: 35, restSeconds: 15, cardioRounds: 3, coreRounds: 2, moreJumps: false, change: 'جولة كارديو زيادة' },
  { workSeconds: 35, restSeconds: 15, cardioRounds: 3, coreRounds: 2, moreJumps: true, change: 'تمارين أنشط في الكارديو' },
  { workSeconds: 40, restSeconds: 15, cardioRounds: 3, coreRounds: 2, moreJumps: true, change: 'وقت التمرين زاد ٥ ثواني' },
  { workSeconds: 40, restSeconds: 15, cardioRounds: 3, coreRounds: 3, moreJumps: true, change: 'جولة بطن زيادة' },
]
export const MAX_LEVEL = LEVELS.length - 1

const WARMUP_SECONDS = 30
/** Short "get ready" pause the player inserts between blocks. */
export const TRANSITION_SECONDS = 10
const STRETCH_SECONDS = 40

type Slot = 'jump' | 'lowCardio' | 'strength' | 'core' | `id:${string}`

interface DayTemplate {
  type: DayType
  title: string
  subtitle: string
  cardio: Slot[]
}

const TEMPLATES: DayTemplate[] = [
  { type: 'cardio-burn', title: 'حرق كارديو', subtitle: 'قفز وحركة سريعة ترفع النبض', cardio: ['jump', 'jump', 'lowCardio', 'jump', 'lowCardio'] },
  { type: 'box-kick', title: 'ملاكمة وركلات', subtitle: 'لكمات وركب وخطوات سريعة', cardio: ['id:boxing-hooks', 'jump', 'id:knee-drive-kick', 'id:fast-feet', 'jump'] },
  { type: 'sculpt-sweat', title: 'شد وتعريق', subtitle: 'سكوات ولانج مع قفز', cardio: ['strength', 'jump', 'strength', 'jump', 'lowCardio'] },
]

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  'cardio-burn': 'حرق كارديو',
  'box-kick': 'ملاكمة وركلات',
  'sculpt-sweat': 'شد وتعريق',
  light: 'يوم تمرين خفيف',
}

export const BLOCK_LABEL: Record<BlockId, string> = {
  warmup: 'تسخين',
  cardio: 'كارديو للجسم كله',
  core: 'بطن وتحكم',
  light: 'تمرين خفيف',
  cooldown: 'إطالة وتهدئة',
}

export const LIGHT_DAY_EVERY = 4

export function dayTypeFor(dayNumber: number): DayType {
  const position = (dayNumber - 1) % LIGHT_DAY_EVERY
  return position === LIGHT_DAY_EVERY - 1 ? 'light' : TEMPLATES[position].type
}

/** Pick `count` distinct exercises from a pool, rotating by `seed`. */
function rotate(pool: Exercise[], seed: number, count: number, taken: Set<string>): string[] {
  const picked: string[] = []
  for (let i = 0; i < pool.length && picked.length < count; i++) {
    const exercise = pool[(seed + i) % pool.length]
    if (!taken.has(exercise.id)) {
      picked.push(exercise.id)
      taken.add(exercise.id)
    }
  }
  return picked
}

function fillSlots(slots: Slot[], level: number, seed: number, exclude: Iterable<string>): string[] {
  const taken = new Set([...exclude, ...slots.filter((slot) => slot.startsWith('id:')).map((slot) => slot.slice(3))])
  const cursor: Record<string, number> = {}
  return slots.map((slot) => {
    if (slot.startsWith('id:')) return slot.slice(3)
    const pool = exercisesWithRole(slot as Exclude<Slot, `id:${string}`>, level)
    const offset = cursor[slot] ?? 0
    cursor[slot] = offset + 1
    return rotate(pool, seed * 2 + offset, 1, taken)[0]
  })
}

function cooldownFor(seed: number, count: number): string[] {
  // Always stretch the legs that did the work, then rotate the upper body.
  const fixed = ['standing-quad-stretch', 'runners-stretch']
  const upper = ['side-stretch', 'chest-opener', 'shoulder-cross-stretch', 'overhead-triceps-stretch', 'upper-back-stretch', 'neck-side-stretch']
  const taken = new Set<string>(fixed)
  const rotated = rotate(upper.map((id) => EXERCISE_BY_ID[id]), seed, count - fixed.length, taken)
  return [rotated[0], rotated[1], ...fixed, ...rotated.slice(2)].filter(Boolean)
}

export function blockSeconds(block: PlanBlock) {
  const perRound = block.exerciseIds.length * block.workSeconds + Math.max(0, block.exerciseIds.length - 1) * block.restSeconds
  return perRound * block.rounds + (block.rounds - 1) * block.restSeconds
}

export interface PlanContext {
  date: string
  dayNumber: number
  level: number
  checkin?: CheckIn | null
  /** Last finished workout was rated Hard. */
  easeAfterHard?: boolean
  /** Pain was reported in the most recent feedback. */
  painReported?: boolean
  /** Period pain she rated for the day, 1–10. */
  periodPain?: number | null
}

export function intensityFor(checkin: CheckIn | null | undefined, easeAfterHard = false): Intensity {
  if (easeAfterHard) return 'gentle'
  if (!checkin) return 'normal'
  return checkin.energy === 'low' || checkin.body === 'tired' ? 'gentle' : 'normal'
}

/** Gentle moves for a period-pain day: no jumps, no deep squats. */
const TINY_MOVES = ['step-back-reach', 'hamstring-curl', 'calf-raises', 'ski-steps']
export const TINY_TITLE = 'تمرين صغنون'

/**
 * A period-pain day (pain above 4): about 5 minutes of easy movement and
 * stretching. The workout's points already count, so this is only if she wants to move.
 */
function tinyPlan(context: PlanContext): WorkoutPlan {
  const seed = context.dayNumber - 1
  const blocks: PlanBlock[] = [
    { id: 'warmup', title: BLOCK_LABEL.warmup, rounds: 1, workSeconds: 30, restSeconds: 0, exerciseIds: ['knee-circles', 'chest-opener'] },
    { id: 'light', title: 'حركة هادية', rounds: 1, workSeconds: 30, restSeconds: 15, exerciseIds: rotate(TINY_MOVES.map((id) => EXERCISE_BY_ID[id]), seed, 3, new Set()) },
    { id: 'cooldown', title: BLOCK_LABEL.cooldown, rounds: 1, workSeconds: 30, restSeconds: 0, exerciseIds: cooldownFor(seed * 2, 4) },
  ]
  return {
    date: context.date,
    dayNumber: context.dayNumber,
    dayType: 'light',
    title: TINY_TITLE,
    subtitle: 'حركة هادية جدًا وإطالة، على قدك خالص',
    intensity: 'gentle',
    level: Math.max(0, Math.min(MAX_LEVEL, context.level)),
    blocks,
    totalSeconds: blocks.reduce((sum, block) => sum + blockSeconds(block), 0) + TRANSITION_SECONDS * (blocks.length - 1),
    notes: ['عشان وجع البريود: نقط التمرين محسوبة لك النهارده حتى لو ماتمرنتيش. ولو حبيتي تتحركي، ده تمرين صغنون، ولو عملتي نصه اليوم يتحسب يوم تمرين كمان.'],
  }
}

export function buildWorkoutPlan(context: PlanContext): WorkoutPlan {
  if (isPainRest(context.periodPain)) return tinyPlan(context)
  const level = Math.max(0, Math.min(MAX_LEVEL, context.level))
  const settings = LEVELS[level]
  // Rotate daily so neighbouring days never repeat the same session.
  const seed = context.dayNumber - 1
  // Any period pain at all takes the jumps out.
  const intensity = context.periodPain ? 'gentle' : intensityFor(context.checkin, context.easeAfterHard)
  const notes: string[] = []
  let dayType = dayTypeFor(context.dayNumber)
  if (context.painReported && dayType !== 'light') {
    dayType = 'light'
    notes.push('سجّلتي ألم في آخر تمرين، فالنهارده يوم تمرين خفيف. لو الألم لسه موجود، ريّحي الجزء ده ومتزوديش الشدة.')
  }

  const warmup: PlanBlock = {
    id: 'warmup', title: BLOCK_LABEL.warmup, rounds: 1, workSeconds: WARMUP_SECONDS, restSeconds: 0,
    exerciseIds: rotate(exercisesWithRole('warmup'), seed * 2, 5, new Set()),
  }

  let blocks: PlanBlock[]
  if (dayType === 'light') {
    const light: PlanBlock = {
      id: 'light', title: BLOCK_LABEL.light, rounds: 2, workSeconds: 40, restSeconds: 20,
      exerciseIds: rotate(exercisesWithRole('light'), seed, 4, new Set(warmup.exerciseIds.slice(0, 4))),
    }
    const cooldown: PlanBlock = { id: 'cooldown', title: BLOCK_LABEL.cooldown, rounds: 1, workSeconds: STRETCH_SECONDS, restSeconds: 0, exerciseIds: cooldownFor(seed * 2, 6) }
    blocks = [{ ...warmup, exerciseIds: warmup.exerciseIds.slice(0, 4), workSeconds: 40 }, light, cooldown]
    notes.push('يوم تمرين خفيف: حركة هادية وإطالة، مش راحة كاملة.')
  } else {
    const template = TEMPLATES.find((item) => item.type === dayType) ?? TEMPLATES[0]
    const slots = settings.moreJumps && dayType === 'cardio-burn'
      ? template.cardio.map((slot, index) => (index === 2 ? 'jump' : slot))
      : template.cardio
    let cardioIds = fillSlots(slots, level, seed, warmup.exerciseIds)
    const coreIds = rotate(exercisesWithRole('core'), seed * 2, 3, new Set([...warmup.exerciseIds, ...cardioIds]))
    let workSeconds = settings.workSeconds
    let restSeconds = settings.restSeconds
    let cardioRounds = settings.cardioRounds
    if (intensity === 'gentle') {
      cardioIds = cardioIds.map((id) => EXERCISE_BY_ID[id].alternativeId && EXERCISE_BY_ID[id].impact === 'high' ? EXERCISE_BY_ID[id].alternativeId! : id)
      cardioIds = cardioIds.filter((id, index) => cardioIds.indexOf(id) === index)
      workSeconds = Math.max(25, workSeconds - 5)
      restSeconds += 5
      cardioRounds = Math.min(cardioRounds, 2)
      notes.push(context.periodPain
        ? 'سجّلتي وجع بريود خفيف، فالنهارده بدائل من غير قفز وفترات أقصر.'
        : context.easeAfterHard
          ? 'آخر تمرين كان صعب، فالنهارده بدائل أخف وفترات أقصر.'
          : 'على حسب إحساسك النهارده: بدائل من غير قفز وفترات أقصر شوية.')
    }
    blocks = [
      warmup,
      { id: 'cardio', title: BLOCK_LABEL.cardio, rounds: cardioRounds, workSeconds, restSeconds, exerciseIds: cardioIds },
      { id: 'core', title: BLOCK_LABEL.core, rounds: settings.coreRounds, workSeconds, restSeconds: Math.max(10, restSeconds - 5), exerciseIds: coreIds },
      { id: 'cooldown', title: BLOCK_LABEL.cooldown, rounds: 1, workSeconds: STRETCH_SECONDS, restSeconds: 0, exerciseIds: cooldownFor(seed * 2, 5) },
    ]
  }

  const template = TEMPLATES.find((item) => item.type === dayType)
  return {
    date: context.date,
    dayNumber: context.dayNumber,
    dayType,
    title: template?.title ?? DAY_TYPE_LABEL.light,
    subtitle: template?.subtitle ?? 'إطالة واقفة وحركة هادية تجدد الطاقة',
    intensity,
    level,
    blocks,
    totalSeconds: blocks.reduce((sum, block) => sum + blockSeconds(block), 0) + TRANSITION_SECONDS * (blocks.length - 1),
    notes,
  }
}

/**
 * Adaptive level from the history before `date`. Three Easy workouts in a row
 * move up one level (one variable at a time); two Hard ones move down. Pain
 * always holds the level where it is.
 */
export function adaptiveState(days: DayRecord[], date: string) {
  let level = 0
  let easyStreak = 0
  let hardStreak = 0
  let last: DayRecord | undefined
  const history = days.filter((day) => day.date < date && day.workout && day.feedback).sort((a, b) => a.date.localeCompare(b.date))
  for (const day of history) {
    last = day
    const feedback = day.feedback!
    if (feedback.pain) {
      easyStreak = 0
      continue
    }
    if (day.workout!.dayType === 'light') continue
    if (feedback.overall === 'easy') {
      hardStreak = 0
      easyStreak += 1
      if (easyStreak >= 3) {
        level = Math.min(MAX_LEVEL, level + 1)
        easyStreak = 0
      }
    } else if (feedback.overall === 'hard' || feedback.difficulty >= 9) {
      easyStreak = 0
      hardStreak += 1
      if (hardStreak >= 2) {
        level = Math.max(0, level - 1)
        hardStreak = 0
      }
    } else {
      easyStreak = 0
      hardStreak = 0
    }
  }
  const recent = last && last.date >= addDays(date, -3) ? last : undefined
  return {
    level,
    easeAfterHard: recent?.feedback?.overall === 'hard',
    painReported: Boolean(recent?.feedback?.pain),
  }
}

/** The day's plan, read from what she logged: the check-in and any period pain. */
export function planForDay(days: DayRecord[], date: string, dayNumber: number, checkin?: CheckIn | null): WorkoutPlan {
  const state = adaptiveState(days, date)
  const periodPain = days.find((day) => day.date === date)?.periodPain ?? null
  return buildWorkoutPlan({ date, dayNumber, checkin, periodPain, ...state })
}
