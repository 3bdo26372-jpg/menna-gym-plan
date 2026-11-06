import { useState } from 'react'
import { Check, Pencil, Pill as PillIcon, Trash2 } from 'lucide-react'
import { addDays, cairoTime, formatDateShort, sayTime } from '../../shared/date'
import { PILL_NAME_MAX, PILL_TIME_FROM, PILL_TIME_UNTIL, pillsDue, pillsOn, pillTaken, validatePill, type Pill } from '../../shared/pills'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

export const sayPillTime = (time: string) => sayTime(Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)))

const failed = (caught: unknown) => (caught instanceof Error ? caught.message : 'تعذّر الحفظ')

/** A pill's name and time: a new one, or changing one she has. */
export function PillForm({ pill, onDone }: { pill?: Pill; onDone?: () => void }) {
  const { addPill, updatePill } = useAppData()
  const [name, setName] = useState(pill?.name ?? '')
  const [time, setTime] = useState(pill?.time ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draft = validatePill({ name, time })
  const valid = typeof draft !== 'string'

  async function save() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      if (pill) await updatePill(pill.id, draft.name, draft.time)
      else await addPill(draft.name, draft.time)
      setName('')
      setTime('')
      onDone?.()
    } catch (caught) {
      setError(failed(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="sleep-form" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <label className="field">
        <span>اسم البرشامة</span>
        <input type="text" value={name} maxLength={PILL_NAME_MAX} placeholder="مثلًا: فيتامين د، أو برشامة بعد الغدا" required onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>بتاخديها الساعة كام؟</span>
        <input type="time" value={time} min={PILL_TIME_FROM} max={PILL_TIME_UNTIL} required onChange={(event) => setTime(event.target.value)} />
      </label>
      <div className="sleep-actions">
        <button type="submit" className="button primary" disabled={!valid || busy}>{busy ? 'لحظة…' : pill ? 'احفظي' : 'ضيفيها'}</button>
        {onDone && <button type="button" className="link-button" onClick={onDone}>إلغاء</button>}
      </div>
      {error && <Notice tone="care">{error}</Notice>}
    </form>
  )
}

/** One pill on a day: its time and "خدتها"; on the pills page also changing or removing it. */
export function PillRow({ state, date, pill, editable = false }: { state: AppState; date: string; pill: Pill; editable?: boolean }) {
  const { savePillDose, removePill } = useAppData()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taken = pillTaken(state.pillDoses, date, pill.id)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(failed(caught))
    } finally {
      setBusy(false)
    }
  }

  if (editing) return <li className="pill-row is-editing"><PillForm pill={pill} onDone={() => setEditing(false)} /></li>
  return (
    <li className={`pill-row${taken ? ' is-taken' : ''}`}>
      <span aria-hidden="true">💊</span>
      <div>
        <strong>{pill.name}</strong>
        <small>الساعة {sayPillTime(pill.time)}</small>
      </div>
      {taken
        ? <button type="button" className="chip soft" disabled={busy} onClick={() => void run(() => savePillDose(date, pill.id, false))} aria-label={`إلغاء: ${pill.name} اتاخدت`}><Check /> خدتيها</button>
        : <button type="button" className="button primary small-button" disabled={busy} onClick={() => void run(() => savePillDose(date, pill.id, true))}><Check /> {busy ? 'لحظة…' : 'خدتها'}</button>}
      {editable && (
        <div className="pill-tools">
          <button type="button" className="link-button" onClick={() => setEditing(true)}><Pencil /> غيّري</button>
          {confirming
            ? <>
                <button type="button" className="link-button danger" disabled={busy} onClick={() => void run(() => removePill(pill.id))}>أيوه، شيليها</button>
                <button type="button" className="link-button" onClick={() => setConfirming(false)}>لأ</button>
              </>
            : <button type="button" className="link-button danger" onClick={() => setConfirming(true)}><Trash2 /> شيليها</button>}
        </div>
      )}
      {error && <Notice tone="care">{error}</Notice>}
    </li>
  )
}

/** On the home page only while a pill whose time has come is still waiting. */
export function PillsCard({ state }: { state: AppState }) {
  if (!state.pills || !state.profile.programStartDate) return null
  const due = pillsDue(state.pills, state.pillDoses, state.today, cairoTime())
  if (!due.length) return null
  return (
    <Card className="soft-card">
      <h2 className="card-title"><PillIcon /> وقت البرشام 💊</h2>
      <ul className="pill-list">{due.map((pill) => <PillRow key={pill.id} state={state} date={state.today} pill={pill} />)}</ul>
    </Card>
  )
}

/** The last days: the pills she took on each one. */
export function PillHistory({ state, days }: { state: AppState; days: number }) {
  const dates = Array.from({ length: days }, (_, index) => addDays(state.today, -(index + 1)))
    .filter((date) => pillsOn(state.pills, date).length > 0 && state.days.some((day) => day.date === date))
  if (!dates.length) return <p className="muted small">لسه مفيش أيام فاتت فيها برشام.</p>
  return (
    <ul className="sleep-history">
      {dates.map((date) => (
        <li key={date}>
          <strong>{formatDateShort(date)}</strong>
          {pillsOn(state.pills, date).map((pill) => <span key={pill.id}>{pill.name} {pillTaken(state.pillDoses, date, pill.id) ? '✅' : '—'}</span>)}
        </li>
      ))}
    </ul>
  )
}
