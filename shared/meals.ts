import { addDays } from './date'
import { FOOD_CATEGORIES, type FoodCategory, type FoodEntry } from './food'
import { normalize } from './tips'
import type { PeriodEntry } from './period'

/**
 * Meal ideas she can pick from, a few at a time per meal; "اختيارات تانية"
 * shows the next few. Simple, filling home food, nothing to weigh or count.
 */
export type MealCategory = Exclude<FoodCategory, 'drink'>

export interface MealIdea {
  emoji: string
  /** What gets logged when she eats it. */
  item: string
  /** Something she logged herself before. */
  mine?: boolean
}

const idea = (emoji: string, item: string): MealIdea => ({ emoji, item })

export const MEAL_IDEAS: Record<MealCategory, MealIdea[]> = {
  breakfast: [
    idea('🥚', 'بيضتين مسلوقين ونص رغيف عيش بلدي وخيار وطماطم'),
    idea('🫘', 'فول بزيت زيتون ونص رغيف عيش بلدي وسلطة'),
    idea('🥣', 'شوفان باللبن وموزة ومعلقة عسل'),
    idea('🧀', 'جبنة قريش بالطماطم وعيش توست'),
    idea('🍳', 'أومليت بالخضار وتوست'),
    idea('🥛', 'زبادي بالشوفان والفراولة'),
    idea('🧆', 'طعمية 2 ونص رغيف عيش بلدي وسلطة'),
    idea('🥪', 'سندوتش تونة بالخضار في عيش توست'),
  ],
  lunch: [
    idea('🍗', 'صدر فراخ مشوي وطبق رز صغير وسلطة'),
    idea('🐟', 'سمك مشوي وطبق رز صغير وسلطة'),
    idea('🍢', 'كفتة مشوية وخضار سوتيه ونص رغيف'),
    idea('🍝', 'طبق مكرونة صغير بصدر فراخ وصلصة'),
    idea('🥘', 'خضار باللحمة وطبق رز صغير'),
    idea('🥗', 'تونة بالسلطة ونص رغيف عيش بلدي'),
    idea('🍲', 'ملوخية وفراخ مسلوقة وطبق رز صغير'),
    idea('🌯', 'شيش طاووق بالخضار في عيش شامي'),
  ],
  dinner: [
    idea('🥒', 'زبادي وخيار'),
    idea('🧀', 'جبنة قريش وخيار ونص رغيف'),
    idea('🍳', 'بيضتين وسلطة خضرا'),
    idea('🥗', 'تونة وسلطة خضرا'),
    idea('🍵', 'شوربة خضار وصدر فراخ'),
    idea('🫘', 'فول وسلطة'),
    idea('🥛', 'كوباية لبن وموزة'),
  ],
  snack: [
    idea('🍎', 'تفاحة'),
    idea('🍌', 'موزة'),
    idea('🍯', 'زبادي بالعسل'),
    idea('🌰', 'حفنة لب أبيض'),
    idea('🥕', 'خيار وجزر'),
    idea('🍊', 'برتقالة'),
    idea('🥛', 'كوباية لبن'),
    idea('🍓', 'طبق فراولة'),
  ],
}

export const IDEAS_SHOWN = 3

/** The most her own meals can fill of the list, so a few new ideas still show. */
const MAX_MINE = 6

/**
 * Meals she already ate for this meal, most often first (then most recent),
 * leaving out fast food and sugary drinks: she picks from food she likes.
 */
export function mealsFromHistory(entries: Pick<FoodEntry, 'date' | 'time' | 'category' | 'item'>[], category: MealCategory): MealIdea[] {
  const emoji = FOOD_CATEGORIES.find((item) => item.id === category)?.emoji ?? '🍽️'
  const seen = new Map<string, { item: string; count: number; last: string }>()
  for (const entry of entries) {
    if (entry.category !== category || mentions(entry, JUNK) || mentions(entry, SUGARY)) continue
    const item = entry.item.trim()
    if (item.length < 2) continue
    const key = normalize(item).replace(/\s+/g, ' ')
    const when = `${entry.date} ${entry.time}`
    const known = seen.get(key)
    if (known) {
      known.count += 1
      if (when > known.last) known.last = when
    } else seen.set(key, { item, count: 1, last: when })
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, MAX_MINE)
    .map(({ item }) => ({ emoji, item, mine: true }))
}

/**
 * The `round`-th set of ideas for a meal: her own meals first, then the
 * suggestions she hasn't had; it wraps around once all were shown.
 */
export function mealIdeas(category: MealCategory, round: number, history: Pick<FoodEntry, 'date' | 'time' | 'category' | 'item'>[] = []): MealIdea[] {
  const mine = mealsFromHistory(history, category)
  const taken = new Set(mine.map((meal) => normalize(meal.item)))
  const list = [...mine, ...MEAL_IDEAS[category].filter((meal) => !taken.has(normalize(meal.item)))]
  const first = (round * IDEAS_SHOWN) % list.length
  return Array.from({ length: Math.min(IDEAS_SHOWN, list.length) }, (_, index) => list[(first + index) % list.length])
}

