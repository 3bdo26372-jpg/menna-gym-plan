import { unusedGifts } from './dayPasses'
import { formatLitres, waterMl } from './food'
import { NICKNAMES, withNickname } from './nicknames'
import { isPainRest, periodForecast } from './period'
import { EARN, WATER_GOAL_ML } from './points'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type { AppState } from './types'

/**
 * Push notifications on her phone. The Worker checks every 15 minutes and
 * sends each reminder at most once (water: once each half hour), inside its
 * window, and only when it still applies:
 * - sleep, from 12:30: last night's sleep isn't logged yet
 * - water, every half hour from 11:00: under 2.5 L today and none logged in
 *   the last half hour
 * - workout, from 21:00: no workout yet, and not a period or pain-rest day
 * - missed, from 18:00: nothing at all logged today, so she hears that his
 *   program misses her
 * A gift pass added after she turned notifications on is announced once, any time of day.
 */
export type ReminderKind = 'sleep' | 'water' | 'workout' | 'missed'

export interface Reminder {
  /** Key for "already sent": the reminder kind, or `gift-<id>`. */
  key: string
  title: string
  body: string
  /** Where tapping it opens the app. */
  url: string
}

/** Cairo "HH:MM" windows; a reminder only goes out inside its own. */
export const REMINDER_WINDOWS: Record<ReminderKind, { from: string; until: string }> = {
  sleep: { from: '12:30', until: '16:00' },
  water: { from: '11:00', until: '23:30' },
  workout: { from: '21:00', until: '23:30' },
  missed: { from: '18:00', until: '23:30' },
}
/** Water reminders go out every this many minutes, unless she logged water within it. */
export const WATER_EVERY_MINUTES = 30

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const pad = (value: number) => String(value).padStart(2, '0')

const WATER_LINES = [
  { title: 'كوباية مية يا {nick} 💧', body: 'رشفة دلوقتي وسجّليها، بشرتك هتشكرك ✨' },
  { title: 'المية يا {nick} 💧', body: 'كوباية صغيرة كل نص ساعة وتوصلي للهدف من غير ما تحسي 🥤' },
  { title: 'اشربي يا {nick} 🫗', body: 'جسمك محتاج مية عشان يحرق ويرتاح، يلا كوباية وسجّليها 💗' },
  { title: 'فين المية يا {nick}؟ 💧', body: 'كوباية دلوقتي، وسجّليها في الأكل والشرب 🤍' },
]

/** Said when she hasn't logged anything all day. */
export const MISSED_LINES = ['برنامج بابا بقى وحش؟ 🥺', 'إنتي مش بتحبي برنامج بابا؟ 🥺', 'إنتي زعلانة من برنامج بابا؟ 🥺']

const inWindow = (kind: ReminderKind, time: string) => time >= REMINDER_WINDOWS[kind].from && time < REMINDER_WINDOWS[kind].until

/**
 * Reminders due now. `sent` holds the keys already sent today and every gift
 * ever announced; only gifts created after `giftsAfter` (an ISO time) are announced.
 */
export function dueReminders(state: AppState, time: string, sent: Set<string>, giftsAfter: string): Reminder[] {
  const day = state.days.find((item) => item.date === state.today)
  if (!state.profile.programStartDate || !day) return []
  const seed = [...state.today].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const nick = (index: number) => NICKNAMES[(seed + index) % NICKNAMES.length]
  const due: Reminder[] = []
  const add = (reminder: Reminder) => {
    if (!sent.has(reminder.key)) due.push({ ...reminder, title: withNickname(reminder.title, nick(due.length)), body: withNickname(reminder.body, nick(due.length)) })
  }

  if (inWindow('sleep', time) && !day.sleep) {
    add({ key: 'sleep', title: 'صباح الفل يا {nick} ☀️', body: `نمتي امتى وصحيتي امتى؟ سجّلي نومك وخدي ${EARN.sleep} نقط 🎁`, url: '/#/sleep' })
  }

  // Water every half hour, keyed by the half hour so each one goes out once.
  const todayFood = state.foodEntries.filter((entry) => entry.date === state.today)
  const water = waterMl(todayFood)
  const now = minutesOf(time)
  const slot = now - (now % WATER_EVERY_MINUTES)
  const drankRecently = todayFood.some((entry) => entry.category === 'drink' && entry.ml && now - minutesOf(entry.time) >= 0 && now - minutesOf(entry.time) < WATER_EVERY_MINUTES)
  if (inWindow('water', time) && water < WATER_GOAL_ML && !drankRecently) {
    const line = WATER_LINES[(slot / WATER_EVERY_MINUTES) % WATER_LINES.length]
    add({
      key: `water-${pad(Math.floor(slot / 60))}:${pad(slot % 60)}`, title: line.title,
      body: `${water ? `لسه ${formatLitres(water)} لتر من ${formatLitres(WATER_GOAL_ML)}. ` : ''}${line.body}`,
      url: '/#/food/water',
    })
  }

  // Nothing at all logged today: his program asks if she still likes it.
  const loggedAnything = todayFood.length > 0 || Boolean(day.checkin || day.workout || day.feedback || day.sleep) || day.periodPain !== null
  if (inWindow('missed', time) && !loggedAnything) {
    add({ key: 'missed', title: MISSED_LINES[seed % MISSED_LINES.length], body: 'سجّلي أي حاجة النهارده ولو كوباية مية، برنامجك مستنيكي يا {nick} 💗', url: '/#/today' })
  }

  const trained = (day.workout?.mainCompletion ?? 0) >= ACTIVE_DAY_MIN_COMPLETION
  const period = periodForecast(state.periods ?? [], state.today).phase === 'period'
  if (inWindow('workout', time) && !trained && !day.excused && !period && !isPainRest(day.periodPain)) {
    add({ key: 'workout', title: 'التمرين مستنيكي يا {nick} 💪', body: 'ربع ساعة بس وتخلصي، وبعدها نامي بدري 🌙', url: '/#/training' })
  }

  for (const gift of unusedGifts(state).filter((item) => item.createdAt > giftsAfter)) {
    add({ key: `gift-${gift.id}`, title: 'جالك إكسبشن هدية 🍫', body: gift.note ?? 'فيه شوكولاتة مستنياكي في الصفحة الرئيسية 🎁', url: '/#/today' })
  }
  return due
}
