import { describe, expect, it } from 'vitest'
import { averageDailyCalories, dayCalories, estimateCalories, formatCalories, normalizeFoodText } from '../calories'
import type { FoodCategory, FoodEntry } from '../food'

const kcal = (item: string, quantity: string | null = null, category: FoodCategory = 'lunch', ml: number | null = null) =>
  estimateCalories({ category, item, quantity, ml })

let nextId = 1
const entry = (date: string, category: FoodCategory, item: string, quantity: string | null = null): FoodEntry =>
  ({ id: nextId++, date, time: '12:00', category, item, quantity, ml: null, createdAt: '' })

describe('rough calories', () => {
  it('normalizes Arabic spelling and digits', () => {
    expect(normalizeFoodText('٢بيضة وجبنة')).toBe('2 بيضه وجبنه')
  })

  it('recognises common foods with typical portions', () => {
    expect(kcal('كوردن بلو')).toBe(450)
    expect(kcal('فول وطعمية وعيش بلدي')).toBe(750)
    expect(kcal('Ice coffee', null, 'drink')).toBe(220)
  })

  it('reads amounts written in the text', () => {
    expect(kcal('2 توست')).toBe(150)
    expect(kcal('٢بيض')).toBe(160)
    expect(kcal('3 طعمية وعيش')).toBe(430)
    expect(kcal('طبق مكرونة و دبوسين كنتاكي')).toBe(780)
    expect(kcal('نص معلقة عسل')).toBe(20)
    expect(kcal('2 قطعة كيك')).toBe(500)
    expect(kcal('2 توست دبل جبن رومي وشيدر')).toBe(480)
  })

  it('uses the amount field without counting twice', () => {
    // Foods named in the amount set their own amount: 2.5 loaves instead of 1.
    expect(kcal('عيش و شكشوكة و بطاطس', 'رغيفين ونص عيش')).toBe(1225)
    // A bare number multiplies the whole entry...
    expect(kcal('عيش توست وجبنة حادقة', '٢')).toBe(460)
    // ...unless the item already says how many.
    expect(kcal('2 توست', '٢')).toBe(150)
    expect(kcal('كوردن بلو', 'واحدة')).toBe(450)
  })

  it('treats several names for one thing as one item', () => {
    expect(kcal('كيكة هوهوز وكيس كراتيه فلامنكو بالسوداني', null, 'snack')).toBe(360)
    expect(kcal('شاي بلبن', null, 'drink')).toBe(90)
  })

  it('handles "without", diet drinks and water', () => {
    expect(kcal('شاي بدون سكر', null, 'drink')).toBe(5)
    expect(kcal('شاي أخضر بمعلقة عسل', null, 'drink')).toBe(45)
    expect(kcal('بيبسي دايت', null, 'drink')).toBe(0)
    expect(kcal('مية', null, 'drink', 500)).toBe(0)
    expect(kcal('عصير برتقال', null, 'drink', 500)).toBe(300)
  })

  it('guesses a typical meal when nothing is recognised', () => {
    expect(kcal('حاجة غريبة', null, 'lunch')).toBe(600)
    expect(kcal('حاجة غريبة', null, 'snack')).toBe(150)
  })

  it('averages only days with food logged, rounded to 50', () => {
    const entries = [
      entry('2026-10-01', 'breakfast', '2 بيض'),
      entry('2026-10-01', 'lunch', 'كشري'),
      entry('2026-10-02', 'drink', 'مية'),
      entry('2026-10-03', 'dinner', 'كوردن بلو'),
    ]
    expect(dayCalories(entries.filter((item) => item.date === '2026-10-01'))).toBe(860)
    const { average, days } = averageDailyCalories(entries, ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(days).toBe(2)
    expect(average).toBe(655)
    expect(formatCalories(average!)).toBe('650')
    expect(formatCalories(1785)).toBe('1,800')
    expect(averageDailyCalories(entries, ['2026-10-02']).average).toBeNull()
  })
})
