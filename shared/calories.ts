import { isWater, type FoodCategory, type FoodEntry } from './food'

/**
 * Rough calories from what she already writes in the food log, so she never
 * counts anything. It spots common (mostly Egyptian) foods in the text, reads
 * simple amounts ("2 توست", "رغيفين ونص", "نص معلقة عسل", "دبوسين"), and falls
 * back to a typical meal size when it recognises nothing. The app only shows
 * rounded daily totals and averages, never per-item numbers.
 */
interface Food {
  id: string
  /** Spellings, one or more words each. */
  names: string[]
  /** Dual forms ("رغيفين") that mean two of it. */
  duals?: string[]
  /** Calories for one typical portion when no amount is written. */
  portion: number
  /** Calories per counted piece ("3 طعمية"), when that differs from a portion. */
  each?: number
  /** Foods in the same group written together ("كيس كراتيه فلامنكو") are one item. */
  group?: string
  /** Vaguer names ("كيكة", "سندوتش") that step aside for a more specific food in the same group. */
  generic?: boolean
  drink?: boolean
  /** Soft drinks: "دايت" or "زيرو" makes them zero. */
  soda?: boolean
}

/** Fruit names, also used for "عصير <fruit>", which is one juice rather than juice plus fruit. */
const FRUIT_NAMES = 'موز|موزه|تفاح|تفاحه|برتقال|برتقاله|يوسفي|فراوله|عنب|مانجا|مانجو|بطيخ|كنتالوب|جوافه|خوخ|كيوي|لمون|ليمون'.split('|')

const food = (id: string, names: string, portion: number, extra: Partial<Food> = {}): Food =>
  ({ id, names: names.split('|'), portion, ...extra })

