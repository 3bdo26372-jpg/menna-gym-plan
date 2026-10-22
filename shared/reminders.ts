import { unusedGifts } from './dayPasses'
import { formatLitres, waterMl } from './food'
import { NICKNAMES, withNickname } from './nicknames'
import { isPainRest, periodForecast } from './period'
import { EARN, WATER_GOAL_ML } from './points'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type { AppState } from './types'

/**
 * Push notifications on her phone. The Worker checks every 15 minutes and
 * sends each reminder at most once a day, inside its window, and only when
 * it still applies:
 * - sleep, from 12:30: last night's sleep isn't logged yet
 * - water, from 17:30: under 1 L so far today
 * - workout, from 21:00: no workout yet, and not a period or pain-rest day
 * A gift pass added after she turned notifications on is announced once, any time of day.
 */
export type ReminderKind = 'sleep' | 'water' | 'workout'

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
  water: { from: '17:30', until: '21:00' },
  workout: { from: '21:00', until: '23:30' },
}
export const WATER_REMINDER_BELOW_ML = 1000

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

  const water = waterMl(state.foodEntries.filter((entry) => entry.date === state.today))
  if (inWindow('water', time) && water < WATER_REMINDER_BELOW_ML) {
    add({
      key: 'water', title: 'كوباية مية يا {nick} 💧',
      body: water ? `لسه شاربة ${formatLitres(water)} لتر بس، والهدف ${formatLitres(WATER_GOAL_ML)}. يلا كوباية دلوقتي 🥤` : `لسه ما سجلتيش مية النهارده، والهدف ${formatLitres(WATER_GOAL_ML)} لتر. يلا كوباية دلوقتي 🥤`,
      url: '/#/food/water',
    })
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
