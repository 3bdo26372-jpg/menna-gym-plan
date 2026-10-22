import { useState } from 'react'
import { Moon, Pencil } from 'lucide-react'
import { addDays, formatDateShort } from '../../shared/date'
import { EARN, pointsBalance, SLEEP_POINTS_FROM } from '../../shared/points'
import { averageSleep, formatSleep, isLateBedtime, LATE_BEDTIME_HOUR, SLEEP_GOAL_HOURS, SLEEP_QUALITIES, sleepMinutes } from '../../shared/sleep'
import type { DayRecord } from '../../shared/types'
import { SleepForm } from '../components/DailyTips'
import { Card, EmptyState, PageHeader, StatTile } from '../components/ui'
import { useAppState } from '../state/AppData'

/** How many nights the page lists and averages. */
const RECENT_NIGHTS = 14
const WEEK = 7

const quality = (day: DayRecord) => SLEEP_QUALITIES.find((option) => option.value === day.sleep?.quality)

/** النوم: log last night (or the night before), and see how she has been sleeping. */
export function SleepPage() {
  const state = useAppState()
  const today = state.days.find((day) => day.date === state.today)
  const yesterday = state.days.find((day) => day.date === addDays(state.today, -1))
  const recent = state.days.filter((day) => day.date <= state.today).slice(-RECENT_NIGHTS).reverse()
  const week = recent.slice(0, WEEK)
  const logged = week.filter((day) => day.sleep)
  const average = averageSleep(week.map((day) => day.sleep ?? null))
  const late = logged.filter((day) => day.sleep && isLateBedtime(day.sleep)).length
  const { bySource } = pointsBalance(state)
  const nights = recent.filter((day) => day.sleep)

  return (
    <div className="page">
      <PageHeader eyebrow="النوم" title="نومك">
        <p>سجّلي نمتي امتى وصحيتي امتى كل يوم، وخدي {EARN.sleep} نقط عن كل ليلة 🎁 النوم الكويس بيظبط الهرمونات والجوع والطاقة في التمرين.</p>
      </PageHeader>

      {today && <NightCard day={today} title="امبارح بالليل" />}
      {yesterday && !yesterday.sleep && yesterday.date >= SLEEP_POINTS_FROM && <NightCard day={yesterday} title="الليلة اللي قبلها (نسيتيها؟)" />}

      <Card>
        <h2 className="card-title"><Moon /> آخر {WEEK} أيام</h2>
        <div className="stat-grid">
          <StatTile label="متوسط النوم" value={average === null ? '—' : formatSleep(average)} hint={`الهدف ${SLEEP_GOAL_HOURS} ساعات`} tone="accent" />
          <StatTile label="ليالي متسجلة" value={logged.length} unit={`/ ${week.length}`} />
          <StatTile label="سهرتي بعد ٢" value={late} unit={late === 1 ? 'ليلة' : 'ليالي'} />
          <StatTile label="نقط النوم" value={bySource.sleep} unit="نقطة" />
        </div>
        <p className="muted small">أحسن حاجة: تنامي قبل الساعة {LATE_BEDTIME_HOUR} وتنامي {SLEEP_GOAL_HOURS} ساعات على الأقل، ومن غير شاي أو ريدبول بعد المغرب 🌙</p>
      </Card>

      <Card>
        <h2 className="card-title">ليالي آخر أسبوعين <small>{nights.length} من {recent.length} متسجلة</small></h2>
        {nights.length ? (
          <ul className="sleep-history">
            {nights.map((day) => (
              <li key={day.date}>
                <strong>{day.date === state.today ? 'النهارده' : formatDateShort(day.date)}</strong>
                <span>{day.sleep!.sleptAt} ← {day.sleep!.wokeAt}</span>
                <b className={sleepMinutes(day.sleep!) < (SLEEP_GOAL_HOURS - 1) * 60 ? 'is-short' : ''}>{formatSleep(sleepMinutes(day.sleep!))}</b>
                {quality(day) && <span aria-label={`نوم ${quality(day)!.label}`}>{quality(day)!.emoji}</span>}
                {day.sleep!.note && <small>📝 {day.sleep!.note}</small>}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<Moon />} title="لسه مفيش ليالي متسجلة">سجّلي امبارح بالليل من فوق 👆</EmptyState>}
      </Card>
    </div>
  )
}

/** One night: the form until it is logged, then a summary she can edit. */
function NightCard({ day, title }: { day: DayRecord; title: string }) {
  const [editing, setEditing] = useState(false)
  const sleep = day.sleep ?? null
  return (
    <Card>
      <h2 className="card-title">😴 {title}</h2>
      {sleep && !editing ? (
        <div className="sleep-summary">
          <span className="chip soft"><Moon /> نمتي {sleep.sleptAt} · صحيتي {sleep.wokeAt} · {formatSleep(sleepMinutes(sleep))}</span>
          <button type="button" className="link-button" onClick={() => setEditing(true)}><Pencil /> تعديل</button>
        </div>
      ) : <SleepForm date={day.date} current={sleep} onDone={sleep ? () => setEditing(false) : undefined} />}
    </Card>
  )
}
