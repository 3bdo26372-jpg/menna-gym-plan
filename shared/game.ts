import { addDays, diffDays } from './date'
import type { AppState } from './types'

/**
 * اللعبة: three face-down cards hiding 100, 50 and 5 Egyptian pounds (real
 * money from him, not app points). She picks one and wins what is under it;
 * the other two then turn over too. There is one round every 5 days, playable on any day of its window. The first round
 * always lands on 50; later rounds are random. The server decides, so a
 * reload can't change the result.
 */
export const GAME_START = '2026-10-11'
export const GAME_EVERY_DAYS = 5
export const GAME_PRIZES = [100, 50, 5] as const
export const FIRST_ROUND_PRIZE = 50
export const GAME_CARDS = 3

export interface GamePlay {
  round: number
  date: string
  /** The card she picked, 0–2. */
  pick: number
  /** What was under each card; `cards[pick]` is her prize. */
  cards: number[]
  createdAt: string
}

export const gamePrize = (play: Pick<GamePlay, 'cards' | 'pick'>) => play.cards[play.pick]

/** Pounds won across every round. */
export const gameTotal = (plays: GamePlay[] = []) => plays.reduce((sum, play) => sum + gamePrize(play), 0)

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

/** The cards for a pick: the prize under her card, the other two shuffled under the rest. */
export function dealCards(round: number, pick: number, random: () => number = Math.random) {
  const prize = round === 0 ? FIRST_ROUND_PRIZE : GAME_PRIZES[Math.floor(random() * GAME_PRIZES.length)]
  const others = GAME_PRIZES.filter((value) => value !== prize)
  if (random() < 0.5) others.reverse()
  return Array.from({ length: GAME_CARDS }, (_, index) => (index === pick ? prize : others.shift()!))
}

export function validatePlay(input: unknown, state: Parameters<typeof currentGame>[0]): { round: number; pick: number } | string {
  const pick = input && typeof input === 'object' ? (input as Record<string, unknown>).pick : undefined
  if (typeof pick !== 'number' || !Number.isInteger(pick) || pick < 0 || pick >= GAME_CARDS) return 'pick must be 0, 1 or 2'
  const game = currentGame(state)
  if (!game) return 'the game has not started yet'
  if (game.played) return 'already played this round'
  return { round: game.round, pick }
}
