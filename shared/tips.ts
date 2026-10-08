import { CALORIE_FLOOR_KCAL, dayCalories, formatCalories, hasFoodLogged } from './calories'
import { addDays } from './date'
import { formatLitres, waterMl, WATER_TARGET_ML, type FoodEntry } from './food'
import { cycleDay, periodForecast, type CycleDay, type HormonePhase } from './period'
import { WATER_GOAL_ML } from './points'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import { formatSleep, isLateBedtime, sleepMinutes, SLEEP_GOAL_HOURS } from './sleep'
import type { AppState } from './types'

/**
 * طلبات النهارده: a few small, realistic asks for today on the home page,
 * picked from what she logged and where she is in her cycle:
 * - log last night's sleep, or a note on it when it was short or late
 * - weigh and measure, only in the days after a period when the body holds
 *   the least water (once a cycle), so the numbers are fair to her
 * - more water when yesterday was short
 * - eat enough when yesterday was far under the floor
 * - how to train for the phase she is in
 * - one drink for the day, matched to the phase
 * Tips that are done (sleep logged, measurement saved, drink logged, water
 * reached) drop off by themselves.
 */
export type TipId = 'sleep-log' | 'sleep' | 'measure' | 'period-log' | 'water' | 'food' | 'train' | 'drink'

export interface Tip {
  id: TipId
  emoji: string
  title: string
  text: string
  href?: string
  /** A drink she can log with one tap. */
  drink?: Drink
}

export interface Drink {
  key: string
  /** What gets logged as a drink. */
  item: string
  title: string
  text: string
  /** Words that mean she already had it today. */
  words: string[]
}

export const DRINKS: Record<string, Drink> = {
  greenTea: { key: 'greenTea', item: 'شاي أخضر', title: 'كوباية شاي أخضر 🍵', text: 'بعد الأكل بساعة، مش جنبه عشان الحديد، ومش قبل النوم.', words: ['شاي اخضر'] },
  ginger: { key: 'ginger', item: 'جنزبيل بالليمون', title: 'جنزبيل دافي بالليمون 🫚', text: 'بيهدّي التقلصات والانتفاخ، ومن غير سكر.', words: ['جنزبيل', 'زنجبيل'] },
  cinnamon: { key: 'cinnamon', item: 'قرفة', title: 'كوباية قرفة دافية', text: 'من غير سكر، بتهدّي نفسك على الحلو.', words: ['قرفه'] },
  lemon: { key: 'lemon', item: 'ليمون دافي', title: 'ليمون دافي الصبح 🍋', text: 'أول ما تصحي وقبل الفطار، بيصحّيكي ويفتح نفسك للمية.', words: ['ليمون', 'لمون'] },
  chia: { key: 'chia', item: 'بذور شيا بالليمون', title: 'معلقة بذور شيا 🌱', text: 'في كوباية مية أو ليمون، وسيبيها ١٠ دقايق. بتشبّعك وكويسة للهضم.', words: ['شيا'] },
  mint: { key: 'mint', item: 'نعناع', title: 'كوباية نعناع 🌿', text: 'بتخفف الانتفاخ اللي بييجي قبل البريود.', words: ['نعناع'] },
  chamomile: { key: 'chamomile', item: 'كاموميل', title: 'كاموميل قبل النوم 🌼', text: 'بيهدّي وبيساعدك تنامي بدري.', words: ['كاموميل', 'بابونج', 'ينسون'] },
}

const DRINKS_BY_PHASE: Record<HormonePhase | 'unknown', string[]> = {
  period: ['ginger', 'cinnamon', 'chamomile'],
  follicular: ['greenTea', 'lemon', 'chia'],
  ovulation: ['greenTea', 'chia', 'lemon'],
  luteal: ['cinnamon', 'chia', 'greenTea'],
  premenstrual: ['mint', 'ginger', 'chamomile'],
  unknown: ['greenTea', 'ginger', 'cinnamon', 'lemon', 'chia'],
}

const TRAIN: Record<HormonePhase, { emoji: string; title: string; text: string }> = {
  period: { emoji: '🌸', title: 'تمرين على قدّك', text: 'أيام البريود الطاقة والحديد أقل. حركة خفيفة وإطالة كفاية، ولو فيه وجع سجّليه.' },
  follicular: { emoji: '💪', title: 'وقت ممتاز للتمرين', text: 'بعد البريود هرموناتك في صالحك: طاقة أعلى وجسمك بيستشفى أسرع. ادّي التمرين حقه النهارده.' },
  ovulation: { emoji: '🔥', title: 'أقوى أيامك في الشهر', text: 'طاقتك في القمة الأيام دي. تمرين بشدة عادية وتحدّي نفسك شوية، بس سخّني كويس.' },
  luteal: { emoji: '🧘‍♀️', title: 'كمّلي بالراحة', text: 'التعب والجوع الزيادة الأيام دي طبيعيين من الهرمونات. كمّلي تمرينك، ولو حاسة بتقل اختاري إن طاقتك قليلة.' },
  premenstrual: { emoji: '🌙', title: 'خفّي على نفسك', text: 'قبل البريود جسمك بيشيل مية، فالميزان بيزيد وده مش دهون. تمرين أخف، وقلّلي الملح.' },
}

const HOUR_DRINK_SWITCH = 20
/** More than this feels like nagging; the most pressing ones come first. */
export const MAX_TIPS = 5

/** Stable pick for the day, so the same day keeps the same drink. */
function pick<T>(list: T[], date: string) {
  const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return list[seed % list.length]
}

