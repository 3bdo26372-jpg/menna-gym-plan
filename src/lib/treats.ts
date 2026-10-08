import { useSyncExternalStore } from 'react'
import { canTakePass, isPeriodPassDate, unusedGifts, type PassGift } from '../../shared/dayPasses'
import { diffDays } from '../../shared/date'
import type { AppState } from '../../shared/types'
import { storage } from './storage'

/**
 * Treats are the passes wrapped as chocolate: gifted passes, and the free
 * pass on each of the first days of a period (today's only, so each day
 * brings its own). Whether one was unwrapped is kept on this device.
 */
export type Treat =
  | { id: string; kind: 'gift'; gift: PassGift }
  | { id: string; kind: 'period'; date: string; periodDay: number }

const key = (id: string) => `menna-flow:treat-opened:${id}`
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** Gifts opened before treats existed were kept under their own key. */
const legacyKey = (id: string) => (id.startsWith('gift-') ? `menna-flow:gift-opened:${id.slice(5)}` : null)

export function isTreatOpened(id: string) {
  const legacy = legacyKey(id)
  return storage.get(key(id)) === '1' || (legacy !== null && storage.get(legacy) === '1')
}

export function openTreat(id: string) {
  storage.set(key(id), '1')
  listeners.forEach((listener) => listener())
}

/** Re-renders when this treat is unwrapped anywhere on the page. */
export const useTreatOpened = (id: string) => useSyncExternalStore(subscribe, () => isTreatOpened(id))

export const giftTreatId = (gift: PassGift) => `gift-${gift.id}`

export function treatsFor(state: AppState): Treat[] {
  const treats: Treat[] = unusedGifts(state).map((gift) => ({ id: giftTreatId(gift), kind: 'gift', gift }))
  const today = state.days.find((day) => day.date === state.today)
  const start = (state.periods ?? []).filter((entry) => entry.startDate <= state.today).at(-1)
  if (today && start && isPeriodPassDate(state, state.today) && canTakePass(today)) {
    treats.push({ id: `period-${state.today}`, kind: 'period', date: state.today, periodDay: diffDays(start.startDate, state.today) + 1 })
  }
  return treats
}
