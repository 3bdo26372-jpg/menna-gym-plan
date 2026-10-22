import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { currentGame, dealCards, GAME_START, gamePrize, gameTotal, PRIZE_POOL, PRIZES, roundFor, toPrizeId, validatePlay, type GamePlay, type PrizeId } from '../game'

const profile = { name: 'Menna', programStartDate: '2026-09-29', timezone: 'Africa/Cairo' }
const play = (round: number, cards: PrizeId[], pick: number): GamePlay => ({ round, date: addDays(GAME_START, round * 5), pick, cards, createdAt: '' })

describe('card game', () => {
  it('has one round every 5 days from the start', () => {
    expect(roundFor(addDays(GAME_START, -1))).toBeNull()
    expect([0, 4, 5, 9, 10].map((offset) => roundFor(addDays(GAME_START, offset)))).toEqual([0, 0, 1, 1, 2])
  })

  it('always gave 50 pounds in the first round, with 100 and 5 under the others', () => {
    for (const pick of [0, 1, 2]) {
      const cards = dealCards(0, pick)
      expect(cards[pick]).toBe('money-50')
      expect([...cards].sort()).toEqual(['money-100', 'money-5', 'money-50'])
    }
  })

  it('deals three different prizes later, never 5 pounds', () => {
    for (let index = 0; index < 50; index++) {
      const cards = dealCards(1, index % 3)
      expect(new Set(cards).size).toBe(3)
      for (const card of cards) expect(PRIZE_POOL).toContain(card)
    }
    expect(dealCards(1, 0, () => 0.999)).toHaveLength(3)
  })

  it('reads cards stored as pound amounts', () => {
    expect([5, 50, 100].map(toPrizeId)).toEqual(['money-5', 'money-50', 'money-100'])
    expect(gamePrize({ cards: [5, 50, 100].map(toPrizeId), pick: 1 })).toBe(PRIZES['money-50'])
  })

  it('lets her play once a round', () => {
    const state = { today: addDays(GAME_START, 2), profile, gamePlays: [] as GamePlay[] }
    expect(validatePlay({ pick: 1 }, state)).toEqual({ round: 0, pick: 1, special: null })
    expect(validatePlay({ pick: 3 }, state)).toBeTypeOf('string')
    const played = { ...state, gamePlays: [play(0, ['money-100', 'money-50', 'money-5'], 1)] }
    expect(validatePlay({ pick: 0 }, played)).toBe('already played this round')
    expect(currentGame(played)?.next).toBe(addDays(GAME_START, 5))
    expect(validatePlay({ pick: 0 }, { ...played, today: addDays(GAME_START, 5) })).toEqual({ round: 1, pick: 0, special: null })
  })

  it('adds up the money she won, not the treats', () => {
    const plays = [play(0, ['money-100', 'money-50', 'money-5'], 1), play(1, ['ring', 'money-100', 'candy'], 1), play(2, ['gum', 'chocolate', 'money-50'], 1)]
    expect(gamePrize(plays[2]).label).toBe('شوكولاتة')
    expect(gameTotal(plays)).toBe(150)
  })
})

describe('special rounds', () => {
  const roses = { id: 1, kind: 'roses' as const, createdAt: '' }

  it('comes first until she plays it, then gives the regular round back', () => {
    const open = currentGame({ today: '2026-10-21', profile, gameSpecials: [roses] })
    expect(open).toMatchObject({ round: -1, special: roses, played: null })
    expect(validatePlay({ pick: 2 }, { today: '2026-10-21', profile, gameSpecials: [roses] })).toEqual({ round: -1, pick: 2, special: roses })
    const play = { round: -1, date: '2026-10-21', pick: 2, cards: dealCards(-1, 2, () => 0, roses), createdAt: '' }
    expect(currentGame({ today: '2026-10-21', profile, gameSpecials: [roses], gamePlays: [play] })?.special).toBeNull()
    expect(currentGame({ today: '2026-10-22', profile, gameSpecials: [roses], gamePlays: [play] })?.special).toBeNull()
  })

  it('deals the three roses, one of each colour', () => {
    for (const random of [() => 0, () => 0.5, () => 0.99]) {
      expect([...dealCards(-1, 0, random, roses)].sort()).toEqual(['rose-pink', 'rose-red', 'rose-white'])
    }
  })
})