/** Lowercase and fold Arabic letter variants so "شاي أخضر" matches "شاى اخضر". */
export const normalize = (text: string) => text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')

export function hadDrink(entries: Pick<FoodEntry, 'item'>[], drink: Drink) {
  return entries.some((entry) => drink.words.some((word) => normalize(entry.item).includes(normalize(word))))
}

export function dailyTips(state: AppState, hour: number): Tip[] {
  const tips: Tip[] = []
  const { today } = state
  const yesterday = addDays(today, -1)
  const day = state.days.find((item) => item.date === today)
  const foodOn = (date: string) => state.foodEntries.filter((entry) => entry.date === date)
  const cycle: CycleDay | null = state.periods ? cycleDay(periodForecast(state.periods, today), today) : null

  // Sleep: ask in the morning; once logged, a word only when it was short or late.
  if (day && day.sleep === null) {
    tips.push({ id: 'sleep-log', emoji: '😴', title: 'نمتي امتى وصحيتي امتى؟', text: 'سجّلي نومك عشان نتابعه مع هرموناتك وطاقتك.' })
  } else if (day?.sleep) {
    const minutes = sleepMinutes(day.sleep)
    if (minutes < (SLEEP_GOAL_HOURS - 1) * 60) {
      tips.push({ id: 'sleep', emoji: '🥱', title: `نمتي ${formatSleep(minutes)} بس`, text: 'النوم القليل بيزوّد الجوع وبيقلّل الطاقة. خفّي التمرين لو تعبانة، وحاولي تنامي بدري النهارده.' })
    } else if (isLateBedtime(day.sleep)) {
      tips.push({ id: 'sleep', emoji: '🌙', title: `نمتي الساعة ${day.sleep.sleptAt}`, text: 'النوم بدري بيظبط الهرمونات والحرق. حاولي النهارده قبل ٢، ومن غير شاي أو ريدبول بعد المغرب.' })
    }
  }

  // Weigh and measure only in the calm days after a period, once a cycle.
  if (state.periods && !state.periods.length) {
    tips.push({ id: 'period-log', emoji: '🌸', title: 'سجّلي آخر بريود', text: 'عشان أعرف أنسب يوم تتوزني فيه وإمتى جسمك في أحسن وقت للتمرين.', href: '#/period/log' })
  } else if (cycle?.measureDaysLeft) {
    const start = state.periods!.filter((entry) => entry.startDate <= today).at(-1)!.startDate
    const measured = state.measurements.some((entry) => entry.measuredOn >= start && entry.values.weight !== undefined)
    if (!measured) {
      tips.push({
        id: 'measure', emoji: '⚖️',
        title: cycle.measureDaysLeft > 1 ? `اتوزني وخدي مقاساتك خلال ${cycle.measureDaysLeft === 2 ? 'يومين' : `${cycle.measureDaysLeft} أيام`}` : 'النهارده آخر يوم حلو للوزن والمقاسات',
        text: 'دي أحسن أيام في الشهر: الجسم مش شايل مية. الصبح بعد الحمام وقبل أي أكل أو شرب، على نفس الميزان، والمازورة على نفس الأماكن.',
        href: '#/measurements/new',
      })
    }
  }

  // Water: catch up after a short day.
  const waterYesterday = waterMl(foodOn(yesterday))
  const waterToday = waterMl(foodOn(today))
  if (waterYesterday < WATER_TARGET_ML && waterToday < WATER_GOAL_ML && state.days.some((item) => item.date === yesterday)) {
    tips.push({
      id: 'water', emoji: '💧', title: 'اشربي مية زيادة النهارده',
      text: `امبارح شربتي ${formatLitres(waterYesterday)} لتر بس. النهارده خلّيها ${formatLitres(WATER_GOAL_ML)} لتر: كوباية أول ما تصحي وكوباية مع كل أكلة.`,
      href: '#/food/water',
    })
  }

  // Food: eating far too little slows her down, it doesn't help.
  const foodYesterday = foodOn(yesterday)
  if (hasFoodLogged(foodYesterday) && dayCalories(foodYesterday) < CALORIE_FLOOR_KCAL) {
    tips.push({
      id: 'food', emoji: '🍽️', title: 'كُلي كويس النهارده',
      text: `امبارح أكلتي حوالي ${formatCalories(dayCalories(foodYesterday))} سعرة بس. الأكل القليل قوي بيبطّأ الحرق، فخلّي فيه بروتين (فراخ، بيض، تونة، زبادي) في كل وجبة.`,
      href: '#/food/calories',
    })
  }

  // Training for the phase, until she has trained.
  const trained = (day?.workout?.mainCompletion ?? 0) >= ACTIVE_DAY_MIN_COMPLETION
  if (cycle && !trained && !day?.excused) tips.push({ id: 'train', ...TRAIN[cycle.phase] })

  // One drink for the day; chamomile for a late night.
  const lateNight = hour >= HOUR_DRINK_SWITCH && day?.sleep && isLateBedtime(day.sleep)
  const drink = lateNight ? DRINKS.chamomile : DRINKS[pick(DRINKS_BY_PHASE[cycle?.phase ?? 'unknown'], today)]
  if (!hadDrink(foodOn(today), drink)) tips.push({ id: 'drink', emoji: '🥤', title: `مشروب النهارده: ${drink.title}`, text: drink.text, drink })

  return tips.slice(0, MAX_TIPS)
}
