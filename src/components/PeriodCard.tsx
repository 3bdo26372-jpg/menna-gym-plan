import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { formatDateLong, formatDateShort } from '../../shared/date'
import { nearbyStart, WARN_DAYS_BEFORE, type PeriodForecast } from '../../shared/period'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

/** "يوم", "يومين", "3 أيام", "11 يوم". */
export function dayCount(days: number) {
  if (days === 1) return 'يوم'
  if (days === 2) return 'يومين'
  return `${days} ${days >= 3 && days <= 10 ? 'أيام' : 'يوم'}`
}

/** "النهارده", "بكره", "بعد يومين", "بعد 5 أيام". */
export function inDays(days: number) {
  if (days === 0) return 'النهارده'
  if (days === 1) return 'بكره'
  return `بعد ${dayCount(days)}`
}

/** Phases that need her attention today: shown at the top of the home page. */
export const isUrgent = (forecast: PeriodForecast) => ['period', 'soon', 'due', 'late'].includes(forecast.phase)

/** Where her cycle is today, with the one-tap "started today" / "ended today". */
export function PeriodCard({ state, forecast, onPage = false }: { state: AppState; forecast: PeriodForecast; onPage?: boolean }) {
  const { addPeriod, endPeriod } = useAppData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { phase, last, nextStart, daysUntil } = forecast

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  const startedToday = !nearbyStart(state.periods, state.today) && (
    <button type="button" className="button primary" disabled={busy} onClick={() => void run(() => addPeriod(state.today))}>
      {busy ? 'لحظة…' : 'بدأ النهارده'}
    </button>
  )
  const details = !onPage && <a className="text-link" href="#/period">تفاصيل البريود <ChevronLeft /></a>
  const pickDate = <a className="text-link" href="#/period/log">بدأ يوم تاني؟ اختاري التاريخ <ChevronLeft /></a>

  if (phase === 'unknown' || !last || !nextStart || daysUntil === null) {
    return (
      <Card className="period-card">
        <span className="period-emoji" aria-hidden="true">🌸</span>
        <div>
          <h2 className="card-title">متابعة البريود</h2>
          <p className="muted small">سجّلي آخر مرة البريود بدأ فيها، وهنحسب ميعاد اللي جاي وننبّهك قبلها بـ {WARN_DAYS_BEFORE} أيام.</p>
          <a className="button secondary" href="#/period/log">سجّلي آخر مرة</a>
          {startedToday}
          {error && <Notice tone="care">{error}</Notice>}
        </div>
      </Card>
    )
  }

  if (phase === 'period') {
    return (
      <Card className="period-card">
        <span className="period-emoji" aria-hidden="true">🌸</span>
        <div>
          <h2 className="card-title">اليوم {forecast.periodDay} من البريود</h2>
          <p className="muted small">خفّفي على نفسك: لو أي تمرين تقيل دوسي «صعب؟ أسهل»، واشربي مية كتير 💧</p>
          {!last.endDate && (
            <button type="button" className="button secondary" disabled={busy} onClick={() => void run(() => endPeriod(last.id, state.today))}>
              {busy ? 'لحظة…' : 'خلص النهارده ✓'}
            </button>
          )}
          {error && <Notice tone="care">{error}</Notice>}
          {details}
        </div>
      </Card>
    )
  }

  if (phase === 'calm') {
    return (
      <Card className="period-card is-compact">
        <span className="period-emoji" aria-hidden="true">🌸</span>
        <div>
          <h2 className="card-title">البريود الجاي {inDays(daysUntil)}</h2>
          <p className="muted small">متوقع يوم {formatDateLong(nextStart)}، وهننبّهك قبلها بـ {WARN_DAYS_BEFORE} أيام.</p>
          {onPage ? pickDate : details}
        </div>
      </Card>
    )
  }

  const late = phase === 'late' ? -daysUntil : 0
  return (
    <Card className="period-card is-warning">
      <span className="period-emoji" aria-hidden="true">{late ? '🗓️' : '⏰'}</span>
      <div>
        <h2 className="card-title">{late ? `البريود متأخر ${dayCount(late)}` : `البريود متوقع ${inDays(daysUntil)}`}</h2>
        <p className="small">
          {late
            ? `كان متوقع يوم ${formatDateShort(nextStart)}. أول ما ييجي سجّليه عشان نظبط الحسبة.`
            : `متوقع يوم ${formatDateLong(nextStart)}. جهّزي حاجتك في الشنطة 👜`}
        </p>
        {late > 7 && <p className="muted small">التأخير كام يوم بيحصل عادي، ولو اتكرر أو طوّل كلّمي دكتورة.</p>}
        {startedToday}
        {error && <Notice tone="care">{error}</Notice>}
        {pickDate}
        {details}
      </div>
    </Card>
  )
}
