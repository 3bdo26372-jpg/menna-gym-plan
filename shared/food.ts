/**
 * Food and drink log. Each entry is one thing eaten or drunk, with its time
 * of day. Drinks can carry millilitres so water intake can be totalled.
 */
export type FoodCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'

export interface FoodEntry {
  id: number
  date: string
  time: string
  category: FoodCategory
  item: string
  quantity: string | null
  ml: number | null
  createdAt: string
}

export type FoodInput = Pick<FoodEntry, 'time' | 'category' | 'item'> & { quantity?: string; ml?: number | null }

export const FOOD_CATEGORIES: { id: FoodCategory; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'فطار', emoji: '🍳' },
  { id: 'lunch', label: 'غدا', emoji: '🍲' },
  { id: 'dinner', label: 'عشا', emoji: '🥗' },
  { id: 'snack', label: 'سناك', emoji: '🍎' },
  { id: 'drink', label: 'مشروب', emoji: '🥤' },
]

export const FOOD_CATEGORY_LABEL = Object.fromEntries(FOOD_CATEGORIES.map((category) => [category.id, category.label])) as Record<FoodCategory, string>

/** Daily water goal from the nutrition plan: 2–2.5 L. */
export const WATER_TARGET_ML = 2000
export const WATER_WORDS = ['مية', 'مياه', 'ماء', 'water']

/** Food can be logged for today and the 6 days before it. */
export const FOOD_BACKFILL_DAYS = 6

export function isWater(entry: Pick<FoodEntry, 'category' | 'item'>) {
  return entry.category === 'drink' && WATER_WORDS.some((word) => entry.item.toLowerCase().includes(word))
}

export function waterMl(entries: Pick<FoodEntry, 'category' | 'item' | 'ml'>[]) {
  return entries.filter(isWater).reduce((sum, entry) => sum + (entry.ml ?? 0), 0)
}

export function validateFood(input: unknown): Omit<FoodInput, 'quantity' | 'ml'> & { quantity: string | null; ml: number | null } | string {
  if (!input || typeof input !== 'object') return 'food entry must be an object'
  const raw = input as Record<string, unknown>
  if (!FOOD_CATEGORIES.some((category) => category.id === raw.category)) return 'invalid category'
  const item = typeof raw.item === 'string' ? raw.item.trim().slice(0, 120) : ''
  if (!item) return 'item is required'
  const time = typeof raw.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time) ? raw.time : null
  if (!time) return 'time must be HH:MM'
  const quantity = typeof raw.quantity === 'string' && raw.quantity.trim() ? raw.quantity.trim().slice(0, 60) : null
  let ml: number | null = null
  if (raw.ml !== undefined && raw.ml !== null && raw.ml !== '') {
    ml = Math.round(Number(raw.ml))
    if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) return 'ml must be between 1 and 5000'
  }
  return { category: raw.category as FoodCategory, item, time, quantity, ml }
}

export function checkFoodDate(date: string, today: string, programStartDate: string | null, diffDays: (a: string, b: string) => number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'invalid date'
  if (!programStartDate) return 'the program has not started yet'
  if (date < programStartDate) return 'date is before the program start'
  if (date > today) return 'date is in the future'
  if (diffDays(date, today) > FOOD_BACKFILL_DAYS) return 'food can only be logged for the last 7 days'
  return null
}

/** "1.25", "0.75", "2" — litres without trailing zeros. */
export function formatLitres(ml: number) {
  return (ml / 1000).toFixed(2).replace(/\.?0+$/, '')
}
