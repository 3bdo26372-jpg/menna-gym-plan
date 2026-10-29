import { addDays, APP_TIME_ZONE, isIsoDate } from './date'
import { periodRestDates, type PeriodEntry } from './period'

/**
 * Her five prayers (صلاتها). Each one is worth PRAYER_POINTS when she taps
 * «صليت» within an hour of its time; after that it loses a point every 15
 * minutes, down to LATE_FLOOR, so praying late still counts for something.
 * Fajr never loses points. A prayer can be ticked until the next day's Fajr.
 * Period days have no prayers: they are left out, and never count against her.
 *
 * Every 7 days from the day she first ticks a prayer is a week; a week with
 * WEEK_GOAL of its possible points earns a gift. She opens it on the prayer
 * page, optionally with a hint, and it waits as "pending" until it is marked
 * done in the database. Every BIG_GIFT_WEEKS such weeks in a row earn a bigger
 * gift the same way.
 *
 * Prayer points are their own tally, not added to نقطها: besides deciding the
 * gifts, they are spent in the prayer shop (محل الصلاة) on items set in the
 * database. A purchase waits as "pending" too; a cancelled one gives its
 * points back.
 */
export const PRAYERS = [
  { name: 'الفجر', emoji: '🌅' },
  { name: 'الضهر', emoji: '☀️' },
  { name: 'العصر', emoji: '🌤️' },
  { name: 'المغرب', emoji: '🌇' },
  { name: 'العشا', emoji: '🌙' },
] as const
export const FAJR = 0
export const ASR = 2

export const PRAYER_POINTS = 10
export const DAY_POINTS = PRAYER_POINTS * PRAYERS.length
/** Full points up to this long after the prayer's time. */
export const ON_TIME_MIN = 60
/** After that, a point less every this many minutes, never below LATE_FLOOR. */
export const LATE_STEP_MIN = 15
export const LATE_FLOOR = 2
export const PRAYER_WEEK_DAYS = 7
/** A week earns its gift at this share of its possible points: 300 of 350. */
export const WEEK_GOAL = 6 / 7

export interface PrayerLog {
  date: string
  prayer: number
  /** When she prayed (ISO); the time she tapped, or the earlier time she picked. */
  prayedAt: string
}

export type PrayerGiftStatus = 'pending' | 'done' | 'cancelled'
export interface PrayerGift {
  /** The first day of the week that earned it. */
  weekStart: string
  note: string | null
  status: PrayerGiftStatus
  createdAt: string
  doneAt: string | null
}

export const GIFT_NOTE_MAX_LENGTH = 300

// --- Prayer times -----------------------------------------------------------

/** Where her prayer times are worked out. */
export const PRAYER_PLACE = { name: 'القاهرة', latitude: 30.0444, longitude: 31.2357 }

/**
 * The Egyptian General Authority of Survey's method: Fajr when the sun is
 * 19.5° below the horizon, Isha at 17.5°, Asr when a shadow is its object's
 * length plus its noon shadow, and Dhuhr a minute after noon.
 */
const FAJR_ANGLE = 19.5
const ISHA_ANGLE = 17.5
const HORIZON_ANGLE = 0.833
const DHUHR_AFTER_NOON_MIN = 1

const rad = (degrees: number) => (degrees * Math.PI) / 180
const deg = (radians: number) => (radians * 180) / Math.PI
const wrap = (value: number, size: number) => ((value % size) + size) % size

function julianDay(date: string) {
  let year = Number(date.slice(0, 4))
  let month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  if (month <= 2) {
    year -= 1
    month += 12
  }
  const century = Math.floor(year / 100)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + 2 - century + Math.floor(century / 4) - 1524.5
}

