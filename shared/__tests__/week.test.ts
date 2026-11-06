import { describe, expect, it } from 'vitest'
import { addDays, dateRange } from '../date'
import { isActiveDay } from '../engine'
import { earnings } from '../points'
import type { PeriodEntry } from '../period'
import { computeDailyScore } from '../scoring'
import type { DayRecord } from '../types'
import { canChooseRest, restDayDates, trainingWeek, WEEKLY_PLAN_FROM, type WeekInput } from '../week'
import { checkin, day, feedback, workout } from './fixtures'

// Her real program: started on 09-29, so week 6 starts on 11-03.
const START = '2026-09-29'
const WEEK6 = '2026-11-03'
const trainedDay = (date: string) => day(date, 1, { checkin, workout: workout(), feedback: feedback() })
const empty = (date: string) => day(date, 1)

function input(today: string, days: DayRecord[], extra: Partial<WeekInput> = {}): WeekInput {
  const byDate = new Map(days.map((item) => [item.date, item]))
  return { startDate: START, today, days: dateRange(START, today).map((date) => byDate.get(date) ?? empty(date)), restDays: [], periods: [], ...extra }
}

describe('the training week', () => {
  it('starts the weekly plan on its first week', () => {
    expect(WEEKLY_PLAN_FROM).toBe(WEEK6)
    const week = trainingWeek(input(WEEK6, []))
    expect(week).toMatchObject({ index: 6, startDate: WEEK6, endDate: '2026-11-09' })
  })

  it('is 5 workouts and 2 rest days in a usual week, and she picks the days', () => {
    // Trains on days 1, 3, 4; rests on 2; today is day 5.
    const days = [trainedDay(WEEK6), trainedDay(addDays(WEEK6, 2)), trainedDay(addDays(WEEK6, 3))]
    const week = trainingWeek(input(addDays(WEEK6, 4), days))
    expect(week).toMatchObject({ sensitive: false, target: 5, restAllowance: 2, done: 3, restUsed: 1, restLeft: 1, workoutsLeft: 2, daysLeft: 3 })
    expect(week.days.map((item) => item.kind)).toEqual(['workout', 'rest', 'workout', 'workout', 'today', 'upcoming', 'upcoming'])
  })

  it('turns days past the rest allowance into missed ones, and only those', () => {
    const week = trainingWeek(input(addDays(WEEK6, 4), [trainedDay(WEEK6)]))
    expect(week.days.map((item) => item.kind)).toEqual(['workout', 'rest', 'rest', 'missed', 'today', 'upcoming', 'upcoming'])
    expect(week.workoutsLeft).toBe(4)
  })

  it('is 4 workouts and 3 rest days just before her period', () => {
    // Last period on 10-12, a 28-day cycle: the next is due on 11-09, so 11-04 to 11-09 come just before it.
    const periods: PeriodEntry[] = [{ id: 1, startDate: '2026-10-12', endDate: '2026-10-16', createdAt: '' }]
    const week = trainingWeek(input(WEEK6, [], { periods }))
    expect(week).toMatchObject({ sensitive: true, target: 4, restAllowance: 3 })
  })

  it('lets logged period days lower the workouts instead of using rest days', () => {
    const periods: PeriodEntry[] = [{ id: 1, startDate: addDays(WEEK6, 1), endDate: addDays(WEEK6, 3), createdAt: '' }]
    const week = trainingWeek(input(addDays(WEEK6, 4), [trainedDay(WEEK6)], { periods }))
    expect(week.days.slice(0, 5).map((item) => item.kind)).toEqual(['workout', 'period', 'period', 'period', 'today'])
    expect(week).toMatchObject({ sensitive: true, target: 1, restUsed: 0, workoutsLeft: 0 })
  })

  it('counts a day pass as done', () => {
    const passed = { ...empty(addDays(WEEK6, 1)), excused: true }
    const week = trainingWeek(input(addDays(WEEK6, 2), [trainedDay(WEEK6), passed]))
    expect(week).toMatchObject({ done: 2, restUsed: 0 })
  })

  it('gives her chosen rest days first, and a workout on that day still counts as a workout', () => {
    const today = addDays(WEEK6, 3)
    const chosen = trainingWeek(input(today, [trainedDay(WEEK6)], { restDays: [today] }))
    expect(chosen.days.map((item) => item.kind).slice(0, 4)).toEqual(['workout', 'rest', 'missed', 'rest'])
    const trainedAnyway = trainingWeek(input(today, [trainedDay(WEEK6), trainedDay(today)], { restDays: [today] }))
    expect(trainedAnyway.days[3].kind).toBe('workout')
    expect(trainedAnyway.restUsed).toBe(2)
  })

  it('lets her choose rest today only while the week has a rest day left', () => {
    const today = addDays(WEEK6, 2)
    expect(canChooseRest(input(today, [trainedDay(WEEK6), trainedDay(addDays(WEEK6, 1))]), today)).toBe(true)
    // Two days without a workout already used both rest days.
    expect(canChooseRest(input(today, []), today)).toBe(false)
    // Not on a day she already trained, nor before the weekly plan.
    expect(canChooseRest(input(today, [trainedDay(WEEK6), trainedDay(today)]), today)).toBe(false)
    expect(canChooseRest(input('2026-10-30', []), '2026-10-30')).toBe(false)
  })

  it('leaves the weeks before the weekly plan as they were', () => {
    const rest = restDayDates(input(addDays(WEEK6, 3), []))
    expect([...rest].every((date) => date >= WEEK6)).toBe(true)
    expect(rest.has('2026-10-21')).toBe(false)
  })
})

describe('a rest day', () => {
  const none = { checkin: null, workout: null, feedback: null }
  const goodFood = { waterMl: 2000, calories: 1500, calorieMax: 1800 }

  it('fills in the workout share, so water and food can still make it 100', () => {
    expect(computeDailyScore(none, 0, false, goodFood, false, true)).toMatchObject({ rest: 40, water: 30, calories: 30, total: 100 })
    expect(computeDailyScore(none, 0, false, goodFood, false, false)).toMatchObject({ rest: 0, total: 60 })
  })

  it('counts like a trained day for the rewards and the 7-day streak', () => {
    const rest = { ...empty('2026-11-04'), restDay: true }
    expect(isActiveDay(rest)).toBe(true)
    const days = dateRange(WEEK6, addDays(WEEK6, 6)).map((date, index) => (index % 3 === 1 ? { ...empty(date), restDay: true } : trainedDay(date)))
    const streak = earnings({ today: addDays(WEEK6, 7), days, foodEntries: [] }).filter((earning) => earning.kind === 'streak')
    expect(streak).toHaveLength(1)
  })
})
