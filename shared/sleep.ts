/**
 * Sleep log. Each day holds the night before it: when she went to sleep and
 * when she woke up that day, both as Cairo "HH:MM". Going to sleep after
 * midnight is normal for her, so a bedtime later than the wake time is read
 * as the evening before.
 */
export interface SleepLog {
  /** "HH:MM" she went to sleep. */
  sleptAt: string
  /** "HH:MM" she woke up. */
  wokeAt: string
  /** How it felt, if she said. */
  quality?: SleepQuality | null
  /** Anything she wants to add: woke up a lot, dreams, cramps… */
  note?: string | null
}

export type SleepQuality = 'good' | 'okay' | 'bad'
export const SLEEP_QUALITIES: { value: SleepQuality; label: string; emoji: string }[] = [
  { value: 'good', label: 'كويس', emoji: '😴' },
  { value: 'okay', label: 'عادي', emoji: '😐' },
  { value: 'bad', label: 'وحش', emoji: '😣' },
]
export const SLEEP_NOTE_MAX = 200

/** Hours of sleep the tips aim for. */
export const SLEEP_GOAL_HOURS = 7
/** A bedtime from this hour (until noon) counts as late. */
export const LATE_BEDTIME_HOUR = 2
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_SLEEP_MINUTES = 16 * 60

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** Minutes asleep; a bedtime after the wake time is the evening before. */
export function sleepMinutes(sleep: SleepLog) {
  const minutes = minutesOf(sleep.wokeAt) - minutesOf(sleep.sleptAt)
  return minutes > 0 ? minutes : minutes + 24 * 60
}

/** "7 ساعات ونص", "6 ساعات و20 دقيقة", "8 ساعات". */
export function formatSleep(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hourText = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : `${hours} ${hours >= 3 && hours <= 10 ? 'ساعات' : 'ساعة'}`
  if (rest === 0) return hourText
  if (rest === 30) return `${hourText} ونص`
  if (rest === 15) return `${hourText} وربع`
  if (hours === 0) return `${rest} دقيقة`
  return `${hourText} و${rest} دقيقة`
}

/** Going to sleep from 2 am up to noon. */
export function isLateBedtime(sleep: SleepLog) {
  const hour = Number(sleep.sleptAt.slice(0, 2))
  return hour >= LATE_BEDTIME_HOUR && hour < 12
}

/** A sleep log, or null to clear it. */
export function validateSleep(input: unknown): SleepLog | null | string {
  if (input === null) return null
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : null
  if (!fields) return 'sleep must be an object'
  if (fields.sleptAt === null && fields.wokeAt === null) return null
  const { sleptAt, wokeAt } = fields
  if (typeof sleptAt !== 'string' || !TIME.test(sleptAt)) return 'sleptAt must be HH:MM'
  if (typeof wokeAt !== 'string' || !TIME.test(wokeAt)) return 'wokeAt must be HH:MM'
  if (sleepMinutes({ sleptAt, wokeAt }) > MAX_SLEEP_MINUTES) return 'that is too long for one night'
  const quality = fields.quality ?? null
  if (quality !== null && !SLEEP_QUALITIES.some((option) => option.value === quality)) return 'invalid quality'
  if (fields.note !== undefined && fields.note !== null && typeof fields.note !== 'string') return 'note must be text'
  const note = typeof fields.note === 'string' ? fields.note.trim().slice(0, SLEEP_NOTE_MAX) || null : null
  return { sleptAt, wokeAt, quality: quality as SleepQuality | null, note }
}

/** Average minutes over the nights that have a log, or null with none. */
export function averageSleep(logs: (SleepLog | null)[]) {
  const nights = logs.filter((log): log is SleepLog => log !== null).map(sleepMinutes)
  return nights.length ? Math.round(nights.reduce((sum, minutes) => sum + minutes, 0) / nights.length) : null
}
