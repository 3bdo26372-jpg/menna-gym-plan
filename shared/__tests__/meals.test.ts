import { describe, expect, it } from 'vitest'
import type { FoodEntry } from '../food'
import { foodNotes, foodReview, IDEAS_SHOWN, MEAL_IDEAS, mealForHour, mealIdeas, mealsFromHistory, newPagePeriod } from '../meals'

let id = 1
const entry = (date: string, time: string, item: string, category: FoodEntry['category'] = 'lunch'): FoodEntry =>
  ({ id: id++, date, time, category, item, quantity: null, ml: null, createdAt: '' })
const period = (startDate: string, endDate: string | null) => ({ id: 2, startDate, endDate, createdAt: '' })

describe('the new page after a period', () => {
  it('shows from the day after she marks the end, for a week', () => {
    const periods = [period('2026-10-12', '2026-10-16')]
    expect(newPagePeriod(periods, '2026-10-16')).toBeNull()
    expect(newPagePeriod(periods, '2026-10-17')?.id).toBe(2)
    expect(newPagePeriod(periods, '2026-10-23')?.id).toBe(2)
    expect(newPagePeriod(periods, '2026-10-24')).toBeNull()
  })

  it('waits until she says it ended', () => {
    expect(newPagePeriod([period('2026-10-12', null)], '2026-10-18')).toBeNull()
    expect(newPagePeriod([], '2026-10-18')).toBeNull()
  })
})

describe('the food review', () => {
  const dates = ['2026-10-15', '2026-10-16', '2026-10-17']
  const entries = [
    entry('2026-10-15', '21:37', 'رغفين عيش محشيين جبنه', 'breakfast'),
    entry('2026-10-17', '23:41', 'طبق بطاطس وست مربعات استريس', 'breakfast'),
    entry('2026-10-17', '23:42', 'برجر'),
    entry('2026-10-17', '23:43', 'كيس إندومي', 'snack'),
    entry('2026-10-17', '23:42', 'ريدبول', 'drink'),
  ]

  it('counts fast food, sugary drinks, late first meals and empty days', () => {
    expect(foodReview(entries, dates)).toEqual({ junk: 3, sugary: 1, lateFirstMeal: 2, emptyDays: 1, veg: 0, days: 3 })
    expect(foodNotes(foodReview(entries, dates))).toHaveLength(5)
  })

  it('reads a meal after midnight as the night before, not the first meal', () => {
    const night = [entry('2026-10-15', '00:24', 'تفاحة', 'snack'), entry('2026-10-15', '17:55', 'نص رغيف محشي مسقعه', 'breakfast')]
    expect(foodReview(night, ['2026-10-15'])).toMatchObject({ lateFirstMeal: 1, veg: 1 })
  })

  it('has nothing to say about a good week', () => {
    const good = dates.map((date) => entry(date, '11:00', 'بيضتين وسلطة', 'breakfast'))
    expect(foodNotes(foodReview(good, dates))).toEqual([])
  })
})

describe('meal ideas', () => {
  it('shows a few at a time and the next few on request, wrapping around', () => {
    const shown = mealIdeas('lunch', 0)
    expect(shown).toHaveLength(IDEAS_SHOWN)
    expect(mealIdeas('lunch', 1)[0]).toBe(MEAL_IDEAS.lunch[IDEAS_SHOWN])
    expect(mealIdeas('lunch', 1)).not.toContain(shown[0])
    const rounds = Math.ceil(MEAL_IDEAS.snack.length / IDEAS_SHOWN) + 1
    expect(mealIdeas('snack', rounds)).toHaveLength(IDEAS_SHOWN)
  })

  it('suggests the meal that suits the hour', () => {
    expect([8, 14, 21, 2].map(mealForHour)).toEqual(['breakfast', 'lunch', 'dinner', 'dinner'])
  })
})

describe('meal ideas from her own food', () => {
  const ate = [
    entry('2026-10-15', '13:00', 'بيضتين وعيش بلدي', 'breakfast'),
    entry('2026-10-16', '13:00', 'بيضتين وعيش بلدي', 'breakfast'),
    entry('2026-10-17', '14:00', 'كيس اندومي', 'breakfast'),
    entry('2026-10-18', '12:00', 'فول وطعمية', 'breakfast'),
    entry('2026-10-18', '20:00', 'رز وفراخ', 'lunch'),
  ]

  it('puts what she ate most first, without fast food, and marks it as hers', () => {
    expect(mealsFromHistory(ate, 'breakfast')).toEqual([
      { emoji: '🍳', item: 'بيضتين وعيش بلدي', mine: true },
      { emoji: '🍳', item: 'فول وطعمية', mine: true },
    ])
  })

  it('fills the rest with suggestions she has not had', () => {
    const shown = mealIdeas('breakfast', 0, ate)
    expect(shown.map((meal) => meal.item)).toEqual(['بيضتين وعيش بلدي', 'فول وطعمية', MEAL_IDEAS.breakfast[0].item])
    expect(mealIdeas('lunch', 0, ate)[0]).toMatchObject({ item: 'رز وفراخ', mine: true })
  })
})