const FOODS: Food[] = [
  // Bread and staples
  food('bread', 'عيش|رغيف|خبز|عيش بلدي', 250, { group: 'bread', duals: ['رغيفين', 'رغفين', 'عيشين'] }),
  food('toast', 'عيش توست|توست|toast', 150, { each: 75, group: 'bread' }),
  food('fino', 'عيش فينو|فينو', 200, { group: 'bread' }),
  food('shami', 'عيش شامي|شامي', 170, { group: 'bread' }),
  food('croissant', 'كرواسون|كرواسان|croissant', 250, { group: 'bread' }),
  food('sandwich', 'سندوتش|ساندوتش|سندويتش|ساندويتش|سندوتشات|ساندوتشات|سندويتشات|sandwich|sandwiches', 250, { group: 'bread', generic: true }),
  food('oats', 'شوفان|oats|oatmeal', 250),
  food('cereal', 'كورن فليكس|كورنفليكس|سيريال|cornflakes|cereal', 200),
  food('rice', 'رز|ارز|rice', 250),
  food('pasta', 'مكرونه|مكرونة|باستا|اسباجتي|سباجتي|pasta|spaghetti', 400),
  food('bechamel', 'مكرونه بشاميل|بشاميل', 550),
  food('koshari', 'كشري', 700),
  food('potatoes', 'بطاطس|بطاطا|potato|potatoes', 300),
  food('fries', 'بطاطس فرنساوي|بطاطس محمره|فرايز|fries', 350),
  food('boiledPotatoes', 'بطاطس مسلوقه|بيوريه', 150),
  food('pizza', 'بيتزا|pizza', 600, { each: 250 }),
  food('feteer', 'فطير|فطيره|رقاق', 500),
  // Eggs, beans, meat, fish
  food('egg', 'بيض|بيضه|egg|eggs', 160, { each: 80, duals: ['بيضتين'] }),
  food('omelette', 'اومليت|اوملت|omelette|omelet', 220),
  food('shakshuka', 'شكشوكه|shakshuka', 300),
  food('foul', 'فول|foul', 250),
  food('falafel', 'طعميه|فلافل|falafel', 250, { each: 60 }),
  food('chicken', 'فراخ|فرخه|دجاج|chicken', 300, { group: 'chicken', generic: true }),
  food('chickenBreast', 'صدر فراخ|صدور فراخ|صدور|صدر', 250, { group: 'chicken' }),
  food('pane', 'بانيه', 350, { each: 175, group: 'chicken' }),
  food('shish', 'شيش|طاووق|شيش طاووق', 300, { group: 'chicken' }),
  food('friedChicken', 'كنتاكي|كرسبي|kfc|فراخ مقليه|دبوس|دبابيس', 380, { each: 190, group: 'chicken', duals: ['دبوسين'] }),
  food('cordonBleu', 'كوردن بلو|كوردون بلو|cordon bleu', 450),
  food('meat', 'لحمه|لحم|ستيك|steak|beef', 350),
  food('kofta', 'كفته|كفتة', 300),
  food('burger', 'برجر|بيرجر|هامبرجر|burger', 500),
  food('shawarma', 'شاورما|shawarma', 550),
  food('hawawshi', 'حواوشي', 600),
  food('liver', 'كبده', 350),
  food('sausage', 'سجق|سوسيس', 300),
  food('coldCuts', 'لانشون|لانشن|بسطرمه|بسطرمة|تركي مدخن', 120),
  food('tuna', 'تونه|tuna', 200),
  food('fish', 'سمك|fish', 300),
  food('shrimp', 'جمبري|shrimp', 200),
  // Cooked dishes and sides
  food('mahshi', 'محشي', 400),
  food('molokhia', 'ملوخيه', 150),
  food('stew', 'باميه|بامية|فاصوليا|بسله|خضار|خضروات|مسقعه|stew', 200),
  food('salad', 'سلطه|سلطة|salad', 60),
  food('tahini', 'طحينه|طحينة', 180),
  food('babaGhanoush', 'بابا غنوج|باباغنوج', 150),
  food('soup', 'شوربه|شوربة|soup', 150),
  food('lentils', 'عدس', 250),
  // Dairy
  food('cheese', 'جبن|جبنه|cheese', 100, { group: 'cheese', generic: true }),
  food('roumi', 'جبن رومي|جبنه رومي|رومي', 110, { group: 'cheese' }),
  food('cheddar', 'شيدر|شيدار|cheddar', 110, { group: 'cheese' }),
  food('whiteCheese', 'جبنه بيضا|جبنه بيضاء|جبنه حادقه|جبن حادق|حادقه|دمياطي|فيتا|feta|اسطنبولي', 80, { group: 'cheese' }),
  food('cottage', 'قريش|جبنه قريش', 60, { group: 'cheese' }),
  food('mozzarella', 'موتزاريلا|موزاريلا|موتزريلا|mozzarella', 90, { group: 'cheese' }),
  food('cheeseTriangle', 'كيري|مثلث|مثلثات|نستو', 50, { group: 'cheese' }),
  food('labneh', 'لبنه', 100),
  food('yogurt', 'زبادي|yogurt|yoghurt', 100),
  // Sweets and snacks
  food('cake', 'كيك|كيكه|cake', 250, { group: 'sweet', generic: true }),
  food('hohos', 'هوهوز|هوهو|توينكيز|twinkies|تودو|توتو', 190, { group: 'sweet' }),
  food('chocolate', 'شوكولاته|شوكولاتة|شيكولاته|chocolate|تويكس|twix|كيت كات|كيتكات|جلاكسي|سنيكرز|مارس|كادبوري|مولتو', 220, { group: 'sweet' }),
  food('biscuits', 'بسكويت|بسكوت|biscuits|cookies|كوكيز', 150, { group: 'sweet' }),
  food('orientalSweets', 'كنافه|بسبوسه|قطايف|جاتوه|دونات|donut|بلح الشام|كحك', 350, { group: 'sweet' }),
  food('iceCream', 'ايس كريم|ايسكريم|جيلاتي|ice cream', 200, { group: 'sweet' }),
  food('milkDessert', 'رز بلبن|ارز بلبن|مهلبيه|مهلبية|بودنج|pudding', 250, { group: 'sweet' }),
  food('chips', 'شيبسي|شيبس|chips|دوريتوس|تشيتوس|شيتوس|كراتيه|فلامنكو|بيك رولز|فشار|popcorn', 170, { group: 'snack' }),
  food('nuts', 'سوداني|لب|مكسرات|لوز|كاجو|فستق|بندق|nuts', 170, { group: 'snack' }),
  food('dates', 'بلح|تمر|تمرات', 75, { each: 25 }),
  // Fruit
  food('banana', 'موز|موزه|banana', 100, { each: 100 }),
  food('apple', 'تفاح|تفاحه|apple', 80, { each: 80 }),
  food('orange', 'برتقال|برتقاله|يوسفي|orange', 60, { each: 60 }),
  food('fruit', 'فراوله|عنب|مانجا|مانجو|بطيخ|كنتالوب|جوافه|خوخ|كيوي|فاكهه|فواكه|fruit', 80, { group: 'fruit' }),
  // Sweeteners and add-ins (a "spoon" is a portion)
  food('honey', 'عسل|honey', 40),
  food('sugar', 'سكر|sugar', 30),
  food('chia', 'شيا|chia', 60),
  // Drinks
  food('tea', 'شاي|شاي اخضر|ينسون|قرفه|نعناع|كركديه|تيليو|بابونج|زنجبيل|tea', 5, { drink: true, group: 'drink', generic: true }),
  food('milkTea', 'شاي بلبن|شاي بحليب', 90, { drink: true, group: 'drink' }),
  food('coffee', 'قهوه|اسبريسو|coffee|espresso', 20, { drink: true, group: 'drink', generic: true }),
  food('milkCoffee', 'قهوه بلبن|لاتيه|لاتيه|كابتشينو|كابوتشينو|نسكافيه|latte|cappuccino|nescafe|فلات وايت', 130, { drink: true, group: 'drink' }),
  food('iceCoffee', 'ايس كوفي|ايسد كوفي|ice coffee|iced coffee|ايس لاتيه|iced latte|فرابيه|فرابتشينو|frappe|frappuccino', 220, { drink: true, group: 'drink' }),
  food('milk', 'لبن|حليب|milk', 120, { drink: true, group: 'drink' }),
  food('juice', `عصير|juice|قصب|سوبيا|سموزي|smoothie|${FRUIT_NAMES.map((name) => `عصير ${name}`).join('|')}`, 150, { drink: true, group: 'drink' }),
  food('milkshake', 'ميلك شيك|milkshake', 400, { drink: true, group: 'drink' }),
  food('soda', 'بيبسي|كوكاكولا|كوكا|كولا|سفن اب|سبرايت|فانتا|ميرندا|شويبس|pepsi|coke|cola|sprite|fanta', 140, { drink: true, group: 'drink', soda: true }),
  food('energy', 'ريد بول|redbull|red bull|مشروب طاقه', 110, { drink: true, group: 'drink' }),
  food('lemon', 'لمون|ليمون|lemon|lemonade', 10, { drink: true, group: 'drink', generic: true }),
]

