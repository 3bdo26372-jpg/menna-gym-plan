import { CALORIE_FLOOR_KCAL, dayCalories, formatCalories, hasFoodLogged } from './calories'
import { addDays } from './date'
import { formatLitres, waterMl, WATER_TARGET_ML, type FoodEntry } from './food'
import { cycleDay, periodForecast, type CycleDay, type HormonePhase } from './period'
import { NICKNAMES, OVULATION_NICKNAME } from './nicknames'
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
  greenTea: { key: 'greenTea', item: 'شاي أخضر', title: 'كوباية شاي أخضر 🍵', text: 'دلّعي نفسك بكوباية بعد الأكل بساعة يا {nick}، بس مش قبل النوم عشان تنامي زي الكتكوتة 🐥', words: ['شاي اخضر'] },
  ginger: { key: 'ginger', item: 'جنزبيل بالليمون', title: 'جنزبيل دافي بالليمون 🫚', text: 'كوباية دافية تحضنك من جوه وتهدّي التقلصات والانتفاخ يا {nick} 🤍', words: ['جنزبيل', 'زنجبيل'] },
  cinnamon: { key: 'cinnamon', item: 'قرفة', title: 'كوباية قرفة دافية', text: 'دافية ومن غير سكر، وهتهدّي نفسك على الحلو يا {nick} 🤎', words: ['قرفه'] },
  lemon: { key: 'lemon', item: 'ليمون دافي', title: 'ليمون دافي الصبح 🍋', text: 'أول ما تصحي يا {nick}، قبل الفطار. هيصحّيكي ويفتح نفسك للمية ☀️', words: ['ليمون', 'لمون'] },
  chia: { key: 'chia', item: 'بذور شيا بالليمون', title: 'معلقة بذور شيا 🌱', text: 'معلقة في كوباية مية أو ليمون وسيبيها ١٠ دقايق. هتشبّعك وتريّح بطنك يا {nick} 💕', words: ['شيا'] },
  mint: { key: 'mint', item: 'نعناع', title: 'كوباية نعناع 🌿', text: 'كوباية حلوة تخفف الانتفاخ اللي بييجي قبل البريود يا {nick} 🌸', words: ['نعناع'] },
  chamomile: { key: 'chamomile', item: 'كاموميل', title: 'كاموميل قبل النوم 🌼', text: 'كوباية دافية في السرير وتنامي بدري زي الأميرات 👑', words: ['كاموميل', 'بابونج', 'ينسون'] },
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
  period: { emoji: '🌸', title: 'النهارده على قدّك يا {nick}', text: 'أيام البريود جسمك محتاج دلع. حركة خفيفة وإطالة كفاية، ولو فيه وجع سجّليه ونقطك محفوظة 🤍' },
  follicular: { emoji: '💪', title: 'جسمك في أحلى أوقاته يا {nick}', text: 'بعد البريود هرموناتك في صفّك: طاقة أعلى وجسمك بيرتاح أسرع. وريني شطارتك في التمرين النهارده 😍' },
  ovulation: { emoji: '🔥', title: 'أقوى أيامك في الشهر يا {nick}', text: 'طاقتك في القمة الأيام دي. اتحدّي نفسك شوية، بس سخّني كويس الأول يا أشطر حد بيتمرن 🔥' },
  luteal: { emoji: '🧘‍♀️', title: 'كمّلي على راحتك يا {nick}', text: 'التعب والجوع الزيادة الأيام دي طبيعيين خالص من الهرمونات. كمّلي تمرينك، ولو حاسة بتقل اختاري إن طاقتك قليلة والتمرين هيبقى أخف 🤍' },
  premenstrual: { emoji: '🌙', title: 'دلّعي نفسك الأيام دي', text: 'قبل البريود جسمك بيشيل مية، فلو الميزان زاد ده مش دهون خالص يا {nick}. تمرين أخف وملح أقل، وانتي زي الفل 🌙' },
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
    tips.push({ id: 'sleep-log', emoji: '😴', title: 'صباح الفل يا {nick}، نمتي امتى وصحيتي امتى؟', text: 'قوليلي نمتي كويس ولا لأ، عشان نظبط يومك على قد طاقتك 😴' })
  } else if (day?.sleep) {
    const minutes = sleepMinutes(day.sleep)
    if (minutes < (SLEEP_GOAL_HOURS - 1) * 60) {
      tips.push({ id: 'sleep', emoji: '🥱', title: `نمتي ${formatSleep(minutes)} بس يا {nick}`, text: 'النوم القليل بيجوّع وبيتعب. خفّي التمرين لو تعبانة، والنهارده نامي بدري عشان خاطري 🥺' })
    } else if (isLateBedtime(day.sleep)) {
      tips.push({ id: 'sleep', emoji: '🌙', title: `سهرانة لحد ${day.sleep.sleptAt} يا {nick}؟`, text: 'النوم بدري بيظبط الهرمونات والحرق ويخلّي بشرتك أحلى. النهارده نامي قبل ٢، ومن غير شاي أو ريدبول بعد المغرب 🌙' })
    }
  }

  // Weigh and measure only in the calm days after a period, once a cycle.
  if (state.periods && !state.periods.length) {
    tips.push({ id: 'period-log', emoji: '🌸', title: 'قوليلي آخر بريود جالك امتى يا {nick}', text: 'عشان أعرف أنسب أيام للميزان والمقاسات، وإمتى جسمك في أحلى أوقاته للتمرين 🌸', href: '#/period/log' })
  } else if (cycle?.measureDaysLeft) {
    const start = state.periods!.filter((entry) => entry.startDate <= today).at(-1)!.startDate
    const measured = state.measurements.some((entry) => entry.measuredOn >= start && entry.values.weight !== undefined)
    if (!measured) {
      tips.push({
        id: 'measure', emoji: '⚖️',
        title: cycle.measureDaysLeft > 1 ? `وقت الميزان والمقاسات يا {nick}، في ${cycle.measureDaysLeft === 2 ? 'اليومين' : `الـ${cycle.measureDaysLeft} أيام`} الجايين` : 'النهارده آخر يوم حلو للميزان والمقاسات يا {nick}',
        text: 'دي أحلى أيام في الشهر، جسمك مش شايل مية والأرقام هتفرّحك 😍 الصبح بعد الحمام وقبل أي أكل أو شرب، على نفس الميزان، والمازورة على نفس الأماكن.',
        href: '#/measurements/new',
      })
    }
  }

  // Water: catch up after a short day.
  const waterYesterday = waterMl(foodOn(yesterday))
  const waterToday = waterMl(foodOn(today))
  if (waterYesterday < WATER_TARGET_ML && waterToday < WATER_GOAL_ML && state.days.some((item) => item.date === yesterday)) {
    tips.push({
      id: 'water', emoji: '💧', title: 'مية زيادة النهارده يا {nick}',
      text: `امبارح شربتي ${formatLitres(waterYesterday)} لتر بس، فالنهارده عايزين نوصل ${formatLitres(WATER_GOAL_ML)} لتر: كوباية أول ما تصحي وكوباية مع كل أكلة، وبشرتك هتشكرك ✨`,
      href: '#/food/water',
    })
  }

  // Food: eating far too little slows her down, it doesn't help.
  const foodYesterday = foodOn(yesterday)
  if (hasFoodLogged(foodYesterday) && dayCalories(foodYesterday) < CALORIE_FLOOR_KCAL) {
    tips.push({
      id: 'food', emoji: '🍽️', title: 'دلّعي نفسك بأكلة حلوة النهارده',
      text: `امبارح أكلتي حوالي ${formatCalories(dayCalories(foodYesterday))} سعرة بس يا {nick}، وده قليل عليكي. الأكل القليل قوي بيبطّأ الحرق، فكُلي كويس وخلّي فيه بروتين (فراخ، بيض، تونة، زبادي) 🤍`,
      href: '#/food/calories',
    })
  }

  // Training for the phase, until she has trained.
  const trained = (day?.workout?.mainCompletion ?? 0) >= ACTIVE_DAY_MIN_COMPLETION
  if (cycle && !trained && !day?.excused) tips.push({ id: 'train', ...TRAIN[cycle.phase] })

  // One drink for the day; chamomile for a late night.
  const lateNight = hour >= HOUR_DRINK_SWITCH && day?.sleep && isLateBedtime(day.sleep)
  const drink = lateNight ? DRINKS.chamomile : DRINKS[pick(DRINKS_BY_PHASE[cycle?.phase ?? 'unknown'], today)]
  if (!hadDrink(foodOn(today), drink)) tips.push({ id: 'drink', emoji: '🥤', title: `مشروبك النهارده يا {nick}: ${drink.title}`, text: drink.text, drink })

  // A different nickname on each tip, rotating day by day; around ovulation she is قلب دادي.
  const seed = [...today].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return tips.slice(0, MAX_TIPS).map((tip, index) => {
    const nick = cycle?.phase === 'ovulation' ? OVULATION_NICKNAME : NICKNAMES[(seed + index) % NICKNAMES.length]
    const named = (text: string) => text.replaceAll('{nick}', nick)
    return { ...tip, title: named(tip.title), text: named(tip.text), ...(tip.drink && { drink: { ...tip.drink, title: named(tip.drink.title), text: named(tip.drink.text) } }) }
  })
}
