import { addDays, sayTime } from './date'
import { unusedGifts } from './dayPasses'
import { waterMl } from './food'
import { NICKNAMES, withNickname } from './nicknames'
import { isPainRest, periodForecast } from './period'
import { pillsOn, pillTaken } from './pills'
import { EARN, WATER_GOAL_ML } from './points'
import { ASR, BIG_GIFT_WEEKS, FAJR, ON_TIME_MIN, PRAYER_POINTS, PRAYERS, prayerFreeDates, prayerLog, prayerTimes, unopenedBigGifts, unopenedPrayerGifts } from './prayer'
import { ASR_QUOTES, DHIKR_QUOTES, FAJR_QUOTES, PRAYER_QUOTES, quoteLine, quoteOfDay } from './prayerTexts'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type { AppState } from './types'
import { currentWeek } from './week'

/**
 * Push notifications on her phone. The Worker checks every 15 minutes and
 * sends each reminder at most once (water: once each half hour), inside its
 * window, and only when it still applies:
 * - sleep, from 12:30: last night's sleep isn't logged yet
 * - water, glass by glass: the 2.5 L is ten glasses spread evenly from when
 *   she woke up (her sleep log, or noon) to 23:30; each glass gets one
 *   notification when it is due, unless she already drank that far, saying
 *   how many are left and when the next one is
 * - workout, from 21:00: no workout yet, and not a period, pain-rest or chosen
 *   rest day, nor a week whose workouts are already done
 * - missed, from 18:00: nothing at all logged today, so she hears that his
 *   program misses her
 * - pills: each pill on her list at its own time, every day until she removes
 *   it, and once more 45 minutes later if she hasn't ticked it off
 * - prayers: each one from 10 minutes before its time, with a verse or a
 *   hadith; and (except Fajr) once more 15 minutes before its points start
 *   going down, if she hasn't ticked it. None on her period days.
 * - adhkar: the morning ones two hours before Dhuhr, the evening ones half an
 *   hour after Asr, and one short dhikr two hours after Dhuhr
 * - a weekly prayer gift, the day after the week that earned it, from 12:00,
 *   and the big one the day after every 4 kept weeks in a row
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
  water: { from: '05:00', until: '23:30' },
  workout: { from: '21:00', until: '23:30' },
  missed: { from: '18:00', until: '23:30' },
}
/** A pill's reminder goes out up to this long after its time, and the nudge this long after it. */
const PILL_WINDOW_MIN = 3 * 60
const PILL_AGAIN_MIN = 45
/** Prayer notes start this long before the prayer, and the nudge comes this long before its points go down. */
const PRAYER_EARLY_MIN = 10
const PRAYER_NUDGE_MIN = 15
/** The adhkar notes, in minutes from the prayer times. */
const MORNING_ADHKAR_BEFORE_DHUHR = 120
const EVENING_ADHKAR_AFTER_ASR = 30
const DHIKR_AFTER_DHUHR = 120
const PRAYER_GIFT_FROM = '12:00'
/** The day's water as glasses, spread from waking up to the end of the water window. */
export const GLASS_ML = 250
export const GLASSES = WATER_GOAL_ML / GLASS_ML
/** When she hasn't logged her sleep, the plan assumes she woke up at noon. */
export const DEFAULT_WAKE = '12:00'

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

export { sayTime }

/** When each of the day's glasses is due, in minutes after midnight, the first one on waking. */
export function waterPlan(wokeAt: string | null | undefined) {
  const end = minutesOf(REMINDER_WINDOWS.water.until)
  const wake = Math.min(minutesOf(wokeAt && wokeAt >= REMINDER_WINDOWS.water.from && wokeAt < REMINDER_WINDOWS.water.until ? wokeAt : DEFAULT_WAKE), end - 60)
  const gap = (end - wake) / GLASSES
  return Array.from({ length: GLASSES }, (_, index) => Math.round(wake + index * gap))
}

