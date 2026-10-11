import { addDays, diffDays } from './date'
import type { AppState } from './types'

/**
 * اللعبة: three face-down cards, each hiding a real prize from him (not app
 * points): money (50 or 100 pounds) or a treat or gift. She picks one and
 * wins what is under it; the other two then turn over too. There is one round
 * every 5 days, playable on any day of its window. The server decides, so a
 * reload can't change the result.
 *
 * The first round was 100 / 50 / 5 pounds and always landed on 50. From the
 * second round the three cards are three different prizes from `PRIZES`.
 */
export const GAME_START = '2026-10-11'
export const GAME_EVERY_DAYS = 5
export const GAME_CARDS = 3

export type PrizeId = 'money-100' | 'money-50' | 'money-5' | 'chocolate' | 'gum' | 'ring' | 'candy' | 'marshmallow'

export interface Prize {
  id: PrizeId
  emoji: string
  label: string
  /** Pounds, for money. */
  pounds?: number
}

export const PRIZES: Record<PrizeId, Prize> = {
  'money-100': { id: 'money-100', emoji: '💸', label: '100 جنيه', pounds: 100 },
  'money-50': { id: 'money-50', emoji: '💸', label: '50 جنيه', pounds: 50 },
  'money-5': { id: 'money-5', emoji: '💸', label: '5 جنيه', pounds: 5 },
  chocolate: { id: 'chocolate', emoji: '🍫', label: 'شوكولاتة' },
  gum: { id: 'gum', emoji: '🫧', label: 'لبان' },
  ring: { id: 'ring', emoji: '💍', label: 'خاتم' },
  candy: { id: 'candy', emoji: '🍭', label: 'كاندي' },
  marshmallow: { id: 'marshmallow', emoji: '☁️', label: 'مارشميلو' },
}

/** What later rounds deal from. Money is always 50 or 100. */
export const PRIZE_POOL: PrizeId[] = ['money-100', 'money-50', 'chocolate', 'gum', 'ring', 'candy', 'marshmallow']
const FIRST_ROUND: PrizeId[] = ['money-100', 'money-50', 'money-5']
const FIRST_ROUND_PRIZE: PrizeId = 'money-50'

export interface GamePlay {
  round: number
  date: string
  /** The card she picked, 0–2. */
  pick: number
  /** What was under each card; `cards[pick]` is her prize. */
  cards: PrizeId[]
  createdAt: string
}

/** Cards stored before prizes had ids were plain pound amounts. */
export const toPrizeId = (card: unknown): PrizeId => (typeof card === 'number' ? (`money-${card}` as PrizeId) : (card as PrizeId))

export const gamePrize = (play: Pick<GamePlay, 'cards' | 'pick'>): Prize => PRIZES[play.cards[play.pick]] ?? PRIZES['money-50']

/** Pounds won across every round. */
export const gameTotal = (plays: GamePlay[] = []) => plays.reduce((sum, play) => sum + (gamePrize(play).pounds ?? 0), 0)

/** The round a day belongs to, or null before the game started. */
export const roundFor = (date: string) => (date < GAME_START ? null : Math.floor(diffDays(GAME_START, date) / GAME_EVERY_DAYS))

/** First day of a round. */
export const roundStart = (round: number) => addDays(GAME_START, round * GAME_EVERY_DAYS)

/** Today's round and, if she already played it, how it went. */
export function currentGame(state: Pick<AppState, 'today' | 'profile'> & { gamePlays?: GamePlay[] }) {
  if (!state.profile.programStartDate) return null
  const round = roundFor(state.today)
  if (round === null) return null
  return { round, played: (state.gamePlays ?? []).find((play) => play.round === round) ?? null, next: roundStart(round + 1) }
}

/** Three different prizes, with hers under the card she picked. */
export function dealCards(round: number, pick: number, random: () => number = Math.random): PrizeId[] {
  if (round === 0) {
    const others = FIRST_ROUND.filter((id) => id !== FIRST_ROUND_PRIZE)
    if (random() < 0.5) others.reverse()
    return Array.from({ length: GAME_CARDS }, (_, index) => (index === pick ? FIRST_ROUND_PRIZE : others.shift()!))
  }
  const pool = [...PRIZE_POOL]
  return Array.from({ length: GAME_CARDS }, () => pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0])
}

export function validatePlay(input: unknown, state: Parameters<typeof currentGame>[0]): { round: number; pick: number } | string {
  const pick = input && typeof input === 'object' ? (input as Record<string, unknown>).pick : undefined
  if (typeof pick !== 'number' || !Number.isInteger(pick) || pick < 0 || pick >= GAME_CARDS) return 'pick must be 0, 1 or 2'
  const game = currentGame(state)
  if (!game) return 'the game has not started yet'
  if (game.played) return 'already played this round'
  return { round: game.round, pick }
}
