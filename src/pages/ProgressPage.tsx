import { useState } from 'react'
import { LineChart as LineIcon } from 'lucide-react'
import { dayNumberFor, periodForDay } from '../../shared/date'
import { summaryStats } from '../../shared/engine'
import { MEASUREMENT_FIELDS } from '../../shared/measurements'
import { DailyBars, TrendChart } from '../components/Charts'
import { ScoreCalendar, ScoreLegend } from '../components/ScoreCalendar'
import { Card, EmptyState, PageHeader, StatTile } from '../components/ui'
import { useAppState } from '../state/AppData'

export function ProgressPage() {
  const state = useAppState()
  const start = state.profile.programStartDate
  const currentPeriod = start ? periodForDay(dayNumberFor(start, state.today)) : 1
  const [period, setPeriod] = useState(currentPeriod)
  const stats = summaryStats(state)
  const recent = state.days.slice(-30)
  const charted = MEASUREMENT_FIELDS.filter((field) => field.chart)

  return (
    <div className="page">
      <PageHeader eyebrow="التقدم" title="شوفي الصورة الكبيرة">
        <p>التقدم مش الوزن بس: القياسات، الاستمرار، والدقائق اللي اتحركتيها كلها بتحسب.</p>
      </PageHeader>

      <div className="stat-grid">
        <StatTile label="أيام التمرين" value={stats.activeDays} tone="accent" />
        <StatTile label="متوسط النقاط" value={stats.averageScore} unit="/100" />
        <StatTile label="دقائق التمرين" value={stats.totalMinutes} />
      </div>

      {start && (
        <Card>
          <div className="card-title-row">
            <h2 className="card-title">تقويم النقاط</h2>
            {currentPeriod > 1 && (
              <select value={period} onChange={(event) => setPeriod(Number(event.target.value))} aria-label="اختاري الشهر">
                {Array.from({ length: currentPeriod }, (_, index) => <option key={index} value={index + 1}>الشهر {index + 1}</option>)}
              </select>
            )}
          </div>
          <ScoreCalendar days={state.days} startDate={start} periodIndex={period} today={state.today} />
          <ScoreLegend />
        </Card>
      )}

      <div className="two-col">
        <Card>
          <h2 className="card-title">النقاط اليومية</h2>
          {recent.length ? <DailyBars data={recent.map((day) => ({ date: day.date, value: day.score.total }))} unit="نقطة" max={100} label="النقاط اليومية لآخر ٣٠ يوم" /> : <EmptyState icon={<LineIcon />} title="لسه مفيش أيام" />}
        </Card>
        <Card>
          <h2 className="card-title">دقائق التمرين</h2>
          {recent.length ? <DailyBars data={recent.map((day) => ({ date: day.date, value: Math.round((day.workout?.activeSeconds ?? 0) / 60) }))} unit="دقيقة" label="دقائق التمرين لآخر ٣٠ يوم" /> : <EmptyState icon={<LineIcon />} title="لسه مفيش أيام" />}
        </Card>
      </div>

      <div className="two-col">
        {charted.map((field) => {
          const baseline = state.baseline.find((metric) => metric.key === field.key)?.value ?? null
          const points = state.measurements
            .filter((entry) => entry.values[field.key] !== undefined)
            .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.id - b.id)
            .map((entry) => ({ date: entry.measuredOn, value: entry.values[field.key] }))
          // The baseline is plotted at the program start unless a real measurement exists that day.
          const series = start && baseline !== null && points[0]?.date !== start ? [{ date: start, value: baseline }, ...points] : points
          return (
            <Card key={field.key}>
              <h2 className="card-title">{field.label} <small>({field.unit}){field.estimate ? ' · تقدير' : ''}</small></h2>
              {points.length ? (
                <TrendChart data={series} unit={field.unit} baseline={baseline} label={field.label} />
              ) : (
                <EmptyState icon={<LineIcon />} title="لسه مفيش قياسات">
                  <a href="#/measurements">سجّلي أول قياس</a> وهيظهر هنا مع نقطة البداية.
                </EmptyState>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
