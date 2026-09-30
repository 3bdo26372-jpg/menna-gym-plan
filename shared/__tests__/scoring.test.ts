import { describe, expect, it } from 'vitest'
import { computeDailyScore } from '../scoring'
import { checkin, feedback, workout } from './fixtures'

describe('daily score', () => {
  it('is 100 for a full day', () => {
    expect(computeDailyScore({ checkin, workout: workout(), feedback: feedback() })).toEqual({
      checkin: 15, workout: 60, warmupCooldown: 10, feedback: 15, makeup: 0, total: 100,
    })
  })

  it('gives partial workout points and nothing for skipped parts', () => {
    const score = computeDailyScore({ checkin, workout: workout({ mainCompletion: 0.5, cooldownDone: false }), feedback: null })
    expect(score).toEqual({ checkin: 15, workout: 30, warmupCooldown: 5, feedback: 0, makeup: 0, total: 50 })
  })

  it('never rewards more than 60 workout points, however long or hard', () => {
    const score = computeDailyScore({ checkin: null, workout: workout({ mainCompletion: 3, activeSeconds: 99999, level: 6 }), feedback: null })
    expect(score.workout).toBe(60)
    expect(score.total).toBe(70)
  })

  it('is 0 for an empty day', () => {
    expect(computeDailyScore({ checkin: null, workout: null, feedback: null }).total).toBe(0)
  })

  it('adds made-up points, never past 100', () => {
    const half = { checkin, workout: workout({ mainCompletion: 0.5, cooldownDone: false }), feedback: null }
    expect(computeDailyScore(half, 20)).toMatchObject({ makeup: 20, total: 70 })
    expect(computeDailyScore(half, 80)).toMatchObject({ makeup: 50, total: 100 })
    expect(computeDailyScore({ checkin: null, workout: null, feedback: null }, 100)).toMatchObject({ makeup: 100, total: 100 })
  })
})
