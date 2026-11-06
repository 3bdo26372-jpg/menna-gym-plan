import { CALORIE_FLOOR_KCAL, calorieRange, dayCalories, hasFoodLogged, roundCalories } from './calories'
import { addDays } from './date'
import { formatLitres, waterMl, WATER_TARGET_ML } from './food'
import { NICKNAMES, withNickname } from './nicknames'
import { isPainRest } from './period'
import { pillsOn, pillTaken } from './pills'
import { WATER_GOAL_ML } from './points'
import { PRAYERS, prayerFreeDates, prayerLog } from './prayer'
import { DAY_TYPE_LABEL } from './program'
import type { AppState } from './types'
import { currentWeek, followsWeeklyPlan, trainingWeek, weekIndexFor, weekInput, type TrainingWeek, type WeekDayKind } from './week'

/**
 * Yesterday in a few lines, on the home page every morning: what went well,
 * and for whatever was left out, one small thing to do today. It never says
 * she fell short: what is missing is put as the next easy step, and it always
 * ends by cheering her on.
 */
export interface Recap {
  date: string
  /** What she did, as short chips. */
  done: string[]
  /** What was left out, each with a small step for today (3 at most). */
  next: string[]
  /** The cheer it ends on. */
  cheer: string
  /** Nothing was left out. */
  perfect: boolean
}

const MAX_NEXT = 3
const GLASS_ML = 250

const glasses = (count: number) => (count === 1 ? 'كوباية واحدة' : count === 2 ? 'كوبايتين' : `${count} كوبايات`)
const workouts = (count: number) => (count === 1 ? 'تمرين واحد' : count === 2 ? 'تمرينين' : `${count} تمارين`)
const days = (count: number) => (count === 1 ? 'يوم واحد' : count === 2 ? 'يومين' : `${count} أيام`)

const CHEERS = [
  'النهارده يوم جديد، وإنتي قدّه يا {nick} 🤍',
  'خطوة صغيرة كل يوم بتعمل فرق كبير يا {nick} ✨',
  'إحنا مع بعض، واحدة واحدة يا {nick} 🌸',
  'كل حاجة بتعمليها بتتحسب يا {nick}، كمّلي 💪',
  'بابا فخور بيكي يا {nick} 🤍',
]
const PERFECT_CHEERS = [
  'يوم كامل! كمّلي كده يا {nick} 🌟',
  'إيه الجمال ده يا {nick}! يوم مفيهوش غلطة 🎉',
  'برافو يا {nick}، ده يوم يتصور 📸🤍',
]

const pick = <T>(list: readonly T[], date: string) => list[[...date].reduce((sum, char) => sum + char.charCodeAt(0), 0) % list.length]

function workoutPart(state: AppState, date: string, kind: WeekDayKind | undefined, now: TrainingWeek | null, done: string[], next: string[]) {
  const day = state.days.find((item) => item.date === date)
  if (!day) return
  const completion = day.workout?.mainCompletion ?? 0
  if (day.workout && completion >= 1) {
    done.push(`تمرين ${DAY_TYPE_LABEL[day.workout.dayType]} كامل 💪`)
    if (!day.feedback) next.push('تقييم تمرين امبارح لسه مستنيكي، دقيقة واحدة والتمرين الجاي يبقى على مقاسك')
    return
  }
  if (day.workout && completion >= 0.5) {
    done.push(`${Math.round(completion * 100)}% من التمرين 💪`)
    next.push('عملتي أكتر من نص التمرين، والمرة الجاية نكمّله للآخر سوا')
    return
  }
  if (kind === 'period' || isPainRest(day.periodPain)) return void done.push('يوم راحة البريود 🌸')
  if (day.excused) return void done.push('اليوم اتقفل بالإكسبشن 🎟️')
  if (kind === 'rest') return void done.push('يوم راحة من حقك 🌙')
  // A missed workout. Her rest days are used up by then, so don't count what's
  // left against the week's goal: every workout still to come is a win.
  if (now && now.startDate === state.today) {
    next.push(`التمرين مالحقش امبارح، ولا يهمك: النهارده أسبوع جديد، ${workouts(now.target)} تختاري أيامهم براحتك`)
  } else if (now && now.daysLeft > 0) {
    next.push(`التمرين مالحقش امبارح، ولا يهمك 🤍 فاضل في الأسبوع ${days(now.daysLeft)}، وكل تمرين فيهم مكسب`)
  } else {
    next.push('التمرين مالحقش امبارح، ولا يهمك: ربع ساعة النهارده تكفي، ولو عملتي نصه بيتحسب')
  }
}

