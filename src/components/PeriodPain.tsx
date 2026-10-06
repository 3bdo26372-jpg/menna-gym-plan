import { useState } from 'react'
import { isPainRest, PAIN_REST_ABOVE } from '../../shared/period'
import { WORKOUT_SHARE } from '../../shared/scoring'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { ChoiceGroup, Notice, type ChoiceOption } from './ui'

const LEVELS: ChoiceOption<number>[] = Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))

/** Rate a day's period pain 1–10; one tap saves it. */
export function PainScale({ date, current, legend = 'وجع البريود من 10', onSaved }: {
  date: string
  current: number | null
  legend?: string
  onSaved?: () => void
}) {
  const { savePeriodPain } = useAppData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(level: number | null) {
    setBusy(true)
    setError(null)
    try {
      await savePeriodPain(date, level)
      onSaved?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pain-scale" aria-busy={busy}>
      <ChoiceGroup legend={legend} options={LEVELS} value={current} onChange={(level) => void save(level)} columns={5} />
      <p className="muted small">1 خفيف و10 جامد. لو أكتر من {PAIN_REST_ABOVE}، النهارده راحة ونقط التمرين ({WORKOUT_SHARE}) محسوبة لك، ولو حبيتي تتمرني التمرين هيبقى صغنون.</p>
      {current !== 0 && <button type="button" className="link-button" disabled={busy} onClick={() => void save(0)}>مفيش وجع</button>}
      {error && <Notice tone="care">{error}</Notice>}
    </div>
  )
}

/** Today's pain in the period card: a button that opens the 1–10 scale, or the rating once logged. */
export function PainCheck({ state }: { state: AppState }) {
  const today = state.days.find((day) => day.date === state.today)
  const [editing, setEditing] = useState(false)
  if (!today) return null
  const pain = today.periodPain ?? null

  if (pain !== null && !editing) {
    return (
      <div className="pain-summary">
        <span className={`chip ${isPainRest(pain) ? '' : 'soft'}`}>{pain ? `وجع النهارده ${pain}/10` : 'مفيش وجع النهارده ✓'}</span>
        {isPainRest(pain) && <span className="small">النهارده راحة 🌸 نقط التمرين محسوبة لك</span>}
        <button type="button" className="link-button" onClick={() => setEditing(true)}>تعديل</button>
      </div>
    )
  }
  if (!editing) {
    return <button type="button" className="button secondary" onClick={() => setEditing(true)}>عندي وجع بريود 🌸</button>
  }
  return (
    <>
      <PainScale date={state.today} current={pain} legend="الوجع قد إيه من 10؟" onSaved={() => setEditing(false)} />
      <button type="button" className="link-button" onClick={() => setEditing(false)}>إلغاء</button>
    </>
  )
}
