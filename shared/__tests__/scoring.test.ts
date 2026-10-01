import { describe, expect, it } from 'vitest'
import { calorieScore, computeDailyScore, waterScore } from '../scoring'
import { checkin, feedback, workout } from './fixtures'

const goodFood = { waterMl: 2000, calories: 1800, calorieMax: 1950 }

describe('daily score: 40 workout + 30 water + 30 calories', () => {
  it('is 100 for a full workout, enough water and eating within the range', () => {
    expect(computeDailyScore({ checkin, workout: workout(), feedback: feedback() }, 0, false, goodFood)).toEqual({
      checkin: 6, workout: 24, warmupCooldown: 4, feedback: 6, water: 30, calories: 30, makeup: 0, pass: 0, total: 100,
    })
  })

  it('gives partial workout points and nothing for skipped parts', () => {
    const score = computeDailyScore({ checkin, workout: workout({ mainCompletion: 0.5, cooldownDone: false }), feedback: null })
    expect(score).toMatchObject({ checkin: 6, workout: 12, warmupCooldown: 2, feedback: 0, total: 20 })
  })

  it('never rewards more than 24 main-work points, however long or hard', () => {
    const score = computeDailyScore({ checkin: null, workout: workout({ mainCompletion: 3, activeSeconds: 99999, level: 6 }), feedback: null })
    expect(score.workout).toBe(24)
    expect(score.total).toBe(28)
  })

  it('scores water against the 2 L target', () => {
    expect(waterScore(0)).toBe(0)
    expect(waterScore(1000)).toBe(15)
    expect(waterScore(1500)).toBe(23)
    expect(waterScore(3000)).toBe(30)
  })

  it('gives full calorie points from 1,200 to the top of the range, fewer above it or below the floor', () => {
    expect(calorieScore(null, 1950)).toBe(0)
    expect(calorieScore(1800, 1950)).toBe(30)
    expect(calorieScore(1960, 1950)).toBe(30) // rounds to 1,950
    expect(calorieScore(2250, 1950)).toBe(18) // 300 over: −12
    expect(calorieScore(2700, 1950)).toBe(0)
    expect(calorieScore(600, 1950)).toBe(15)
  })

  it('is 0 for an empty day', () => {
    expect(computeDailyScore({ checkin: null, workout: null, feedback: null }).total).toBe(0)
  })

  it('adds made-up points, never past 100', () => {
    const half = { checkin, workout: workout({ mainCompletion: 0.5, cooldownDone: false }), feedback: null }
    expect(computeDailyScore(half, 20)).toMatchObject({ makeup: 20, total: 40 })
    expect(computeDailyScore(half, 95)).toMatchObject({ makeup: 80, total: 100 })
  })

  it('lets a day pass fill the workout share only', () => {
    expect(computeDailyScore({ checkin: null, workout: null, feedback: null }, 0, true, goodFood)).toMatchObject({ pass: 40, water: 30, calories: 30, total: 100 })
    expect(computeDailyScore({ checkin: null, workout: null, feedback: null }, 0, true)).toMatchObject({ pass: 40, total: 40 })
  })
})
