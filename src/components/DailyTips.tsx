import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Moon } from 'lucide-react'
import { cairoTime } from '../../shared/date'
import { formatSleep, sleepMinutes, validateSleep, type SleepLog } from '../../shared/sleep'
import { dailyTips, type Drink, type Tip } from '../../shared/tips'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

/** The Cairo hour, refreshed every few minutes so evening tips switch on time. */
function useHour() {
  const read = () => Number(cairoTime().slice(0, 2))
  const [hour, setHour] = useState(read)
  useEffect(() => {
    const timer = window.setInterval(() => setHour(read()), 300_000)
    return () => window.clearInterval(timer)
  }, [])
  return hour
}

/** طلبات النهارده: small asks for today, from her log and her cycle. */
export function DailyTips({ state }: { state: AppState }) {
  const hour = useHour()
  const [editingSleep, setEditingSleep] = useState(false)
  const tips = dailyTips(state, hour)
  const sleep = state.days.find((day) => day.date === state.today)?.sleep ?? null
  if (!tips.length && !sleep) return null

  return (
    <Card className="tips-card" id="section-tips">
      <h2 className="card-title">💌 طلبات النهارده</h2>
      <ul className="tip-list">
        {tips.map((tip) => (
          <li key={tip.id} className={`tip tip-${tip.id}`}>
            <span className="tip-emoji" aria-hidden="true">{tip.emoji}</span>
            <div className="tip-copy">
              <strong>{tip.title}</strong>
              <p>{tip.text}</p>
              {tip.id === 'sleep-log' && <SleepForm date={state.today} current={null} />}
              {tip.drink && <DrinkButton date={state.today} drink={tip.drink} />}
              {tip.href && <a className="text-link" href={tip.href}>{linkLabel(tip)} <ChevronLeft /></a>}
            </div>
          </li>
        ))}
      </ul>
      {sleep && (editingSleep
        ? <SleepForm date={state.today} current={sleep} onDone={() => setEditingSleep(false)} />
        : (
          <div className="sleep-summary">
            <span className="chip soft"><Moon /> نمتي {sleep.sleptAt} · صحيتي {sleep.wokeAt} · {formatSleep(sleepMinutes(sleep))}</span>
            <button type="button" className="link-button" onClick={() => setEditingSleep(true)}>تعديل</button>
          </div>
        ))}
    </Card>
  )
}

function linkLabel(tip: Tip) {
  if (tip.id === 'measure') return 'سجّلي الوزن والمقاسات'
  if (tip.id === 'period-log') return 'سجّلي البريود'
  if (tip.id === 'water') return 'سجّلي مية'
  return 'شوفي أكلك'
}

function DrinkButton({ date, drink }: { date: string; drink: Drink }) {
  const { addFood } = useAppData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function log() {
    setBusy(true)
    setError(null)
    try {
      await addFood(date, { time: cairoTime(), category: 'drink', item: drink.item })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" className="button secondary small-button" disabled={busy} onClick={() => void log()}>
        <Check /> {busy ? 'لحظة…' : 'شربته'}
      </button>
      {error && <Notice tone="care">{error}</Notice>}
    </>
  )
}

function SleepForm({ date, current, onDone }: { date: string; current: SleepLog | null; onDone?: () => void }) {
  const { saveSleep } = useAppData()
  const [sleptAt, setSleptAt] = useState(current?.sleptAt ?? '')
  const [wokeAt, setWokeAt] = useState(current?.wokeAt ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draft = sleptAt && wokeAt ? validateSleep({ sleptAt, wokeAt }) : null
  const valid = draft !== null && typeof draft !== 'string'

  async function save() {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await saveSleep(date, draft)
      onDone?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="sleep-form" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <label className="field">
        <span>نمتي الساعة</span>
        <input type="time" value={sleptAt} required onChange={(event) => setSleptAt(event.target.value)} />
      </label>
      <label className="field">
        <span>صحيتي الساعة</span>
        <input type="time" value={wokeAt} required onChange={(event) => setWokeAt(event.target.value)} />
      </label>
      {valid && <p className="muted small">يعني {formatSleep(sleepMinutes(draft))} نوم</p>}
      {typeof draft === 'string' && <p className="muted small">الوقت ده طويل قوي لليلة واحدة، راجعيه.</p>}
      <div className="sleep-actions">
        <button type="submit" className="button primary" disabled={!valid || busy}>{busy ? 'لحظة…' : 'سجّلي'}</button>
        {onDone && <button type="button" className="link-button" onClick={onDone}>إلغاء</button>}
      </div>
      {error && <Notice tone="care">{error}</Notice>}
    </form>
  )
}
