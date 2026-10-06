import { dateRange, formatDateShort, periodBounds } from '../../shared/date'
import type { DayRecord } from '../../shared/types'

/** Single-hue ramp: more of the day done → deeper berry. Never red for low days. */
export function scoreLevel(score: number, recorded: boolean) {
  if (!recorded) return 'future'
  if (score === 0) return 'none'
  if (score < 40) return 'l1'
  if (score < 70) return 'l2'
  if (score < 90) return 'l3'
  return 'l4'
}

export function ScoreCalendar({ days, startDate, periodIndex, today }: { days: DayRecord[]; startDate: string; periodIndex: number; today: string }) {
  const { start, end } = periodBounds(startDate, periodIndex)
  const byDate = new Map(days.map((day) => [day.date, day]))
  return (
    <div className="score-calendar" role="list" aria-label={`نقاط الشهر ${periodIndex}`}>
      {dateRange(start, end).map((date, index) => {
        const day = byDate.get(date)
        const recorded = date <= today
        const score = day?.score.total ?? 0
        return (
          <div
            role="listitem" key={date} className={`cal-cell ${scoreLevel(score, recorded)} ${date === today ? 'is-today' : ''}`}
            title={`${formatDateShort(date)} — ${recorded ? `${score} نقطة${day?.score.makeup ? ` (منها ${day.score.makeup} تعويض 💧)` : ''}${day?.score.rest ? ' · راحة البريود 🌸' : ''}` : 'لسه'}`}
          >
            <span className="cal-day">{index + 1 + (periodIndex - 1) * 30}</span>
            <span className="cal-score">{recorded ? score : ''}</span>
            <span className="sr-only">{formatDateShort(date)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ScoreLegend() {
  return (
    <div className="cal-legend" aria-hidden="true">
      <span>أقل</span>
      {['none', 'l1', 'l2', 'l3', 'l4'].map((level) => <i key={level} className={`cal-cell ${level}`} />)}
      <span>أكتر</span>
    </div>
  )
}
