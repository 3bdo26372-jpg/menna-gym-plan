import { useState } from 'react'
import { CalendarHeart, Trash2 } from 'lucide-react'
import { addDays, diffDays, formatDateFull, formatDateShort } from '../../shared/date'
import {
  countsAsCycle, currentPeriod, MAX_PAST_DAYS, MAX_PERIOD_DAYS, nearbyStart, nextEntry, periodForecast, periodLength, upcomingStarts,
  WARN_DAYS_BEFORE, type PeriodEntry,
} from '../../shared/period'
import { dayCount, inDays, PeriodCard } from '../components/PeriodCard'
import { Card, EmptyState, Notice, PageHeader, StatTile } from '../components/ui'
import { useAppData, useAppState } from '../state/AppData'

export function PeriodPage() {
  const state = useAppState()
  const forecast = periodForecast(state.periods, state.today)
  const history = [...state.periods].sort((a, b) => b.startDate.localeCompare(a.startDate))
  const loggedLengths = state.periods.some((entry) => entry.endDate)
  return (
    <div className="page">
      <PageHeader eyebrow="البريود" title="متابعة البريود">
        <p>سجّلي اليوم اللي البريود بيبدأ فيه، وإحنا نحسب ميعاد اللي جاي من مواعيدك انتي وننبّهك في الصفحة الرئيسية قبلها بـ {WARN_DAYS_BEFORE} أيام.</p>
      </PageHeader>

      <PeriodCard state={state} forecast={forecast} onPage />

      {forecast.nextStart && forecast.daysUntil !== null && (
        <Card>
          <h2 className="card-title"><CalendarHeart /> الحسبة</h2>
          <div className="stat-grid">
            <StatTile
              label="البريود الجاي" value={formatDateShort(forecast.nextStart)} tone="accent"
              hint={forecast.daysUntil < 0 ? `متأخر ${dayCount(-forecast.daysUntil)}` : inDays(forecast.daysUntil)}
            />
            <StatTile
              label="من بريود للتاني" value={forecast.cycleDays} unit="يوم"
              hint={forecast.cyclesUsed ? `متوسط آخر ${forecast.cyclesUsed === 1 ? 'مرة' : `${forecast.cyclesUsed} مرات`}` : 'افتراضي لحد ما تسجّلي مرتين'}
            />
            <StatTile
              label="مدة البريود" value={forecast.periodDays} unit={forecast.periodDays >= 3 && forecast.periodDays <= 10 ? 'أيام' : 'يوم'}
              hint={loggedLengths ? 'من اللي سجّلتيه' : 'افتراضي لحد ما تسجّلي النهاية'}
            />
          </div>
          <div className="summary-chips" aria-label="المواعيد الجاية المتوقعة">
            <span className="muted small">المواعيد الجاية:</span>
            {upcomingStarts(forecast).map((date) => <span key={date} className="chip soft">{formatDateShort(date)}</span>)}
          </div>
          <p className="muted small">الحسبة تقريبية: البريود ممكن ييجي قبل أو بعد ميعاده بكام يوم، وكل ما تسجّلي أكتر الحسبة بتبقى أدق.</p>
        </Card>
      )}

      <LogForms periods={state.periods} today={state.today} />

      <Card>
        <h2 className="card-title">السجل</h2>
        {history.length ? (
          <ul className="history-list">
            {history.map((entry) => <HistoryItem key={entry.id} entry={entry} periods={state.periods} />)}
          </ul>
        ) : (
          <EmptyState icon={<CalendarHeart />} title="لسه مفيش حاجة متسجلة">سجّلي آخر مرة البريود بدأ فيها من فوق.</EmptyState>
        )}
      </Card>
    </div>
  )
}

function LogForms({ periods, today }: { periods: PeriodEntry[]; today: string }) {
  const { addPeriod, endPeriod } = useAppData()
  const current = currentPeriod(periods, today)
  // Empty when today is already logged, so the form doesn't open on a clash.
  const [start, setStart] = useState(nearbyStart(periods, today) ? '' : today)
  const [end, setEnd] = useState(current?.endDate ?? today)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  const clash = start ? nearbyStart(periods, start) : null
  const lastEndDay = current ? (addDays(current.startDate, MAX_PERIOD_DAYS - 1) < today ? addDays(current.startDate, MAX_PERIOD_DAYS - 1) : today) : today

  async function run(action: () => Promise<void>, success: string, after?: () => void) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      after?.()
      setMessage({ tone: 'success', text: success })
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card id="section-log">
      <h2 className="card-title">سجّلي</h2>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void run(() => addPeriod(start), 'اتسجلت البداية ✓', () => setStart('')) }}>
        <label className="field narrow">
          <span>البريود بدأ يوم</span>
          <input type="date" value={start} min={addDays(today, -MAX_PAST_DAYS)} max={today} required onChange={(event) => setStart(event.target.value)} />
        </label>
        {clash && <Notice tone="care">فيه بريود متسجل بدأ يوم {formatDateShort(clash.startDate)}، قريب أوي من التاريخ ده. لو التاريخ القديم غلط امسحيه من السجل الأول.</Notice>}
        <button type="submit" className="button primary" disabled={busy || !start || Boolean(clash)}>{busy ? 'جاري الحفظ…' : 'سجّلي البداية'}</button>
      </form>
      {current && (
        <form className="form-stack period-end-form" onSubmit={(event) => { event.preventDefault(); void run(() => endPeriod(current.id, end), 'اتسجلت النهاية ✓') }}>
          <label className="field narrow">
            <span>آخر يوم في البريود اللي بدأ {formatDateShort(current.startDate)}</span>
            <input type="date" value={end} min={current.startDate} max={lastEndDay} required onChange={(event) => setEnd(event.target.value)} />
          </label>
          <button type="submit" className="button secondary" disabled={busy || !end || end === current.endDate}>
            {current.endDate ? 'عدّلي النهاية' : 'سجّلي النهاية'}
          </button>
        </form>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </Card>
  )
}

function HistoryItem({ entry, periods }: { entry: PeriodEntry; periods: PeriodEntry[] }) {
  const { deletePeriod } = useAppData()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const length = periodLength(entry)
  const next = nextEntry(periods, entry)
  const cycle = next ? diffDays(entry.startDate, next.startDate) : null
  return (
    <li>
      <div className="history-date">{formatDateFull(entry.startDate)}</div>
      <div className="history-values">
        <span className="chip soft">{length ? `${dayCount(length)}${entry.endDate ? ` · لحد ${formatDateShort(entry.endDate)}` : ''}` : 'النهاية مش متسجلة'}</span>
        {/* A gap left out of the average usually means a start wasn't logged. */}
        {cycle !== null && <span className="chip soft">لحد اللي بعده {cycle} يوم{countsAsCycle(cycle) ? '' : ' (مش محسوب في المتوسط)'}</span>}
      </div>
      {confirming ? (
        <span className="spend-confirm">
          تمسحيه؟
          <button type="button" className="button secondary" disabled={busy} onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await deletePeriod(entry.id)
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'تعذّر المسح')
            } finally {
              setBusy(false)
              setConfirming(false)
            }
          }}>{busy ? 'لحظة…' : 'امسحي'}</button>
          <button type="button" className="link-button" disabled={busy} onClick={() => setConfirming(false)}>إلغاء</button>
        </span>
      ) : (
        <button type="button" className="link-button danger" onClick={() => setConfirming(true)}><Trash2 /> امسحي</button>
      )}
      {error && <Notice tone="care">{error}</Notice>}
    </li>
  )
}