/** When nothing in an entry is recognised, a typical size for its meal. */
const CATEGORY_GUESS: Record<FoodCategory, number> = { breakfast: 350, lunch: 600, dinner: 450, snack: 150, drink: 60 }

const NUMBER_WORDS: Record<string, number> = {
  واحد: 1, واحده: 1, وحده: 1, اتنين: 2, اثنين: 2, اتنان: 2, تلاته: 3, ثلاثه: 3, تلات: 3, ثلاث: 3, اربعه: 4, اربع: 4, خمسه: 5, خمس: 5,
  نص: 0.5, نصف: 0.5, ربع: 0.25, تلت: 1 / 3, ثلث: 1 / 3,
}
/** Words that count pieces ("2 قطعة كيك" counts cakes). */
const PIECES = new Set(['قطعه', 'قطع', 'حته', 'حتت', 'حبه', 'حبات', 'شريحه', 'شرايح', 'صباع', 'صوابع', 'حبايه'])
/** Containers and measures ("طبق", "كوب", "معلقة"): an amount of them counts portions. */
const MEASURES = new Set(['طبق', 'اطباق', 'كوب', 'كوباية', 'كوبايه', 'كبايه', 'كباية', 'مج', 'ماج', 'فنجان', 'معلقه', 'معالق', 'كيس', 'اكياس', 'علبه', 'علب', 'باكو', 'بكو', 'كف', 'سندوتش', 'ساندوتش'])
const DUAL_MEASURES = new Set(['طبقين', 'كوبين', 'كوبايتين', 'كبايتين', 'معلقتين', 'كيسين', 'علبتين', 'باكوين', 'قطعتين', 'حتتين', 'شريحتين', 'صباعين', 'سندوتشين'])
const NEGATIONS = new Set(['بدون', 'غير'])
const DOUBLE = new Set(['دبل', 'double'])
const DIET = new Set(['دايت', 'زيرو', 'diet', 'zero', 'لايت', 'light'])
const AND_A_HALF = 'ونص'

/** Same spelling rules for the dictionary and for what she types. */
export function normalizeFoodText(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/½/g, ' 0.5 ')
    .replace(/(\d)([^\d\s.])/g, '$1 $2')
    .replace(/([^\d\s.])(\d)/g, '$1 $2')
}

