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
}

export interface PillDose {
  date: string
  pillId: number
  takenAt: string
}

/** Reminder times stay inside the day, so each one belongs to its own date. */
export const PILL_TIME_FROM = '05:00'
export const PILL_TIME_UNTIL = '23:45'
export const PILL_NAME_MAX = 40
/** The most pills she can be taking at once. */
export const MAX_PILLS = 10

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function validatePill(input: unknown): { name: string; time: string } | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const name = typeof fields.name === 'string' ? fields.name.trim().replace(/\s+/g, ' ') : ''
  if (!name) return 'name is required'
  if (name.length > PILL_NAME_MAX) return `name must be ${PILL_NAME_MAX} characters or fewer`
  const time = fields.time
  if (typeof time !== 'string' || !TIME.test(time) || time < PILL_TIME_FROM || time > PILL_TIME_UNTIL) return `time must be between ${PILL_TIME_FROM} and ${PILL_TIME_UNTIL}`
  return { name, time }
}

export function validatePillDose(input: unknown, pills: Pill[] | undefined, date: string): { pillId: number; taken: boolean } | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const pill = (pills ?? []).find((item) => item.id === fields.pillId)
  if (!pill || !takesOn(pill, date)) return 'unknown pill for that day'
  if (typeof fields.taken !== 'boolean') return 'taken must be true or false'
  return { pillId: pill.id, taken: fields.taken }
}

/** Whether she takes this pill on this day. */
export const takesOn = (pill: Pill, date: string) => pill.addedOn <= date && (!pill.removedOn || date < pill.removedOn)

/** The pills she takes on a day, in the order of their times. */
export const pillsOn = (pills: Pill[] | undefined, date: string) =>
  (pills ?? []).filter((pill) => takesOn(pill, date)).sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id)

export const pillTaken = (doses: PillDose[] | undefined, date: string, pillId: number) => (doses ?? []).some((dose) => dose.date === date && dose.pillId === pillId)

/** Today's pills whose time has come and that she hasn't taken yet. */
export const pillsDue = (pills: Pill[] | undefined, doses: PillDose[] | undefined, date: string, time: string) =>
  pillsOn(pills, date).filter((pill) => time >= pill.time && !pillTaken(doses, date, pill.id))
