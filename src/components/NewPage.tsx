import { useEffect, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { addDays, cairoTime } from '../../shared/date'
import { FOOD_CATEGORIES } from '../../shared/food'
import { foodNotes, foodReview, mealForHour, mealIdeas, newPagePeriod, REVIEW_DAYS, type MealCategory, type MealIdea } from '../../shared/meals'
import { NICKNAMES, withNickname } from '../../shared/nicknames'
import { EARN } from '../../shared/points'
import type { AppState } from '../../shared/types'
import { storage } from '../lib/storage'
import { useAppData } from '../state/AppData'
import { Card, ChoiceGroup, Notice } from './ui'

const MEAL_OPTIONS = FOOD_CATEGORIES.filter((category) => category.id !== 'drink')
  .map((category) => ({ value: category.id as MealCategory, label: category.label, emoji: category.emoji }))

const seenKey = (periodId: number) => `menna-flow:new-page:${periodId}`
/** The card keeps to the few notes that matter most. */
const MAX_NOTES = 3

/** What the card says after a period, one line per visit, in this order. */
function newPageMessages(state: AppState) {
  const dates = Array.from({ length: REVIEW_DAYS }, (_, index) => addDays(state.today, -(index + 1)))
    .filter((date) => state.days.some((day) => day.date === date))
  const notes = foodNotes(foodReview(state.foodEntries, dates)).slice(0, MAX_NOTES)
  return [
    'جسمك دلوقتي في أحلى أيامه: طاقة أعلى وبيحرق أحسن 💪',
    ...(notes.length ? notes.map((note) => `🍽️ ${note}`) : ['🍽️ أكلك الأيام اللي فاتت كان حلو، كمّلي كده 😍']),
    `😴 تسجيل النوم بقى عليه ${EARN.sleep} نقط كل يوم 🎁`,
  ]
}

/** How many of the card's lines she has seen for the latest period, on this phone. */
const seenCount = (periodId: number) => Number(storage.get(seenKey(periodId)) ?? 0) || 0

/** Whether she has already seen every line of the card for the latest period. */
export function isNewPageDismissed(state: AppState) {
  const period = newPagePeriod(state.periods, state.today)
  return period ? seenCount(period.id) >= newPageMessages(state).length : false
}

/**
 * "صفحة جديدة": once she marks a period as ended, the home page starts the
 * next days fresh. Each visit shows one short line, the next one each time
 * she comes back, until she has seen them all; then the card is gone.
 */
export function NewPageCard({ state }: { state: AppState }) {
  const period = newPagePeriod(state.periods, state.today)
  // The line for this visit is fixed when the card appears; the next visit gets the next one.
  const [index] = useState(() => (period ? seenCount(period.id) : 0))
  useEffect(() => {
    if (period) storage.set(seenKey(period.id), String(index + 1))
  }, [period, index])
  const messages = newPageMessages(state)
  if (!period || index >= messages.length) return null

  const seed = [...state.today].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const nick = NICKNAMES[seed % NICKNAMES.length]
  return (
    <Card className="new-page-card">
      <h2 className="card-title">{withNickname('خلص البريود، يلا نبدأ صفحة جديدة يا {nick} 🤍', nick)}</h2>
      <p>{messages[index]}</p>
    </Card>
  )
}

/** A few meals to pick from for the meal she chooses; she can ask for others or log one she ate. */
export function MealIdeas({ state }: { state: AppState }) {
  const [category, setCategory] = useState<MealCategory>(() => mealForHour(Number(cairoTime().slice(0, 2))))
  const [round, setRound] = useState(0)

  function choose(next: MealCategory) {
    setCategory(next)
    setRound(0)
  }

  return (
    <div className="meal-ideas">
      <ChoiceGroup legend="تاكلي إيه؟" options={MEAL_OPTIONS} value={category} onChange={choose} columns={4} />
      <ul className="tip-list">
        {mealIdeas(category, round, state.foodEntries).map((meal) => <MealRow key={meal.item} date={state.today} category={category} meal={meal} />)}
      </ul>
      <button type="button" className="link-button" onClick={() => setRound((value) => value + 1)}>
        <RefreshCw /> مش عاجباني، اختيارات تانية
      </button>
    </div>
  )
}

function MealRow({ date, category, meal }: { date: string; category: MealCategory; meal: MealIdea }) {
  const { addFood } = useAppData()
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function log() {
    setState('busy')
    setError(null)
    try {
      await addFood(date, { time: cairoTime(), category, item: meal.item })
      setState('done')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
      setState('idle')
    }
  }

  return (
    <li className="tip">
      <span className="tip-emoji" aria-hidden="true">{meal.emoji}</span>
      <div className="tip-copy">
        <strong>{meal.item}</strong>
        {meal.mine && <span className="chip soft">💗 من أكلك</span>}
        {state === 'done'
          ? <span className="chip soft"><Check /> اتسجلت في أكلك</span>
          : (
            <button type="button" className="button secondary small-button" disabled={state === 'busy'} onClick={() => void log()}>
              <Check /> {state === 'busy' ? 'لحظة…' : 'أكلتها'}
            </button>
          )}
        {error && <Notice tone="care">{error}</Notice>}
      </div>
    </li>
  )
}