/** The meal that suits this Cairo hour. */
export function mealForHour(hour: number): MealCategory {
  if (hour >= 5 && hour < 13) return 'breakfast'
  if (hour >= 13 && hour < 18) return 'lunch'
  return 'dinner'
}

/**
 * "صفحة جديدة": the days right after she marks a period as ended. The card
 * shows from the day after the end for this many days, until she dismisses it.
 */
export const NEW_PAGE_DAYS = 7
/** The food review looks back over this many days before today. */
export const REVIEW_DAYS = 10

export function newPagePeriod(periods: PeriodEntry[] | undefined, today: string) {
  const last = [...(periods ?? [])].filter((entry) => entry.startDate <= today).sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1)
  if (!last?.endDate || today <= last.endDate || today > addDays(last.endDate, NEW_PAGE_DAYS)) return null
  return last
}

const JUNK = ['اندومي', 'اندومى', 'برجر', 'بيرجر', 'شيبسي', 'شيتوس', 'مولتو', 'هوهوز', 'كراتيه', 'بيتزا', 'كنتاكي', 'سجق', 'سوسيس', 'لانشون', 'استريس', 'ستربس', 'استربس', 'كرسبي', 'شاورما', 'حواوشي']
const SUGARY = ['ريدبول', 'ريد بول', 'شويبس', 'بيبسي', 'كوكا', 'سفن اب', 'اسبرايت', 'فانتا', 'مونستر']
const VEG = ['سلطه', 'سلاطه', 'خيار', 'طماطم', 'خس', 'جزر', 'خضار', 'خضروات', 'بسله', 'فاصوليا', 'باميه', 'ملوخيه', 'سبانخ', 'كوسه', 'بروكلي', 'فلفل', 'مسقعه']
/** Before this hour a meal belongs to the night before. */
const DAY_STARTS = '05:00'
/** A first meal from this time on is late. */
const LATE_FIRST_MEAL = '15:00'

const mentions = (entry: Pick<FoodEntry, 'item'>, words: string[]) => words.some((word) => normalize(entry.item).includes(normalize(word)))

export interface FoodReview {
  /** Fast food and packaged snacks. */
  junk: number
  /** Energy drinks and sugary sodas. */
  sugary: number
  /** Days whose first meal came after mid-afternoon. */
  lateFirstMeal: number
  /** Days with nothing eaten logged. */
  emptyDays: number
  /** Meals with any vegetables in them. */
  veg: number
  days: number
}

/** How she ate over the days before today, for the "صفحة جديدة" card. */
export function foodReview(entries: FoodEntry[], dates: string[]): FoodReview {
  const review: FoodReview = { junk: 0, sugary: 0, lateFirstMeal: 0, emptyDays: 0, veg: 0, days: dates.length }
  for (const date of dates) {
    const day = entries.filter((entry) => entry.date === date)
    const meals = day.filter((entry) => entry.category !== 'drink')
    if (!meals.length) review.emptyDays += 1
    review.junk += meals.filter((entry) => mentions(entry, JUNK)).length
    review.sugary += day.filter((entry) => mentions(entry, SUGARY)).length
    review.veg += meals.filter((entry) => mentions(entry, VEG)).length
    const first = meals.map((entry) => entry.time).filter((time) => time >= DAY_STARTS).sort()[0]
    if (first && first >= LATE_FIRST_MEAL) review.lateFirstMeal += 1
  }
  return review
}

/** "مرة", "مرتين", "3 مرات", "11 مرة". */
export function times(count: number) {
  if (count === 1) return 'مرة'
  if (count === 2) return 'مرتين'
  return `${count} ${count >= 3 && count <= 10 ? 'مرات' : 'مرة'}`
}

/** "يوم", "يومين", "3 أيام", "11 يوم". */
const dayCount = (days: number) => (days === 1 ? 'يوم' : days === 2 ? 'يومين' : `${days} ${days >= 3 && days <= 10 ? 'أيام' : 'يوم'}`)

/** Gentle notes on what to change, most important first; empty when she ate well. */
export function foodNotes(review: FoodReview): string[] {
  const notes: string[] = []
  if (review.junk >= 2) notes.push(`الإندومي والأكل الجاهز اتكرروا ${times(review.junk)} في الأيام اللي فاتت. دول بيجوّعوا بسرعة وبيشيلوا ملح ومية في الجسم 🙈`)
  if (review.sugary >= 1) notes.push('والريدبول والحاجة الساقعة بالسكر بيبوظوا النوم والحرق، خليهم برّه الصفحة الجديدة 🥤🚫')
  if (review.lateFirstMeal >= 2) notes.push(`أول أكلة كانت بتيجي بعد العصر في ${dayCount(review.lateFirstMeal)}، فبتجوعي جامد بالليل وتاكلي أي حاجة. عايزين أول أكلة قبل ٢ الضهر ☀️`)
  if (review.emptyDays >= 1) notes.push(`وفيه ${dayCount(review.emptyDays)} مفيهمش أكل متسجل خالص. سجّلي وانتي بتاكلي، مش آخر الليل 📝`)
  if (review.veg === 0 && review.days - review.emptyDays > 0) notes.push('ومفيش خضار خالص! طبق سلطة صغير مع الغدا هيفرق جامد 🥒')
  return notes
}