/** The sun's declination (degrees) and the equation of time (hours) at a Julian day. */
function sunAt(jd: number) {
  const days = jd - 2451545
  const anomaly = rad(wrap(357.529 + 0.98560028 * days, 360))
  const meanLongitude = wrap(280.459 + 0.98564736 * days, 360)
  const longitude = rad(wrap(meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly), 360))
  const obliquity = rad(23.439 - 0.00000036 * days)
  const ascension = wrap(deg(Math.atan2(Math.cos(obliquity) * Math.sin(longitude), Math.cos(longitude))) / 15, 24)
  return { declination: deg(Math.asin(Math.sin(obliquity) * Math.sin(longitude))), equation: meanLongitude / 15 - ascension }
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Cairo's offset from UTC on a date, in minutes (it has summer time). */
export function cairoOffsetMinutes(date: string) {
  const [hour, minute] = timeFormat.format(new Date(`${date}T12:00:00Z`)).split(':').map(Number)
  return hour * 60 + minute - 12 * 60
}

export interface DayPrayerTimes {
  /** Minutes after Cairo midnight, one per prayer in PRAYERS order. */
  prayers: number[]
  sunrise: number
}

/** The day's prayer times in Cairo, to the nearest minute. */
export function prayerTimes(date: string): DayPrayerTimes {
  const { latitude, longitude } = PRAYER_PLACE
  const jd = julianDay(date) - longitude / (15 * 24)
  const noonAt = (hours: number) => wrap(12 - sunAt(jd + hours / 24).equation, 24)
  // Hours from noon until the sun is `angle` degrees below the horizon.
  const sunAngle = (angle: number, hours: number, before: boolean) => {
    const { declination } = sunAt(jd + hours / 24)
    const cosine = (-Math.sin(rad(angle)) - Math.sin(rad(declination)) * Math.sin(rad(latitude))) / (Math.cos(rad(declination)) * Math.cos(rad(latitude)))
    const span = deg(Math.acos(Math.min(1, Math.max(-1, cosine)))) / 15
    return noonAt(hours) + (before ? -span : span)
  }
  const asrAt = (hours: number) => {
    const { declination } = sunAt(jd + hours / 24)
    return sunAngle(-deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(latitude - declination)))))), hours, false)
  }

  // Solar hours, refined twice from rough guesses.
  let [fajr, sunrise, dhuhr, asr, maghrib, isha] = [5, 6, 12, 13, 18, 18]
  for (let round = 0; round < 2; round += 1) {
    ;[fajr, sunrise, dhuhr, asr, maghrib, isha] = [
      sunAngle(FAJR_ANGLE, fajr, true),
      sunAngle(HORIZON_ANGLE, sunrise, true),
      noonAt(dhuhr),
      asrAt(asr),
      sunAngle(HORIZON_ANGLE, maghrib, false),
      sunAngle(ISHA_ANGLE, isha, false),
    ]
  }
  const shift = cairoOffsetMinutes(date) - (longitude / 15) * 60
  const local = (hours: number, extra = 0) => Math.round(hours * 60 + shift + extra)
  return { prayers: [local(fajr), local(dhuhr, DHUHR_AFTER_NOON_MIN), local(asr), local(maghrib), local(isha)], sunrise: local(sunrise) }
}

/** The instant (ms) of a Cairo wall-clock time on a date, in minutes after midnight. */
export const cairoInstant = (date: string, minutes: number) => Date.parse(`${date}T00:00:00Z`) + (minutes - cairoOffsetMinutes(date)) * 60_000

/** When a prayer starts, and the last moment it can be ticked (the next day's Fajr). */
export function prayerWindow(date: string, prayer: number) {
  return { from: cairoInstant(date, prayerTimes(date).prayers[prayer]), until: cairoInstant(addDays(date, 1), prayerTimes(addDays(date, 1)).prayers[FAJR]) }
}

// --- Points -----------------------------------------------------------------

/** Points for a prayer prayed this many minutes after its time. */
export function prayerPoints(prayer: number, minutesLate: number) {
  if (prayer === FAJR || minutesLate <= ON_TIME_MIN) return PRAYER_POINTS
  return Math.max(LATE_FLOOR, PRAYER_POINTS - Math.ceil((minutesLate - ON_TIME_MIN) / LATE_STEP_MIN))
}

export function pointsFor(log: PrayerLog) {
  return prayerPoints(log.prayer, (Date.parse(log.prayedAt) - prayerWindow(log.date, log.prayer).from) / 60_000)
}

