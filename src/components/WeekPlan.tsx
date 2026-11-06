import { useState } from 'react'
import { Moon } from 'lucide-react'
import { canChooseRest, currentWeek, weekInput, type TrainingWeek, type WeekDay } from '../../shared/week'
import type { AppState } from '../../shared/types'
import { Card } from './ui'
import { useAppData } from '../state/AppData'

const WEEKDAYS = ['حد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة', 'سبت']
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]

export const workoutsSaid = (count: number) => (count === 1 ? 'تمرين واحد' : count === 2 ? 'تمرينين' : `${count} تمارين`)
export const daysSaid = (count: number) => (count === 1 ? 'يوم واحد' : count === 2 ? 'يومين' : `${count} أيام`)

const MARK: Record<WeekDay['kind'], { emoji: string; label: string }> = {
  workout: { emoji: '💪', label: 'تمرين' },
  pass: { emoji: '🎟️', label: 'إكسبشن' },
  period: { emoji: '🌸', label: 'بريود' },
  rest: { emoji: '🌙', label: 'راحة' },
  missed: { emoji: '·', label: 'من غير تمرين' },
  today: { emoji: '✨', label: 'النهارده' },
  upcoming: { emoji: '', label: 'جاي' },
}

/** Where the week stands, in one line. */
export function weekLine(week: TrainingWeek) {
  if (week.workoutsLeft === 0) return `خلّصتي ${workoutsSaid(week.target)} الأسبوع ده 🎉 الباقي راحة، ولو حابة تتحركي التمرين موجود`
  const rest = week.restLeft > 0 ? `، ومعاكي ${daysSaid(week.restLeft)} راحة تختاريهم` : ''
  if (week.workoutsLeft > week.daysLeft) return `الأسبوع ده نعمل اللي نقدر عليه، وكل تمرين بيفرق 🤍`
  return `فاضل ${workoutsSaid(week.workoutsLeft)} في ${daysSaid(week.daysLeft)}${rest}`
}

export function WeekStrip({ week }: { week: TrainingWeek }) {
  return (
    <ol className="week-strip" aria-label="أيام الأسبوع">
      {week.days.map((day) => (
        <li key={day.date} className={`week-day is-${day.kind}`} title={MARK[day.kind].label}>
          <span className="week-dot" aria-hidden="true">{MARK[day.kind].emoji}</span>
          <span className="week-name">{weekday(day.date)}</span>
          <span className="sr-only">{MARK[day.kind].label}</span>
        </li>
      ))}
    </ol>
  )
}

/** "Today is a rest day": only while the week still has one for her. */
export function RestButton({ state, className = 'button secondary' }: { state: AppState; className?: string }) {
  const { saveRestDay } = useAppData()
  const [busy, setBusy] = useState(false)
  const input = weekInput(state)
  if (!input || !canChooseRest(input, state.today)) return null
  return (
    <button type="button" className={className} disabled={busy} onClick={async () => { setBusy(true); try { await saveRestDay(state.today, true) } finally { setBusy(false) } }}>
      <Moon /> النهارده راحة
    </button>
  )
}

/** The week on the training page: how many workouts, which days, and the rest she has left. */
export function WeekCard({ state }: { state: AppState }) {
  const week = currentWeek(state)
  if (!week) return null
  return (
    <Card className="week-card">
      <div className="week-card-head">
        <div>
          <p className="eyebrow">أسبوعك · {workoutsSaid(week.target)}</p>
          <h2 className="card-title">{week.done} من {week.target} 💪</h2>
        </div>
      </div>
      <WeekStrip week={week} />
      <p className="muted small">{weekLine(week)}</p>
      {week.sensitive && <p className="muted small">الأسبوع ده قريب من البريود، فهو {workoutsSaid(week.target)} بس وراحة أكتر عشان جسمك 🤍</p>}
      <p className="muted small">إنتي اللي بتختاري أيام التمرين. أي يوم من غير تمرين بيتحسب راحة طول ما فاضل أيام راحة في الأسبوع، ويوم الراحة نقطه كاملة زي يوم التمرين.</p>
    </Card>
  )
}
