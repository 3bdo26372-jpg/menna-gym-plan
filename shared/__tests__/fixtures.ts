import { computeDailyScore } from '../scoring'
import type { CheckIn, DayRecord, Feedback, WorkoutResult } from '../types'

export const checkin: CheckIn = { energy: 'normal', mood: 'good', body: 'fresh', at: '2026-09-28T08:00:00Z' }

export function workout(overrides: Partial<WorkoutResult> = {}): WorkoutResult {
  return {
    dayType: 'cardio-burn', intensity: 'normal', level: 0, status: 'completed',
    startedAt: '2026-09-28T08:05:00Z', finishedAt: '2026-09-28T08:25:00Z',
    plannedSeconds: 1100, activeSeconds: 900, mainCompletion: 1, warmupDone: true, cooldownDone: true,
    exercises: [], ...overrides,
  }
}

export function feedback(overrides: Partial<Feedback> = {}): Feedback {
  return { difficulty: 5, energyAfter: 'high', sweating: 'medium', overall: 'perfect', pain: false, at: '2026-09-28T08:30:00Z', ...overrides }
}

export function day(date: string, dayNumber: number, parts: Partial<Pick<DayRecord, 'checkin' | 'workout' | 'feedback' | 'excused' | 'periodPain'>> = {}): DayRecord {
  const base = { checkin: null, workout: null, feedback: null, excused: false, periodPain: null, ...parts }
  return { date, dayNumber, ...base, score: computeDailyScore(base, 0, base.excused) }
}