function waterPart(ml: number, done: string[], next: string[]) {
  if (ml >= WATER_TARGET_ML) return void done.push(`${formatLitres(ml)} لتر مية 💧${ml >= WATER_GOAL_ML ? '🏆' : ''}`)
  const short = Math.ceil((WATER_TARGET_ML - ml) / GLASS_ML)
  next.push(ml > 0
    ? `شربتي ${formatLitres(ml)} لتر، و${glasses(short)} كمان كانوا هيوصّلوكي ٢ لتر. النهارده ابدئي بكوباية أول ما تصحي 💧`
    : 'المية ماتسجلتش امبارح. النهارده كوباية أول ما تصحي، وسجّليها أول بأول 💧')
}

function foodPart(state: AppState, date: string, dayNumber: number, done: string[], next: string[]) {
  const entries = state.foodEntries.filter((entry) => entry.date === date)
  if (!hasFoodLogged(entries)) {
    next.push('الأكل ماتسجلش امبارح. النهارده سجّلي كل وجبة بعد ما تاكليها، عشان نحسب السعرات صح')
    return
  }
  const kcal = dayCalories(entries)
  const range = calorieRange(dayNumber)
  const rounded = roundCalories(kcal)
  if (kcal < CALORIE_FLOOR_KCAL) {
    next.push(`أكلتي حوالي ${rounded} سعرة، وجسمك محتاج ١٢٠٠ على الأقل عشان يحرق صح. النهارده متفوّتيش وجبة 🍽️`)
  } else if (rounded > range.max) {
    next.push(`السعرات عدّت الحد بحوالي ${rounded - range.max}، عادي يوم. النهارده خلّي وجبة منهم أخف شوية`)
  } else {
    done.push('أكل في الرينج 🍽️')
  }
}

function pillsPart(state: AppState, date: string, done: string[], next: string[]) {
  const pills = pillsOn(state.pills, date)
  if (!pills.length) return
  const missing = pills.filter((pill) => !pillTaken(state.pillDoses, date, pill.id))
  if (!missing.length) done.push(pills.length === 1 ? `${pills[0].name} 💊` : 'البرشام كله 💊')
  else next.push(`${missing.map((pill) => pill.name).join(' و')} ماتعلّمتش امبارح. النهارده دوسي «خدتها» أول ما تاخديها 💊`)
}

function prayerPart(state: AppState, date: string, done: string[], next: string[]) {
  if (state.prayers === undefined || prayerFreeDates(state.periods, state.today).has(date)) return
  const prayed = PRAYERS.filter((_, index) => prayerLog(state.prayers, date, index)).length
  if (prayed === PRAYERS.length) done.push('الصلوات الخمسة 🕌')
  else next.push(prayed ? `${prayed} من ${PRAYERS.length} صلوات متسجلين، ربنا يتقبّل 🤍 النهارده نحاول نوصل للخمسة` : 'الصلوات ماتسجلتش امبارح. النهارده دوسي «صليت» بعد كل صلاة، ربنا يتقبّل 🤍')
}

/** The recap of the day before today, or null on the first day of the program. */
export function yesterdayRecap(state: AppState): Recap | null {
  const date = addDays(state.today, -1)
  const day = state.days.find((item) => item.date === date)
  const input = weekInput(state)
  if (!day || !input) return null
  // Yesterday's own week says what kind of day it was; this week says what is left.
  const kind = followsWeeklyPlan(input.startDate, date)
    ? trainingWeek(input, weekIndexFor(input.startDate, date)).days.find((item) => item.date === date)?.kind
    : undefined
  const done: string[] = []
  const next: string[] = []
  workoutPart(state, date, kind, currentWeek(state), done, next)
  waterPart(waterMl(state.foodEntries.filter((entry) => entry.date === date)), done, next)
  foodPart(state, date, day.dayNumber, done, next)
  pillsPart(state, date, done, next)
  prayerPart(state, date, done, next)
  const nick = pick(NICKNAMES, date)
  const perfect = next.length === 0
  return {
    date,
    done,
    next: next.slice(0, MAX_NEXT),
    cheer: withNickname(pick(perfect ? PERFECT_CHEERS : CHEERS, state.today), nick),
    perfect,
  }
}
