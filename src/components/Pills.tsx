import { useState } from 'react'
import { Check, Pencil, Pill as PillIcon, Trash2 } from 'lucide-react'
import { addDays, cairoTime, formatDateShort, sayTime } from '../../shared/date'
import { PILL_EVERY_HOURS, PILL_NAME_MAX, PILL_TIME_FROM, PILL_TIME_UNTIL, pillsDue, pillsOn, pillTaken, pillTakenCount, pillTimes, validatePill, type Pill } from '../../shared/pills'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

export const sayPillTime = (time: string) => sayTime(Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)))

/** "كل 8 ساعات: 2 الصبح، 10 الصبح، 6 المغرب", for a pill that repeats. */
export const sayPillTimes = (pill: Pick<Pill, 'time' | 'everyHours'>) =>
  `كل ${pill.everyHours} ساعات: ${[...pillTimes(pill)].sort().map(sayPillTime).join('، ')}`

const failed = (caught: unknown) => (caught instanceof Error ? caught.message : 'تعذّر الحفظ')

/** A pill's name and time: a new one, or changing one she has. */
export function PillForm({ pill, onDone }: { pill?: Pill; onDone?: () => void }) {
  const { addPill, updatePill } = useAppData()
  const [name, setName] = useState(pill?.name ?? '')
  const [time, setTime] = useState(pill?.time ?? '')
  const [everyHours, setEveryHours] = useState<number | null>(pill?.everyHours ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draft = validatePill({ name, time, everyHours })
  const valid = typeof draft !== 'string'
  // Said under the button so it never just greys out without a reason.
  const missing = valid ? null
    : !name.trim() ? 'اكتبي اسم البرشامة الأول'
    : !time ? 'اختاري الساعة اللي بتاخديها فيها'
    : time > PILL_TIME_UNTIL ? `آخر ميعاد ممكن ${sayPillTime(PILL_TIME_UNTIL)}، اختاري ${sayPillTime(PILL_TIME_UNTIL)} أو بعد 12 بالليل`
    : everyHours ? `واحدة من جرعاتها هتيجي بعد ${sayPillTime(PILL_TIME_UNTIL)}، قدّمي الساعة أو أخّريها شوية`
    : null

  async function save() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      if (pill) await updatePill(pill.id, draft.name, draft.time, draft.everyHours)
      else await addPill(draft.name, draft.time, draft.everyHours)
      setName('')
      setTime('')
      setEveryHours(null)
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
      <label className="field">
        <span>بتتكرر؟</span>
        <select value={everyHours ?? ''} onChange={(event) => setEveryHours(event.target.value ? Number(event.target.value) : null)}>
          <option value="">مرة واحدة في اليوم</option>
          {PILL_EVERY_HOURS.map((hours) => <option key={hours} value={hours}>كل {hours} ساعات</option>)}
        </select>
      </label>
      {typeof draft !== 'string' && draft.everyHours && <p className="muted small">هفكرك بيها {sayPillTimes(draft)}</p>}
      <div className="sleep-actions">
        <button type="submit" className="button primary" disabled={!valid || busy}>{busy ? 'لحظة…' : pill ? 'احفظي' : 'ضيفيها'}</button>
        {onDone && <button type="button" className="link-button" onClick={onDone}>إلغاء</button>}
      </div>
      {missing && (name || time) && <p className="muted small">{missing}</p>}
      {error && <Notice tone="care">{error}</Notice>}
    </form>
  )
}

/**
 * One dose on a day: its time and "خدتها"; on the pills page its first dose
 * (slot 0) also has changing or removing the pill.
 */
export function PillRow({ state, date, pill, slot = 0, time = pill.time, editable = false }: { state: AppState; date: string; pill: Pill; slot?: number; time?: string; editable?: boolean }) {
  const { savePillDose, removePill } = useAppData()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taken = pillTaken(state.pillDoses, date, pill.id, slot)

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
        <small>الساعة {sayPillTime(time)}{pill.everyHours ? ` · كل ${pill.everyHours} ساعات` : ''}</small>
      </div>
      {taken
        ? <button type="button" className="chip soft" disabled={busy} onClick={() => void run(() => savePillDose(date, pill.id, slot, false))} aria-label={`إلغاء: ${pill.name} اتاخدت`}><Check /> خدتيها</button>
        : <button type="button" className="button primary small-button" disabled={busy} onClick={() => void run(() => savePillDose(date, pill.id, slot, true))}><Check /> {busy ? 'لحظة…' : 'خدتها'}</button>}
      {editable && slot === 0 && (
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
      <ul className="pill-list">{due.map((dose) => <PillRow key={`${dose.pill.id}-${dose.slot}`} state={state} date={state.today} pill={dose.pill} slot={dose.slot} time={dose.time} />)}</ul>
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
          {pillsOn(state.pills, date).map((pill) => {
            const count = pillTimes(pill).length
            const taken = pillTakenCount(state.pillDoses, date, pill)
            return <span key={pill.id}>{pill.name} {taken === count ? '✅' : count > 1 ? `${taken}/${count}` : '—'}</span>
          })}
        </li>
      ))}
    </ul>
  )
}
