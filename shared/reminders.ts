import { unusedGifts } from './dayPasses'
import { waterMl } from './food'
import { NICKNAMES, withNickname } from './nicknames'
import { isPainRest, periodForecast } from './period'
import { PILL_SLOTS, pillsOn, pillTaken } from './pills'
import { EARN, WATER_GOAL_ML } from './points'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type { AppState } from './types'

/**
 * Push notifications on her phone. The Worker checks every 15 minutes and
 * sends each reminder at most once (water: once each half hour), inside its
 * window, and only when it still applies:
 * - sleep, from 12:30: last night's sleep isn't logged yet
 * - water, glass by glass: the 2.5 L is ten glasses spread evenly from when
 *   she woke up (her sleep log, or noon) to 23:30; each glass gets one
 *   notification when it is due, unless she already drank that far, saying
 *   how many are left and when the next one is
 * - workout, from 21:00: no workout yet, and not a period or pain-rest day
 * - missed, from 18:00: nothing at all logged today, so she hears that his
 *   program misses her
 * - pills: until she has said when to be reminded, she is asked at 18:00 and
 *   once more at 21:00; then each pill at the time she picked, every day up to
 *   her last day, and once more 45 minutes later if she hasn't ticked it off
 * A gift pass added after she turned notifications on is announced once, any time of day.
 */
export type ReminderKind = 'sleep' | 'water' | 'workout' | 'missed' | 'pillsAsk'

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
  water: { from: '05:00', until: '23:30' },
  workout: { from: '21:00', until: '23:30' },
  missed: { from: '18:00', until: '23:30' },
  pillsAsk: { from: '18:00', until: '23:30' },
}
/** The second ask, when she hasn't answered the first. */
const PILLS_ASK_AGAIN = '21:00'
/** A pill's reminder goes out up to this long after its time, and the nudge this long after it. */
const PILL_WINDOW_MIN = 3 * 60
const PILL_AGAIN_MIN = 45
/** The day's water as glasses, spread from waking up to the end of the water window. */
export const GLASS_ML = 250
export const GLASSES = WATER_GOAL_ML / GLASS_ML
/** When she hasn't logged her sleep, the plan assumes she woke up at noon. */
export const DEFAULT_WAKE = '12:00'

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const pad = (value: number) => String(value).padStart(2, '0')

/** "4:30 العصر", "11 الصبح", "9:15 بالليل". */
export function sayTime(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24
  const minute = minutes % 60
  const part = hour < 12 ? 'الصبح' : hour < 15 ? 'الضهر' : hour < 18 ? 'العصر' : hour < 20 ? 'المغرب' : 'بالليل'
  return `${hour % 12 || 12}${minute ? `:${pad(minute)}` : ''} ${part}`
}

/** When each of the day's glasses is due, in minutes after midnight, the first one on waking. */
export function waterPlan(wokeAt: string | null | undefined) {
  const end = minutesOf(REMINDER_WINDOWS.water.until)
  const wake = Math.min(minutesOf(wokeAt && wokeAt >= REMINDER_WINDOWS.water.from && wokeAt < REMINDER_WINDOWS.water.until ? wokeAt : DEFAULT_WAKE), end - 60)
  const gap = (end - wake) / GLASSES
  return Array.from({ length: GLASSES }, (_, index) => Math.round(wake + index * gap))
}

const ORDINALS = ['الأولى', 'التانية', 'التالتة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'التامنة', 'التاسعة', 'العاشرة']
const glassCount = (count: number) => (count === 1 ? 'كوباية واحدة' : count === 2 ? 'كوبايتين' : `${count} ${count <= 10 ? 'كوبايات' : 'كوباية'}`)

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

  // Water glass by glass: the latest glass that is due and not drunk yet, once.
  const todayFood = state.foodEntries.filter((entry) => entry.date === state.today)
  const water = waterMl(todayFood)
  const drunk = Math.min(GLASSES, Math.floor(water / GLASS_ML))
  const plan = waterPlan(day.sleep?.wokeAt)
  const now = minutesOf(time)
  const dueGlass = plan.filter((at) => at <= now).length - 1
  if (inWindow('water', time) && dueGlass >= drunk && drunk < GLASSES) {
    const left = GLASSES - drunk
    const next = plan[dueGlass + 1]
    add({
      key: `water-glass-${dueGlass + 1}`,
      title: `الكوباية ${ORDINALS[drunk] ?? ''} دلوقتي يا {nick} 💧`,
      body: `${drunk ? `شربتي ${glassCount(drunk)} وفاضل ${glassCount(left)}.` : `أول كوباية، وفاضل بعدها ${glassCount(left - 1)}.`}${next !== undefined && left > 1 ? ` اللي بعدها الساعة ${sayTime(next)} ⏰` : ' دي آخر واحدة، برافو عليكي 🎉'} وسجّليها 🤍`,
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

  // Pills: ask when to remind her until she says, then remind her of each one.
  if (state.pillPlan === null && inWindow('pillsAsk', time)) {
    add({ key: 'pills-ask', title: 'عندك برشامتين يا {nick} 💊', body: 'واحدة بعد الفطار وواحدة بعد الغدا. قوليلي أفكرك بيهم الساعة كام وهتاخديهم لحد امتى، وأنا هفكرك كل يوم 🤍', url: '/#/pills' })
    if (time >= PILLS_ASK_AGAIN && sent.has('pills-ask')) {
      add({ key: 'pills-ask-again', title: 'لسه مستني ردك يا {nick} 💊', body: 'أفكرك بالبرشام امتى؟ اختاري الميعاد وأنا عليا الباقي 🤍', url: '/#/pills' })
    }
  }
  const pills = state.pillPlan
  if (pillsOn(pills, state.today)) {
    PILL_SLOTS.forEach((slot, index) => {
      const since = now - minutesOf(pills.times[index])
      if (since < 0 || since >= PILL_WINDOW_MIN || pillTaken(state.pillDoses, state.today, index)) return
      const last = pills.until === state.today ? ' النهارده آخر يوم 🎉' : ''
      add({ key: `pill-${index}`, title: `وقت برشامة ${slot.label} يا {nick} 💊`, body: `خديها دلوقتي ودوسي «خدتها» في البرنامج ✅${last}`, url: '/#/pills' })
      if (since >= PILL_AGAIN_MIN && sent.has(`pill-${index}`)) {
        add({ key: `pill-${index}-again`, title: `خدتي برشامة ${slot.label}؟ 💊`, body: 'لو خدتيها دوسي «خدتها» عشان مفكّركيش تاني يا {nick} 🤍', url: '/#/pills' })
      }
    })
  }

  for (const gift of unusedGifts(state).filter((item) => item.createdAt > giftsAfter)) {
    add({ key: `gift-${gift.id}`, title: 'جالك إكسبشن هدية 🍫', body: gift.note ?? 'فيه شوكولاتة مستنياكي في الصفحة الرئيسية 🎁', url: '/#/today' })
  }
  return due
}
