import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { currentGame, dealCards, GAME_PRIZES, GAME_START, gamePrize, gameTotal, roundFor, validatePlay, type GamePlay } from '../game'

const profile = { name: 'Menna', programStartDate: '2026-09-29', timezone: 'Africa/Cairo' }
const play = (round: number, cards: number[], pick: number): GamePlay => ({ round, date: addDays(GAME_START, round * 5), pick, cards, createdAt: '' })

describe('card game', () => {
  it('has one round every 5 days from the start', () => {
    expect(roundFor(addDays(GAME_START, -1))).toBeNull()
    expect([0, 4, 5, 9, 10].map((offset) => roundFor(addDays(GAME_START, offset)))).toEqual([0, 0, 1, 1, 2])
  })

  it('always gives 50 in the first round, wherever she taps', () => {
    for (const pick of [0, 1, 2]) {
      const cards = dealCards(0, pick, Math.random)
      expect(cards[pick]).toBe(50)
      expect([...cards].sort((a, b) => a - b)).toEqual([5, 50, 100])
    }
  })

  it('deals any prize later, with all three under the cards', () => {
    const seen = new Set<number>()
    for (const value of [0, 0.4, 0.9]) {
      const cards = dealCards(1, 1, () => value)
      seen.add(cards[1])
      expect([...cards].sort((a, b) => a - b)).toEqual([5, 50, 100])
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([...GAME_PRIZES].sort((a, b) => a - b))
  })

  it('lets her play once a round', () => {
    const state = { today: addDays(GAME_START, 2), profile, gamePlays: [] as GamePlay[] }
    expect(validatePlay({ pick: 1 }, state)).toEqual({ round: 0, pick: 1 })
    expect(validatePlay({ pick: 3 }, state)).toBeTypeOf('string')
    const played = { ...state, gamePlays: [play(0, [100, 50, 5], 1)] }
    expect(validatePlay({ pick: 0 }, played)).toBe('already played this round')
    expect(currentGame(played)?.next).toBe(addDays(GAME_START, 5))
    expect(validatePlay({ pick: 0 }, { ...played, today: addDays(GAME_START, 5) })).toEqual({ round: 1, pick: 0 })
  })

  it('adds up what she won', () => {
    const plays = [play(0, [100, 50, 5], 1), play(1, [5, 100, 50], 1)]
    expect(gamePrize(plays[1])).toBe(100)
    expect(gameTotal(plays)).toBe(150)
  })
})