/** "دقيقة", "دقيقتين", "5 دقايق", "15 دقيقة". */
export const minutesSaid = (count: number) => (count === 1 ? 'دقيقة' : count === 2 ? 'دقيقتين' : count <= 10 ? `${count} دقايق` : `${count} دقيقة`)

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
  const week = currentWeek(state)
  const resting = (state.restDays ?? []).includes(state.today) || (week !== null && week.workoutsLeft === 0)
  if (inWindow('workout', time) && !trained && !day.excused && !period && !isPainRest(day.periodPain) && !resting) {
    const body = week && week.restLeft > 0
      ? 'ربع ساعة بس وتخلصي 💪 ولو جسمك محتاج راحة، النهارده يتحسب يوم راحة من أيامك 🌙'
      : 'ربع ساعة بس وتخلصي، وبعدها نامي بدري 🌙'
    add({ key: 'workout', title: 'التمرين مستنيكي يا {nick} 💪', body, url: '/#/training' })
  }

  // Pills: each one she takes, at its own time, and once more if she hasn't ticked it.
  for (const pill of pillsOn(state.pills, state.today)) {
    const since = now - minutesOf(pill.time)
    if (since < 0 || since >= PILL_WINDOW_MIN || pillTaken(state.pillDoses, state.today, pill.id)) continue
    add({ key: `pill-${pill.id}`, title: `وقت ${pill.name} يا {nick} 💊`, body: 'خديها دلوقتي ودوسي «خدتها» في البرنامج ✅', url: '/#/pills' })
    if (since >= PILL_AGAIN_MIN && sent.has(`pill-${pill.id}`)) {
      add({ key: `pill-${pill.id}-again`, title: `خدتي ${pill.name}؟ 💊`, body: 'لو خدتيها دوسي «خدتها» عشان مفكّركيش تاني يا {nick} 🤍', url: '/#/pills' })
    }
  }

  // Prayers, from 10 minutes before each one until its points start going down (or the next prayer).
  if (state.prayers !== undefined) {
    const times = prayerTimes(state.today)
    const between = (from: number, until: number) => now >= from && now < until
    if (!prayerFreeDates(state.periods, state.today).has(state.today)) {
      PRAYERS.forEach((prayer, index) => {
        if (prayerLog(state.prayers, state.today, index)) return
        const at = times.prayers[index]
        const end = Math.min(at + ON_TIME_MIN, times.prayers[index + 1] ?? 24 * 60)
        if (between(at - PRAYER_EARLY_MIN, end)) {
          const quotes = index === FAJR ? FAJR_QUOTES : index === ASR ? [...ASR_QUOTES, ...PRAYER_QUOTES] : PRAYER_QUOTES
          add({
            key: `prayer-${index}`,
            title: now < at ? `أذان ${prayer.name} كمان ${minutesSaid(at - now)} ${prayer.emoji}` : `أذّن ${prayer.name} يا {nick} ${prayer.emoji}`,
            body: quoteLine(quoteOfDay(quotes, state.today, index)),
            url: '/#/prayer',
          })
        }
        if (index !== FAJR && between(at + ON_TIME_MIN - PRAYER_NUDGE_MIN, end) && sent.has(`prayer-${index}`)) {
          add({ key: `prayer-${index}-again`, title: `صلّيتي ${prayer.name}؟ 🕌`, body: `لسه ${minutesSaid(PRAYER_NUDGE_MIN)} وتاخدي الـ ${PRAYER_POINTS} نقط كاملين، ودوسي «صليت» يا {nick} 🤍`, url: '/#/prayer' })
        }
      })
    }
    const [, dhuhr, asr, maghrib] = times.prayers
    if (between(Math.max(times.sunrise, dhuhr - MORNING_ADHKAR_BEFORE_DHUHR), dhuhr)) {
      add({ key: 'adhkar-morning', title: 'أذكار الصباح يا {nick} ☀️', body: `خمس دقايق تحفظك طول اليوم 🤍 ${quoteLine(quoteOfDay(DHIKR_QUOTES, state.today))}`, url: '/#/prayer/adhkar' })
    }
    if (between(dhuhr + DHIKR_AFTER_DHUHR, asr)) {
      add({ key: 'dhikr', title: 'ذكر صغير يا {nick} 📿', body: quoteLine(quoteOfDay(DHIKR_QUOTES, state.today, 1)), url: '/#/prayer/adhkar' })
    }
    if (between(asr + EVENING_ADHKAR_AFTER_ASR, maghrib)) {
      add({ key: 'adhkar-evening', title: 'أذكار المسا يا {nick} 🌇', body: 'قبل المغرب، وخلّي آخر يومك ذكر 🤍', url: '/#/prayer/adhkar' })
    }
    if (time >= PRAYER_GIFT_FROM) {
      for (const week of unopenedPrayerGifts(state).filter((item) => addDays(item.end, 1) === state.today)) {
        add({ key: `prayer-gift-${week.start}`, title: 'كسبتي هدية أسبوع الصلاة 🎁', body: `${week.earned} نقطة من ${week.possible} الأسبوع ده، ربنا يتقبّل يا {nick} 🤍 افتحي هديتك`, url: '/#/prayer' })
      }
      for (const week of unopenedBigGifts(state).filter((item) => addDays(item.end, 1) === state.today)) {
        add({ key: `prayer-big-${week.start}`, title: `${BIG_GIFT_WEEKS} أسابيع صلاة ورا بعض 🏆`, body: 'كسبتي الهدية الكبيرة يا {nick}، ربنا يثبّتك 🤍 افتحيها من صفحة الصلاة', url: '/#/prayer' })
      }
    }
  }

  for (const gift of unusedGifts(state).filter((item) => item.createdAt > giftsAfter)) {
    add({ key: `gift-${gift.id}`, title: 'جالك إكسبشن هدية 🍫', body: gift.note ?? 'فيه شوكولاتة مستنياكي في الصفحة الرئيسية 🎁', url: '/#/today' })
  }
  return due
}
