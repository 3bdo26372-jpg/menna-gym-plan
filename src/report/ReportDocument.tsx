import { forwardRef } from 'react'
import { formatDateFull, formatDateShort } from '../../shared/date'
import { energyLabel, type ReportData } from '../../shared/report'
import { formatChange, formatNumber } from '../lib/format'
import { scoreLevel } from '../components/ScoreCalendar'

const LOWER_IS_PROGRESS = new Set(['weight', 'bodyFat', 'waist', 'belly'])

/**
 * The monthly report as fixed-size A4 pages (794×1123 CSS px). They are
 * rendered by the browser, so Arabic text is shaped correctly, then exported
 * page by page into the PDF.
 */
export const ReportDocument = forwardRef<HTMLDivElement, { report: ReportData }>(function ReportDocument({ report }, ref) {
  const period = `${formatDateFull(report.startDate)} – ${formatDateFull(report.endDate)}`
  return (
    <div className="report-doc" ref={ref} dir="rtl" lang="ar">
      <section className="report-page">
        <header className="report-hero">
          <div>
            <p className="report-brand">Menna Flow</p>
            <h1>التقرير الشهري · الشهر {report.periodIndex}</h1>
            <p>{period}{report.inProgress ? ' · (الفترة لسه جارية)' : ''}</p>
          </div>
          <dl>
            <div><dt>بداية البرنامج</dt><dd>{formatDateFull(report.programStartDate)}</dd></div>
            <div><dt>تاريخ التقرير</dt><dd>{formatDateFull(report.generatedAt.slice(0, 10))}</dd></div>
          </dl>
        </header>

        <div className="report-kpis">
          <div><span>متوسط النقاط</span><strong>{report.averageScore}<small>/100</small></strong></div>
          <div><span>أيام الحركة</span><strong>{report.activeDays}</strong></div>
          <div><span>عدد التمارين</span><strong>{report.workoutCount}</strong></div>
          <div><span>دقائق التمرين</span><strong>{report.totalMinutes}</strong></div>
          <div><span>متوسط الصعوبة</span><strong>{report.averageDifficulty ?? '—'}<small>/10</small></strong></div>
          <div><span>الطاقة قبل ← بعد</span><strong className="kpi-text">{energyLabel(report.averageEnergyBefore)} ← {energyLabel(report.averageEnergyAfter)}</strong></div>
        </div>

        <h2>تقويم النقاط اليومية</h2>
        <div className="report-calendar">
          {report.days.map((day) => (
            <div key={day.date} className={`cal-cell ${scoreLevel(day.score, day.recorded)}`}>
              <span className="cal-day">يوم {day.dayNumber}</span>
              <strong>{day.recorded ? day.score : '—'}</strong>
              <span className="cal-date">{formatDateShort(day.date)}</span>
            </div>
          ))}
        </div>

        <h2>ملخص الشهر</h2>
        <ul className="report-bullets">
          {report.summary.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <footer className="report-footer">Menna Flow · تقرير شخصي للمتابعة، مش تقرير طبي · صفحة 1 من 2</footer>
      </section>

      <section className="report-page">
        <h2>القياسات: بداية الشهر ← نهايته</h2>
        <table className="report-table">
          <thead><tr><th>القياس</th><th>البداية</th><th>النهاية</th><th>الفرق</th></tr></thead>
          <tbody>
            {report.measurements.map((row) => (
              <tr key={row.key}>
                <th>{row.label} <small>{row.unit}{row.estimate ? ' · تقدير' : ''}</small></th>
                <td>{formatNumber(row.start)}</td>
                <td>{formatNumber(row.end)}</td>
                <td className={row.change !== null && row.change < 0 && LOWER_IS_PROGRESS.has(row.key) ? 'change-good' : ''}>{formatChange(row.change, row.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="report-note">
          اتجاه نسبة الدهون: {report.bodyFatTrend.length ? report.bodyFatTrend.map((point) => `${formatDateShort(point.date)}: ${point.value}%`).join(' ← ') : 'مفيش قياسات للدهون في الفترة دي.'}
          {' '}(قيم الميزان الذكي تقديرية.)
        </p>

        <div className="report-columns">
          <div>
            <h3>أكتر التمارين تكرارًا</h3>
            <ExerciseList items={report.topExercises} unit="مرة" empty="لسه مفيش تمارين مسجلة." />
          </div>
          <div>
            <h3>التمارين المفضّلة</h3>
            <ExerciseList items={report.favoriteExercises} unit="مرة" empty="مفيش اختيارات لسه." />
          </div>
          <div>
            <h3>اتقالت صعبة أكتر من مرة</h3>
            <ExerciseList items={report.hardExercises} unit="مرة" empty="مفيش تمرين اتكرر إنه صعب 👌" />
          </div>
        </div>

        <h2>المكافآت</h2>
        {report.rewardsUnlocked.length
          ? <ul className="report-bullets">{report.rewardsUnlocked.map((reward) => <li key={reward.title}>{reward.emoji} {reward.title} — {formatDateFull(reward.unlockedOn)}</li>)}</ul>
          : <p className="report-note">المكافأة الجاية قربت؛ كل يوم حركة بيقرّبها.</p>}

        <h2>اقتراحات للشهر الجاي</h2>
        <ul className="report-bullets">
          {report.suggestions.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <footer className="report-footer">Menna Flow · تقرير شخصي للمتابعة، مش تقرير طبي · صفحة 2 من 2</footer>
      </section>
    </div>
  )
})

function ExerciseList({ items, unit, empty }: { items: { id: string; name: string; count: number }[]; unit: string; empty: string }) {
  if (!items.length) return <p className="report-note">{empty}</p>
  return (
    <ol className="report-exercises">
      {items.map((item) => <li key={item.id}><span>{item.name}</span><b>{item.count} {unit}</b></li>)}
    </ol>
  )
}
