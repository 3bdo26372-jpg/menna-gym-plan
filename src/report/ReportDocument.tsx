import { forwardRef } from 'react'
import { formatDateFull, formatDateShort } from '../../shared/date'
import { FOOD_CATEGORIES, formatLitres } from '../../shared/food'
import { energyLabel, REPORT_LABEL, type ReportData } from '../../shared/report'
import { formatChange, formatNumber } from '../lib/format'
import { scoreLevel } from '../components/ScoreCalendar'

const LOWER_IS_PROGRESS = new Set(['weight', 'bodyFat', 'waist', 'belly'])
const FOOD_EMOJI = Object.fromEntries(FOOD_CATEGORIES.map((category) => [category.id, `${category.emoji} ${category.label}`]))
/** Rows that fit on one food-log page (a day heading counts as two). */
const FOOD_ROWS_PER_PAGE = 30

type FoodDay = ReportData['food']['days'][number]

/** Split the food log into pages, splitting a long day across pages if needed. */
function paginateFood(days: FoodDay[]) {
  const pages: { day: FoodDay; entries: FoodDay['entries']; continued: boolean }[][] = []
  let page: (typeof pages)[number] = []
  let used = 0
  for (const day of days) {
    let rest = day.entries
    let continued = false
    while (rest.length) {
      if (used + 3 > FOOD_ROWS_PER_PAGE) {
        pages.push(page)
        page = []
        used = 0
      }
      const take = Math.min(rest.length, FOOD_ROWS_PER_PAGE - used - 2)
      page.push({ day, entries: rest.slice(0, take), continued })
      used += take + 2
      rest = rest.slice(take)
      continued = true
    }
  }
  if (page.length) pages.push(page)
  return pages
}

/**
 * The monthly report as fixed-size A4 pages (794×1123 CSS px). They are
 * rendered by the browser, so Arabic text is shaped correctly, then exported
 * page by page into the PDF.
 */
export const ReportDocument = forwardRef<HTMLDivElement, { report: ReportData }>(function ReportDocument({ report }, ref) {
  const period = `${formatDateFull(report.startDate)} – ${formatDateFull(report.endDate)}`
  const kind = report.kind ?? 'month'
  const label = REPORT_LABEL[kind]
  const food = report.food ?? { days: [], loggedDays: 0, entries: 0, averageWaterMl: null, waterTargetMl: 2000 }
  const foodPages = paginateFood(food.days)
  const totalPages = 2 + Math.max(1, foodPages.length)
  const footer = (page: number) => <footer className="report-footer">Menna Flow · تقرير شخصي للمتابعة، مش تقرير طبي · صفحة {page} من {totalPages}</footer>
  return (
    <div className="report-doc" ref={ref} dir="rtl" lang="ar">
      <section className="report-page">
        <header className="report-hero">
          <div>
            <p className="report-brand">Menna Flow</p>
            <h1>{kind === 'week' ? 'التقرير الأسبوعي' : 'التقرير الشهري'} · {label} {report.periodIndex}</h1>
            <p>{period}{report.inProgress ? ' · (الفترة لسه جارية)' : ''}</p>
          </div>
          <dl>
            <div><dt>بداية البرنامج</dt><dd>{formatDateFull(report.programStartDate)}</dd></div>
            <div><dt>تاريخ التقرير</dt><dd>{formatDateFull(report.generatedAt.slice(0, 10))}</dd></div>
          </dl>
        </header>

        <div className="report-kpis">
          <div><span>متوسط النقاط</span><strong>{report.averageScore}<small>/100</small></strong></div>
          <div><span>أيام التمرين</span><strong>{report.activeDays}</strong></div>
          <div><span>عدد التمارين</span><strong>{report.workoutCount}</strong></div>
          <div><span>دقائق التمرين</span><strong>{report.totalMinutes}</strong></div>
          <div><span>متوسط الصعوبة</span><strong>{report.averageDifficulty ?? '—'}<small>/10</small></strong></div>
          <div><span>الطاقة قبل ← بعد</span><strong className="kpi-text">{energyLabel(report.averageEnergyBefore)} ← {energyLabel(report.averageEnergyAfter)}</strong></div>
        </div>

        <h2>تقويم النقاط اليومية</h2>
        <div className={`report-calendar ${kind === 'week' ? 'is-week' : ''}`}>
          {report.days.map((day) => (
            <div key={day.date} className={`cal-cell ${scoreLevel(day.score, day.recorded)}`}>
              <span className="cal-day">يوم {day.dayNumber}</span>
              <strong>{day.recorded ? day.score : '—'}</strong>
              <span className="cal-date">{formatDateShort(day.date)}</span>
            </div>
          ))}
        </div>

        <h2>ملخص {label}</h2>
        <ul className="report-bullets">
          {report.summary.map((line) => <li key={line}>{line}</li>)}
        </ul>
        {footer(1)}
      </section>

      <section className="report-page">
        <h2>القياسات: بداية {label} ← نهايته</h2>
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
          : <p className="report-note">المكافأة الجاية قربت؛ كل يوم تمرين بيقرّبها.</p>}

        <h2>اقتراحات {kind === 'week' ? 'للأسبوع' : 'للشهر'} الجاي</h2>
        <ul className="report-bullets">
          {report.suggestions.map((line) => <li key={line}>{line}</li>)}
        </ul>
        {footer(2)}
      </section>

      {(foodPages.length ? foodPages : [[]]).map((page, index) => (
        <section className="report-page" key={`food-${index}`}>
          <h2>سجل الأكل والشرب{index > 0 ? ' (تكملة)' : ''}</h2>
          {index === 0 && (
            <div className="report-kpis report-food-kpis">
              <div><span>أيام اتسجل فيها الأكل</span><strong>{food.loggedDays}</strong></div>
              <div><span>عدد التسجيلات</span><strong>{food.entries}</strong></div>
              <div><span>متوسط المية يوميًا</span><strong>{food.averageWaterMl === null ? '—' : formatLitres(food.averageWaterMl)}<small> لتر</small></strong></div>
              <div><span>متوسط السعرات يوميًا</span><strong>{food.averageCalories ? food.averageCalories.toLocaleString('en-US') : '—'}<small> تقريبًا</small></strong></div>
            </div>
          )}
          {page.length === 0 && <p className="report-note">مفيش أكل أو شرب مسجّل في الفترة دي. التسجيل من صفحة "الأكل" في التطبيق.</p>}
          {page.map(({ day, entries, continued }) => (
            <div className="report-food-day" key={`${day.date}-${continued}`}>
              <h3>{formatDateFull(day.date)}{continued ? ' (تكملة)' : ''}{!continued && day.waterMl > 0 ? ` · مية ${formatLitres(day.waterMl)} لتر` : ''}</h3>
              <table className="report-table report-food-table">
                <tbody>
                  {entries.map((entry, row) => (
                    <tr key={row}>
                      <td className="food-time-cell">{entry.time}</td>
                      <td className="food-cat-cell">{FOOD_EMOJI[entry.category]}</td>
                      <td>{entry.item}</td>
                      <td className="food-qty-cell">{[entry.quantity, entry.ml ? `${entry.ml} مل` : null].filter(Boolean).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {footer(3 + index)}
        </section>
      ))}
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