export const prayerLog = (logs: PrayerLog[] | undefined, date: string, prayer: number) => (logs ?? []).find((log) => log.date === date && log.prayer === prayer) ?? null

/** Days of her period: no prayers are due. */
export const prayerFreeDates = (periods: PeriodEntry[] | undefined, today: string) => new Set(periodRestDates(periods, today))

export const dayPrayerPoints = (logs: PrayerLog[] | undefined, date: string) =>
  (logs ?? []).filter((log) => log.date === date).reduce((sum, log) => sum + pointsFor(log), 0)

export interface PrayerWeek {
  start: string
  end: string
  earned: number
  /** 50 for every day of the week that isn't a period day; days still to come count too. */
  possible: number
  goal: number
  /** The week is over. */
  finished: boolean
  reached: boolean
}

type PrayerState = { today: string; prayers?: PrayerLog[]; periods?: PeriodEntry[] }

/** The day she first ticked a prayer; the weeks count from it. */
export const prayerStart = (logs: PrayerLog[] | undefined) => (logs?.length ? logs.reduce((first, log) => (log.date < first ? log.date : first), logs[0].date) : null)

/** Every week from her first prayer up to the current one. */
export function prayerWeeks(state: PrayerState): PrayerWeek[] {
  const start = prayerStart(state.prayers)
  if (!start) return []
  const free = prayerFreeDates(state.periods, state.today)
  const weeks: PrayerWeek[] = []
  for (let first = start; first <= state.today; first = addDays(first, PRAYER_WEEK_DAYS)) {
    const dates = Array.from({ length: PRAYER_WEEK_DAYS }, (_, index) => addDays(first, index))
    const possible = dates.filter((date) => !free.has(date)).length * DAY_POINTS
    const earned = dates.reduce((sum, date) => sum + dayPrayerPoints(state.prayers, date), 0)
    const goal = Math.ceil(possible * WEEK_GOAL)
    const end = dates[PRAYER_WEEK_DAYS - 1]
    weeks.push({ start: first, end, earned, possible, goal, finished: end < state.today, reached: possible > 0 && earned >= goal })
  }
  return weeks
}

const opened = (gifts: PrayerGift[] | undefined, weekStart: string) => (gifts ?? []).some((gift) => gift.weekStart === weekStart && gift.status !== 'cancelled')

/** Finished weeks that earned a gift she hasn't opened yet. */
export const unopenedPrayerGifts = (state: PrayerState & { prayerGifts?: PrayerGift[] }) =>
  prayerWeeks(state).filter((week) => week.finished && week.reached && !opened(state.prayerGifts, week.start))

// --- The big gift -----------------------------------------------------------

/** Kept weeks in a row for the big gift; it comes again after every run. */
export const BIG_GIFT_WEEKS = 4

/**
 * Her runs of kept weeks: `run` is how many in a row so far, and `milestones`
 * the week that completed each run of BIG_GIFT_WEEKS. A week that was all
 * period days is skipped: it neither counts nor breaks the run.
 */
export function prayerStreak(state: PrayerState) {
  const milestones: PrayerWeek[] = []
  let run = 0
  for (const week of prayerWeeks(state).filter((item) => item.finished && item.possible > 0)) {
    run = week.reached ? run + 1 : 0
    if (run === BIG_GIFT_WEEKS) {
      milestones.push(week)
      run = 0
    }
  }
  return { run, milestones }
}

/** Big gifts earned and not opened yet, keyed by the week that completed the run. */
export const unopenedBigGifts = (state: PrayerState & { prayerBigGifts?: PrayerGift[] }) =>
  prayerStreak(state).milestones.filter((week) => !opened(state.prayerBigGifts, week.start))

// --- The prayer shop --------------------------------------------------------

export interface PrayerShopItem {
  id: string
  title: string
  emoji: string
  price: number
  /** She has to write what she wants (a request). */
  noteRequired: boolean
  sortOrder: number
}

export interface PrayerBuy {
  id: number
  itemId: string
  /** The item's title and price when she bought it. */
  title: string
  points: number
  note: string | null
  status: PrayerGiftStatus
  createdAt: string
  doneAt: string | null
}