/** A word and the forms it can take without Arabic prefixes ("وشيدر", "بالشيا", "بمعلقة"). */
function forms(word: string) {
  const found = new Set([word])
  const bases = word.startsWith('و') && word.length > 2 ? [word, word.slice(1)] : [word]
  for (const base of bases) {
    found.add(base)
    for (const prefix of ['بال', 'وال', 'فال', 'لل', 'ال', 'ب']) {
      if (base.startsWith(prefix) && base.length - prefix.length >= 2) found.add(base.slice(prefix.length))
    }
  }
  return found
}

interface Pattern { food: Food; words: string[]; dual: boolean }

const PATTERNS: Pattern[] = FOODS.flatMap((item) => [
  ...item.names.map((name) => ({ food: item, words: normalizeFoodText(name).split(/\s+/), dual: false })),
  ...(item.duals ?? []).map((name) => ({ food: item, words: [normalizeFoodText(name)], dual: true })),
]).sort((a, b) => b.words.length - a.words.length)

const numberIn = (wordForms: Set<string>) => {
  for (const form of wordForms) {
    if (/^\d+(\.\d+)?$/.test(form)) return Number(form)
    if (NUMBER_WORDS[form] !== undefined) return NUMBER_WORDS[form]
  }
  return null
}
const hasAny = (wordForms: Set<string>, words: Set<string>) => [...wordForms].some((form) => words.has(form))

interface Match { food: Food; count: number | null; pieces: boolean; double: boolean; diet: boolean }

/** In a sandwich, a dish is a filling: about half its usual portion. */
const FILLING_SHARE = 0.5

/** A "segment" is one item: text between "و", commas and "+". A word starting with "و" starts one when the rest is a known word. */
function segments(text: string) {
  const words = normalizeFoodText(text).split(/[\s,،+&/()\-:]+/).filter(Boolean)
  const known = (word: string) => PATTERNS.some((pattern) => pattern.words[0] === word) || MEASURES.has(word) || PIECES.has(word) || DUAL_MEASURES.has(word)
  const result: Set<string>[][] = [[]]
  for (const word of words) {
    if (word === 'و' || word === 'and' || word === 'مع' || word === 'with') {
      result.push([])
      continue
    }
    if (word !== AND_A_HALF && word.startsWith('و') && known(word.slice(1))) result.push([])
    result.at(-1)!.push(forms(word))
  }
  return result.filter((segment) => segment.length)
}

function parse(text: string) {
  const matches: Match[] = []
  let count: number | null = null
  let sandwich = false
  for (const segment of segments(text)) {
    const found: Match[] = []
    const diet = segment.some((wordForms) => hasAny(wordForms, DIET))
    for (let index = 0; index < segment.length; index++) {
      const pattern = PATTERNS.find((candidate) => candidate.words.every((word, offset) => segment[index + offset]?.has(word)))
      if (!pattern) {
        const number = numberIn(segment[index])
        const dual = hasAny(segment[index], DUAL_MEASURES)
        if (count === null && (number !== null || dual)) count = number ?? 2
        continue
      }
      // Read the amount written just before it: "2 توست", "نص معلقة عسل", "2 قطعة كيك", "رغيفين ونص".
      let amount: number | null = pattern.dual ? 2 : null
      let pieces = pattern.dual
      let measured = false
      let negated = false
      let double = false
      for (let back = index - 1; back >= Math.max(0, index - 3); back--) {
        const wordForms = segment[back]
        if (hasAny(wordForms, NEGATIONS)) negated = true
        else if (hasAny(wordForms, DOUBLE)) double = true
        else if (wordForms.has(AND_A_HALF)) amount = (amount ?? 0) + 0.5
        else if (hasAny(wordForms, DUAL_MEASURES)) { amount = (amount ?? 0) + 2; pieces = hasAny(wordForms, new Set(['قطعتين', 'حتتين', 'شريحتين', 'صباعين'])); break }
        else if (hasAny(wordForms, MEASURES)) measured = true
        else if (hasAny(wordForms, PIECES)) pieces = true
        else {
          const number = numberIn(wordForms)
          if (number === null) break
          amount = (amount ?? 0) + number
          pieces = pieces || !measured
          break
        }
      }
      if (segment[index + pattern.words.length]?.has(AND_A_HALF)) amount = (amount ?? 1) + 0.5
      index += pattern.words.length - 1
      if (negated) continue
      if (amount !== null && count === null) count = amount
      if (pattern.food.id === 'sandwich') sandwich = true
      found.push({ food: pattern.food, count: amount, pieces, double, diet })
    }
    // One item per group in a segment ("كيكة هوهوز", "كيس كراتيه فلامنكو بالسوداني"), preferring the specific name.
    const kept: Match[] = []
    for (const match of found) {
      const key = match.food.group ?? match.food.id
      const same = kept.findIndex((other) => (other.food.group ?? other.food.id) === key)
      if (same === -1) kept.push(match)
      else if (kept[same].food.generic && !match.food.generic) kept[same] = { ...match, count: match.count ?? kept[same].count }
      else if (kept[same].count === null && match.count !== null && kept[same].food.id === match.food.id) kept[same] = match
    }
    matches.push(...kept)
  }
  return { matches, count, sandwich }
}

