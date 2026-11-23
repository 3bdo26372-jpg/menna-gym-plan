/**
 * Her pills: she adds each one with its name and the time she takes it, and
 * removes it when she stops. Every pill she takes is reminded at its time, and
 * she ticks each one off when she takes it.
 *
 * A removed pill stays in the list with the day it stopped, so the days she
 * took it still show what she took.
 */
export interface Pill {
  id: number
  name: string
  /** "HH:MM", when she takes it and is reminded. */
  time: string
  /** The first day she takes it. */
  addedOn: string
  /** The first day she no longer takes it, or null while she still does. */
  removedOn: string | null
  /** Hours between her doses when she takes it more than once a day; null (or missing) for once a day. */
  everyHours?: number | null
}

export interface PillDose {
  date: string
  pillId: number
  /** Which of the day's doses, as `pillTimes` numbers them; 0 (or missing) is the pill's own time. */
  slot?: number
  takenAt: string
}

/** One dose on a day: the pill, which of its doses, and when. */
export interface PillTime {
  pill: Pill
  slot: number
  time: string
}

/**
 * Any time of the day, after midnight too, since each day starts at Cairo
 * midnight. The last one is 23:45, the Worker's last check before midnight
 * (it checks every 15 minutes), so every pill gets its reminder on its own date.
 */
export const PILL_TIME_FROM = '00:00'
export const PILL_TIME_UNTIL = '23:45'
export const PILL_NAME_MAX = 40
/** The most pills she can be taking at once. */
export const MAX_PILLS = 10
/** How often a pill can repeat; each divides the day, so the doses fall at the same times every day. */
export const PILL_EVERY_HOURS = [4, 6, 8, 12] as const

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * The times she takes a pill each day: its own time, and when it repeats,
 * every few hours from it round the clock. Slot 0 is its own time.
 */
export function pillTimes(pill: Pick<Pill, 'time' | 'everyHours'>): string[] {
  const every = pill.everyHours ?? 0
  if (!every) return [pill.time]
  return Array.from({ length: 24 / every }, (_, slot) => clock((minutesOf(pill.time) + slot * every * 60) % (24 * 60)))
}

export function validatePill(input: unknown): { name: string; time: string; everyHours: number | null } | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const name = typeof fields.name === 'string' ? fields.name.trim().replace(/\s+/g, ' ') : ''
  if (!name) return 'name is required'
  if (name.length > PILL_NAME_MAX) return `name must be ${PILL_NAME_MAX} characters or fewer`
  const time = fields.time
  if (typeof time !== 'string' || !TIME.test(time) || time < PILL_TIME_FROM || time > PILL_TIME_UNTIL) return `time must be between ${PILL_TIME_FROM} and ${PILL_TIME_UNTIL}`
  const every = fields.everyHours ?? null
  if (every !== null && !(PILL_EVERY_HOURS as readonly unknown[]).includes(every)) return `everyHours must be one of ${PILL_EVERY_HOURS.join(', ')}, or null`
  const everyHours = every as number | null
  if (pillTimes({ time, everyHours }).some((at) => at > PILL_TIME_UNTIL)) return `every dose must be by ${PILL_TIME_UNTIL}`
  return { name, time, everyHours }
}

export function validatePillDose(input: unknown, pills: Pill[] | undefined, date: string): { pillId: number; slot: number; taken: boolean } | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const pill = (pills ?? []).find((item) => item.id === fields.pillId)
  if (!pill || !takesOn(pill, date)) return 'unknown pill for that day'
  const slot = fields.slot ?? 0
  if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot >= pillTimes(pill).length) return 'unknown dose of that pill'
  if (typeof fields.taken !== 'boolean') return 'taken must be true or false'
  return { pillId: pill.id, slot, taken: fields.taken }
}

/** Whether she takes this pill on this day. */
export const takesOn = (pill: Pill, date: string) => pill.addedOn <= date && (!pill.removedOn || date < pill.removedOn)

/** The pills she takes on a day, in the order of their times. */
export const pillsOn = (pills: Pill[] | undefined, date: string) =>
  (pills ?? []).filter((pill) => takesOn(pill, date)).sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id)

/** Every dose she takes on a day, in the order of their times. */
export const pillDosesOn = (pills: Pill[] | undefined, date: string): PillTime[] =>
  pillsOn(pills, date)
    .flatMap((pill) => pillTimes(pill).map((time, slot) => ({ pill, slot, time })))
    .sort((a, b) => a.time.localeCompare(b.time) || a.pill.id - b.pill.id || a.slot - b.slot)

export const pillTaken = (doses: PillDose[] | undefined, date: string, pillId: number, slot = 0) =>
  (doses ?? []).some((dose) => dose.date === date && dose.pillId === pillId && (dose.slot ?? 0) === slot)

/** How many of a pill's doses on a day she took. */
export const pillTakenCount = (doses: PillDose[] | undefined, date: string, pill: Pill) =>
  pillTimes(pill).filter((_, slot) => pillTaken(doses, date, pill.id, slot)).length

/** Today's doses whose time has come and that she hasn't taken yet. */
export const pillsDue = (pills: Pill[] | undefined, doses: PillDose[] | undefined, date: string, time: string) =>
  pillDosesOn(pills, date).filter((dose) => time >= dose.time && !pillTaken(doses, date, dose.pill.id, dose.slot))