/** The shop until the database says otherwise; migration 0022 seeds the same items. */
export const DEFAULT_PRAYER_SHOP: PrayerShopItem[] = [
  { id: 'treat', title: 'حاجة حلوة تختاريها', emoji: '🍫', price: 150, noteRequired: false, sortOrder: 1 },
  { id: 'request', title: 'طلب تكتبيه بنفسك', emoji: '✍️', price: 300, noteRequired: true, sortOrder: 2 },
  { id: 'mat', title: 'سجادة صلاة جديدة', emoji: '🕌', price: 600, noteRequired: false, sortOrder: 3 },
  { id: 'outing', title: 'خروجة تختاريها', emoji: '🎡', price: 1000, noteRequired: false, sortOrder: 4 },
]

type ShopState = PrayerState & { prayerShop?: PrayerShopItem[]; prayerBuys?: PrayerBuy[] }

/** Everything she earned with her prayers, minus what she spent in the shop. */
export function prayerBalance(state: ShopState) {
  const earned = (state.prayers ?? []).filter((log) => log.date <= state.today).reduce((sum, log) => sum + pointsFor(log), 0)
  const spent = (state.prayerBuys ?? []).filter((buy) => buy.status !== 'cancelled').reduce((sum, buy) => sum + buy.points, 0)
  return { earned, spent, balance: earned - spent }
}

export function validatePrayerBuy(input: unknown, itemId: string, state: ShopState): Pick<PrayerBuy, 'itemId' | 'title' | 'points' | 'note'> | string {
  const item = (state.prayerShop ?? []).find((candidate) => candidate.id === itemId)
  if (!item) return 'unknown item'
  const note = input && typeof input === 'object' && typeof (input as Record<string, unknown>).note === 'string' ? ((input as Record<string, unknown>).note as string).trim().slice(0, GIFT_NOTE_MAX_LENGTH) : ''
  if (item.noteRequired && !note) return 'write what you would like'
  if (item.price > prayerBalance(state).balance) return 'not enough prayer points'
  return { itemId: item.id, title: item.title, points: item.price, note: note || null }
}

// --- Validation -------------------------------------------------------------

/** How far ahead of the server clock a picked time may be (phone clocks drift). */
const CLOCK_SLACK_MS = 2 * 60_000

/** A tick: which prayer, prayed or not, and optionally when (an ISO time, default now). */
export function validatePrayerMark(input: unknown, date: string, now: number): { prayer: number; prayed: boolean; prayedAt: string } | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const prayer = fields.prayer
  if (!Number.isInteger(prayer) || (prayer as number) < 0 || (prayer as number) >= PRAYERS.length) return 'unknown prayer'
  if (typeof fields.prayed !== 'boolean') return 'prayed must be true or false'
  const at = fields.at === undefined || fields.at === null ? now : typeof fields.at === 'string' ? Date.parse(fields.at) : Number.NaN
  if (Number.isNaN(at)) return 'at must be an ISO time'
  const { from, until } = prayerWindow(date, prayer as number)
  if (fields.prayed) {
    if (at < from || now < from) return 'its time has not come yet'
    if (at > now + CLOCK_SLACK_MS || at >= until) return 'at must be between its time and the next Fajr, and not in the future'
  }
  return { prayer: prayer as number, prayed: fields.prayed, prayedAt: new Date(Math.min(at, now)).toISOString() }
}

export type PrayerGiftKind = 'week' | 'big'

export function validatePrayerGift(input: unknown, weekStart: string, state: PrayerState & { prayerGifts?: PrayerGift[]; prayerBigGifts?: PrayerGift[] }, kind: PrayerGiftKind = 'week'): { note: string | null } | string {
  if (!isIsoDate(weekStart)) return 'unknown week'
  const waiting = kind === 'big' ? unopenedBigGifts(state) : unopenedPrayerGifts(state)
  if (!waiting.some((week) => week.start === weekStart)) return 'this week has no gift waiting'
  const note = input && typeof input === 'object' && typeof (input as Record<string, unknown>).note === 'string' ? ((input as Record<string, unknown>).note as string).trim().slice(0, GIFT_NOTE_MAX_LENGTH) : ''
  return { note: note || null }
}