function matchCalories(match: Match, sandwich: boolean) {
  if (match.food.soda && match.diet) return 0
  const unit = match.count !== null && match.pieces && match.food.each ? match.food.each : match.food.portion
  const share = sandwich && match.food.group !== 'bread' && !match.food.drink ? FILLING_SHARE : 1
  return (match.count ?? 1) * unit * share * (match.double ? 2 : 1)
}

/** Approximate calories of one food-log entry. Water is 0. */
export function estimateCalories(entry: Pick<FoodEntry, 'category' | 'item' | 'quantity' | 'ml'>) {
  if (isWater(entry)) return 0
  const item = parse(entry.item)
  const quantity = entry.quantity ? parse(entry.quantity) : { matches: [], count: null, sandwich: false }
  const sandwich = item.sandwich || quantity.sandwich
  // Foods named in the amount field ("رغيفين ونص عيش") set their own amount.
  let matches = item.matches.map((match) => quantity.matches.find((other) => other.food.id === match.food.id) ?? match)
  matches = [...matches, ...quantity.matches.filter((match) => !item.matches.some((other) => other.food.id === match.food.id))]
  let total = matches.length ? matches.reduce((sum, match) => sum + matchCalories(match, sandwich), 0) : CATEGORY_GUESS[entry.category]
  // A bare amount ("٢", "كوبايتين") multiplies the whole entry, unless the item already says how many.
  if (!quantity.matches.length && quantity.count !== null && item.count === null) total *= quantity.count
  if (entry.ml && matches.length && matches.every((match) => match.food.drink)) total *= entry.ml / 250
  return Math.round(total)
}

export function dayCalories(entries: Pick<FoodEntry, 'category' | 'item' | 'quantity' | 'ml'>[]) {
  return entries.reduce((sum, entry) => sum + estimateCalories(entry), 0)
}

/** Days count once something other than a drink was logged. */
export const hasFoodLogged = (entries: Pick<FoodEntry, 'category'>[]) => entries.some((entry) => entry.category !== 'drink')

/** Average of the given dates that have food logged, or null when none do. */
export function averageDailyCalories(entries: FoodEntry[], dates: string[]) {
  const totals = dates
    .map((date) => entries.filter((entry) => entry.date === date))
    .filter(hasFoodLogged)
    .map(dayCalories)
  return { average: totals.length ? totals.reduce((sum, total) => sum + total, 0) / totals.length : null, days: totals.length }
}

/** Shown numbers are rounded to 50 so they read as the rough guide they are. */
export const roundCalories = (kcal: number) => Math.round(kcal / 50) * 50

export const formatCalories = (kcal: number) => roundCalories(kcal).toLocaleString('en-US')

/**
 * Daily targets from her nutrition plan ("a flexible guide, not an extreme
 * diet"), by program day. The app shows each as a range, since the estimates
 * are rough anyway.
 */
export const CALORIE_STAGES = [
  { fromDay: 1, toDay: 14, target: 1850 },
  { fromDay: 15, toDay: 30, target: 1750 },
  { fromDay: 31, toDay: null, target: 1700 },
] as const
export const CALORIE_RANGE_MARGIN = 100
/** Below this a day earns fewer calorie points, so skipping meals is never rewarded. */
export const CALORIE_FLOOR_KCAL = 1200

export function calorieRange(dayNumber: number) {
  const index = Math.max(0, CALORIE_STAGES.findIndex((stage) => stage.toDay === null || dayNumber <= stage.toDay))
  const stage = CALORIE_STAGES[index]
  return { stage: index + 1, untilDay: stage.toDay, target: stage.target, min: stage.target - CALORIE_RANGE_MARGIN, max: stage.target + CALORIE_RANGE_MARGIN }
}

export type RangeStatus = 'below' | 'within' | 'above'

/** Compares the rounded estimate, so a borderline day reads as within. */
export function rangeStatus(kcal: number, range: { min: number; max: number }): RangeStatus {
  const rounded = roundCalories(kcal)
  return rounded < range.min ? 'below' : rounded > range.max ? 'above' : 'within'
}
