import { useState } from 'react'
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

const dismissedKey = (periodId: number) => `menna-flow:new-page:${periodId}`

/**
 * "صفحة جديدة": once she marks a period as ended, the home page starts the
 * next days fresh: a word on how she ate lately and meals to pick from.
 * It stays until she taps "يلا بينا", for up to a week after the end.
 */
export function NewPageCard({ state }: { state: AppState }) {
  const period = newPagePeriod(state.periods, state.today)
  const [dismissed, setDismissed] = useState(() => (period ? storage.get(dismissedKey(period.id)) === '1' : false))
  if (!period || dismissed) return null

  const seed = [...state.today].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const nick = NICKNAMES[seed % NICKNAMES.length]
  const dates = Array.from({ length: REVIEW_DAYS }, (_, index) => addDays(state.today, -(index + 1)))
    .filter((date) => state.days.some((day) => day.date === date))
  const notes = foodNotes(foodReview(state.foodEntries, dates))

  function dismiss() {
    storage.set(dismissedKey(period!.id), '1')
    setDismissed(true)
  }

  return (
    <Card className="new-page-card">
      <h2 className="card-title">{withNickname('خلص البريود، يلا نبدأ صفحة جديدة يا {nick} 🤍', nick)}</h2>
      <p>جسمك دلوقتي في أحلى أيامه في الشهر: طاقة أعلى وبيحرق أحسن. نرجع للتمرين، ونظبط الأكل والنوم من النهارده 💪</p>
      <p className="reward-hint"><span>😴 جديد</span>تسجيل النوم بقى عليه {EARN.sleep} نقط كل يوم، سجّليه أول ما تصحي 🎁</p>
      {notes.length > 0 ? (
        <div className="new-page-notes">
          <strong>🍽️ بس خليني أقولك على الأكل بصراحة:</strong>
          <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </div>
      ) : <p className="muted">أكلك الأيام اللي فاتت كان حلو، كمّلي كده 😍</p>}
      <p className="muted small">عشان أسهّلها عليكي، اختاري أكلك من دول، ولو مش عاجبك حاجة دوسي «اختيارات تانية» 👇</p>
      <MealIdeas state={state} />
      <button type="button" className="button primary" onClick={dismiss}>يلا بينا 💪</button>
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
        {mealIdeas(category, round).map((meal) => <MealRow key={meal.item} date={state.today} category={category} meal={meal} />)}
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
