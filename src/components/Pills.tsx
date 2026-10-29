import { useState } from 'react'
import { Check, Pill } from 'lucide-react'
import { addDays, cairoDate, cairoTime, formatDateShort, sayTime } from '../../shared/date'
import { PILL_MAX_DAYS, PILL_SLOTS, PILL_TIME_FROM, PILL_TIME_UNTIL, pillsDue, pillsOn, pillTaken, usualPillTime, validatePillPlan } from '../../shared/pills'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, ChoiceGroup, Notice } from './ui'

/** Her usual meal times come from this many recent days of her food log. */
const USUAL_DAYS = 30

const say = (time: string) => sayTime(Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)))

type Until = 'open' | 'date'
const UNTIL_OPTIONS: { value: Until; label: string; emoji: string }[] = [
  { value: 'open', label: 'لسه مش عارفة', emoji: '♾️' },
  { value: 'date', label: 'لحد يوم معيّن', emoji: '📅' },
]

/** When to remind her of each pill, and until which day; it starts at her usual meal times. */
export function PillPlanForm({ state, onDone }: { state: AppState; onDone?: () => void }) {
  const { savePillPlan } = useAppData()
  const plan = state.pillPlan ?? null
  const recent = state.foodEntries.filter((entry) => entry.date >= addDays(state.today, -USUAL_DAYS))
  const [times, setTimes] = useState(() => PILL_SLOTS.map((_, slot) => plan?.times[slot] ?? usualPillTime(recent, slot)))
  const [until, setUntil] = useState<Until>(plan?.until ? 'date' : 'open')
  const [date, setDate] = useState(plan?.until && plan.until >= state.today ? plan.until : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draft = validatePillPlan({ times, until: until === 'date' ? date || 'missing' : null }, state.today)
  const valid = typeof draft !== 'string'

  async function save() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await savePillPlan(draft)
      onDone?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="sleep-form" onSubmit={(event) => { event.preventDefault(); void save() }}>
      {PILL_SLOTS.map((slot, index) => (
        <label key={slot.label} className="field">
          <span>{slot.emoji} أفكرك ببرشامة {slot.label} الساعة</span>
          <input type="time" value={times[index]} min={PILL_TIME_FROM} max={PILL_TIME_UNTIL} required
            onChange={(event) => setTimes((current) => current.map((time, other) => (other === index ? event.target.value : time)))} />
        </label>
      ))}
      <ChoiceGroup legend="هتاخديهم لحد امتى؟" options={UNTIL_OPTIONS} value={until} onChange={setUntil} columns={2} />
      {until === 'date' && (
        <label className="field">
          <span>آخر يوم هتاخدي فيه البرشام</span>
          <input type="date" value={date} min={state.today} max={addDays(state.today, PILL_MAX_DAYS)} required onChange={(event) => setDate(event.target.value)} />
        </label>
      )}
      {until === 'open' && <p className="muted small">هفكرك كل يوم لحد ما تقوليلي إنك خلصتيهم 🤍</p>}
      <div className="sleep-actions">
        <button type="submit" className="button primary" disabled={!valid || busy}>{busy ? 'لحظة…' : 'فكّرني'}</button>
        {onDone && <button type="button" className="link-button" onClick={onDone}>إلغاء</button>}
      </div>
      {error && <Notice tone="care">{error}</Notice>}
    </form>
  )
}

/** One pill today: when it is, and "خدتها". */
export function PillRow({ state, date, slot }: { state: AppState; date: string; slot: number }) {
  const { savePillDose } = useAppData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taken = pillTaken(state.pillDoses, date, slot)
  const { label, emoji } = PILL_SLOTS[slot]

  async function mark(next: boolean) {
    setBusy(true)
    setError(null)
    try {
      await savePillDose(date, slot, next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={`pill-row${taken ? ' is-taken' : ''}`}>
      <span aria-hidden="true">{emoji}</span>
      <div>
        <strong>{label}</strong>
        {state.pillPlan && <small>الساعة {say(state.pillPlan.times[slot])}</small>}
      </div>
      {taken
        ? <button type="button" className="chip soft" disabled={busy} onClick={() => void mark(false)} aria-label={`إلغاء: برشامة ${label} اتاخدت`}><Check /> خدتيها</button>
        : <button type="button" className="button primary small-button" disabled={busy} onClick={() => void mark(true)}><Check /> {busy ? 'لحظة…' : 'خدتها'}</button>}
      {error && <Notice tone="care">{error}</Notice>}
    </li>
  )
}

/**
 * On the home page only when it matters: until she says when to be reminded,
 * and while a pill whose time has come is still waiting.
 */
export function PillsCard({ state }: { state: AppState }) {
  const [asking, setAsking] = useState(false)
  if (state.pillPlan === undefined || !state.profile.programStartDate) return null
  if (state.pillPlan === null) {
    return (
      <Card className="soft-card">
        <h2 className="card-title"><Pill /> عندك برشامتين 💊</h2>
        <p className="muted">واحدة بعد الفطار وواحدة بعد الغدا. قوليلي أفكرك بيهم الساعة كام، وهتاخديهم لحد امتى، وأنا هفكرك كل يوم 🤍</p>
        {asking ? <PillPlanForm state={state} onDone={() => setAsking(false)} /> : <button type="button" className="button primary" onClick={() => setAsking(true)}>اختاري المواعيد</button>}
      </Card>
    )
  }
  const due = pillsDue(state.pillPlan, state.pillDoses, state.today, cairoTime())
  if (!due.length) return null
  return (
    <Card className="soft-card">
      <h2 className="card-title"><Pill /> وقت البرشام 💊</h2>
      <ul className="pill-list">{due.map((slot) => <PillRow key={slot} state={state} date={state.today} slot={slot} />)}</ul>
    </Card>
  )
}

/** The last days, a mark per pill. */
export function PillHistory({ state, days }: { state: AppState; days: number }) {
  const plan = state.pillPlan
  if (!plan) return null
  // From when she set it up: her first ticked pill, or the plan itself.
  const since = [cairoDate(new Date(plan.updatedAt)), ...(state.pillDoses ?? []).map((dose) => dose.date)].sort()[0]
  const dates = Array.from({ length: days }, (_, index) => addDays(state.today, -(index + 1)))
    .filter((date) => date >= since && pillsOn(plan, date) && state.days.some((day) => day.date === date))
  if (!dates.length) return null
  return (
    <ul className="sleep-history">
      {dates.map((date) => (
        <li key={date}>
          <strong>{formatDateShort(date)}</strong>
          {PILL_SLOTS.map((slot, index) => <span key={slot.label}>{slot.label} {pillTaken(state.pillDoses, date, index) ? '✅' : '—'}</span>)}
        </li>
      ))}
    </ul>
  )
}
