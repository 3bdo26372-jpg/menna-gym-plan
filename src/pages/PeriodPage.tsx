import { useState } from 'react'
import { CalendarHeart, Pencil, Trash2 } from 'lucide-react'
import { addDays, formatDateShort } from '../../shared/date'
import {
  DEFAULT_PERIOD_DAYS, MAX_PAST_DAYS, MAX_PERIOD_DAYS, nearbyStart, nextEntry, periodForecast, periodLength, upcomingStarts, WARN_DAYS_BEFORE,
  type PeriodEntry,
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

      <LogForm periods={state.periods} today={state.today} />

      <Card id="section-months">
        <h2 className="card-title"><CalendarHeart /> كل شهر</h2>
        {history.length ? (
          <>
            <div className="table-wrap">
              <table className="compare-table period-table">
                <thead>
                  <tr><th scope="col">الشهر</th><th scope="col">جه يوم</th><th scope="col">خلص يوم</th><th scope="col">المدة</th></tr>
                </thead>
                <tbody>
                  {history.map((entry) => <PeriodRow key={entry.id} entry={entry} periods={state.periods} today={state.today} />)}
                </tbody>
              </table>
            </div>
            <p className="muted small">دوسي على يوم ما خلص عشان تسجّليه أو تعدّليه، أو تمسحي الشهر لو اتسجل غلط.</p>
          </>
        ) : (
          <EmptyState icon={<CalendarHeart />} title="لسه مفيش حاجة متسجلة">سجّلي آخر مرة البريود جه فيها من فوق.</EmptyState>
        )}
      </Card>

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
    </div>
  )
}

const monthFormat = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'UTC', month: 'long', year: 'numeric' })
const formatMonth = (date: string) => monthFormat.format(new Date(`${date}T00:00:00Z`))
const earlier = (a: string, b: string) => (a < b ? a : b)

/** The last day an end can be: within the longest period, before the next start, and not after today. */
function lastEndDay(entry: Pick<PeriodEntry, 'startDate'>, next: PeriodEntry | null, today: string) {
  const limit = earlier(addDays(entry.startDate, MAX_PERIOD_DAYS - 1), today)
  return next ? earlier(limit, addDays(next.startDate, -1)) : limit
}

function LogForm({ periods, today }: { periods: PeriodEntry[]; today: string }) {
  const { addPeriod } = useAppData()
  // Empty when today is already logged, so the form doesn't open on a clash.
  const [start, setStart] = useState(nearbyStart(periods, today) ? '' : today)
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  const clash = start ? nearbyStart(periods, start) : null
  const maxEnd = start ? lastEndDay({ startDate: start }, periods.find((item) => item.startDate > start) ?? null, today) : today
  const badEnd = Boolean(start && end && (end < start || end > maxEnd))

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      await addPeriod(start, end || undefined)
      setStart('')
      setEnd('')
      setMessage({ tone: 'success', text: 'اتسجل ✓' })
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card id="section-log">
      <h2 className="card-title">سجّلي</h2>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <div className="period-dates">
          <label className="field">
            <span>جه يوم</span>
            <input type="date" value={start} min={addDays(today, -MAX_PAST_DAYS)} max={today} required onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="field">
            <span>خلص يوم <small>(لو خلص)</small></span>
            <input type="date" value={end} min={start || undefined} max={maxEnd} onChange={(event) => setEnd(event.target.value)} />
          </label>
        </div>
        <p className="muted small">لو بتسجّلي شهر فات حطي اليومين، ولو لسه مخلصش سيبي «خلص يوم» فاضي وسجّليه بعدين من الجدول.</p>
        {clash && <Notice tone="care">فيه بريود متسجل جه يوم {formatDateShort(clash.startDate)}، قريب أوي من التاريخ ده. لو التاريخ القديم غلط امسحيه من الجدول الأول.</Notice>}
        {badEnd && <Notice tone="care">يوم ما خلص لازم يكون من يوم ما جه لحد {formatDateShort(maxEnd)}.</Notice>}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <button type="submit" className="button primary" disabled={busy || !start || Boolean(clash) || badEnd}>{busy ? 'جاري الحفظ…' : 'سجّلي'}</button>
      </form>
    </Card>
  )
}

/** One month in the table. Tapping its end opens a row under it to set the end or delete the month. */
function PeriodRow({ entry, periods, today }: { entry: PeriodEntry; periods: PeriodEntry[]; today: string }) {
  const { endPeriod, deletePeriod } = useAppData()
  const maxEnd = lastEndDay(entry, nextEntry(periods, entry), today)
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')
  const [end, setEnd] = useState(entry.endDate ?? earlier(addDays(entry.startDate, DEFAULT_PERIOD_DAYS - 1), maxEnd))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const length = periodLength(entry)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setMode('view')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr>
        <th scope="row">{formatMonth(entry.startDate)}</th>
        <td>{formatDateShort(entry.startDate)}</td>
        <td>
          <button type="button" className="link-button" aria-expanded={mode !== 'view'} onClick={() => { setError(null); setMode(mode === 'view' ? 'edit' : 'view') }}>
            {entry.endDate ? <>{formatDateShort(entry.endDate)} <Pencil /></> : 'سجّلي'}
          </button>
        </td>
        <td>{length ? dayCount(length) : '—'}</td>
      </tr>
      {mode !== 'view' && (
        <tr className="period-row-edit">
          <td colSpan={4}>
            {mode === 'edit' ? (
              <>
                <form className="period-row-form" onSubmit={(event) => { event.preventDefault(); void run(() => endPeriod(entry.id, end)) }}>
                  <label className="field">
                    <span>خلص يوم</span>
                    <input type="date" value={end} min={entry.startDate} max={maxEnd} required onChange={(event) => setEnd(event.target.value)} />
                  </label>
                  <span className="spend-confirm">
                    <button type="submit" className="button primary" disabled={busy || !end || end === entry.endDate}>{busy ? 'لحظة…' : 'حفظ'}</button>
                    <button type="button" className="link-button" disabled={busy} onClick={() => setMode('view')}>إلغاء</button>
                  </span>
                </form>
                <button type="button" className="link-button danger" disabled={busy} onClick={() => setMode('delete')}><Trash2 /> امسحي الشهر ده</button>
              </>
            ) : (
              <span className="spend-confirm">
                تمسحي بريود {formatMonth(entry.startDate)}؟
                <button type="button" className="button secondary" disabled={busy} onClick={() => void run(() => deletePeriod(entry.id))}>{busy ? 'لحظة…' : 'امسحي'}</button>
                <button type="button" className="link-button" disabled={busy} onClick={() => setMode('view')}>إلغاء</button>
              </span>
            )}
            {error && <Notice tone="care">{error}</Notice>}
          </td>
        </tr>
      )}
    </>
  )
}
