import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Check, ChevronLeft, Droplets, Flame, Gift, Play, Sparkles, Timer, Utensils } from 'lucide-react'
import { formatLitres, waterMl, WATER_TARGET_ML } from '../../shared/food'
import { addDays, dayNumberFor, formatDateLong, periodBounds, periodForDay, PERIOD_DAYS } from '../../shared/date'
import { measurementComparison, nextReward, summaryStats } from '../../shared/engine'
import { EXERCISE_BY_ID } from '../../shared/exercises'
import { BASELINE_METRICS } from '../../shared/measurements'
import { LEVELS, planForDay, type WorkoutPlan } from '../../shared/program'
import type { AppState, DayRecord } from '../../shared/types'
import { CheckInForm } from '../components/CheckInForm'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { FeedbackForm } from '../components/FeedbackForm'
import { SafetyNote } from '../components/SafetyNote'
import { scoreLevel } from '../components/ScoreCalendar'
import { Card, Notice, ProgressBar, ScoreRing, StatTile } from '../components/ui'
import { formatChange, formatNumber } from '../lib/format'
import { BODY_OPTIONS, ENERGY_OPTIONS, labelOf, MOOD_OPTIONS, OVERALL_OPTIONS } from '../lib/labels'
import { navigate } from '../lib/router'
import { useAppData, useAppState } from '../state/AppData'
import { resumableSession, workSummary } from '../workout/session'

export function TodayPage() {
  const state = useAppState()
  if (!state.profile.programStartDate) return <Welcome />
  return <Dashboard state={state} startDate={state.profile.programStartDate} />
}

function Welcome() {
  const { startProgram } = useAppData()
  const [busy, setBusy] = useState(false)
  const highlights = ['weight', 'bodyFat', 'waist', 'belly']
  return (
    <div className="page">
      <section className="welcome">
        <p className="eyebrow">Menna Flow</p>
        <h1>كل يوم تمرين،<br /><em>بطريقتك.</em></h1>
        <p>برنامج يومي واقف من غير أدوات: كارديو يرفع النبض، شد للجسم، وإطالة. كل يوم له تمرين ونقاط، والبرنامج بيتظبط على حسب إحساسك.</p>
        <button type="button" className="button primary large" disabled={busy} onClick={async () => { setBusy(true); try { await startProgram() } finally { setBusy(false) } }}>
          <Play /> ابدئي اليوم الأول النهارده
        </button>
      </section>
      <Card>
        <h2 className="card-title">نقطة البداية</h2>
        <div className="stat-grid">
          {BASELINE_METRICS.filter((metric) => highlights.includes(metric.key)).map((metric) => (
            <StatTile key={metric.key} label={metric.label} value={formatNumber(metric.value)} unit={metric.unit} hint={metric.estimate ? 'تقدير من الميزان' : undefined} />
          ))}
        </div>
        <p className="muted small">القياسات دي هتفضل محفوظة كنقطة بداية ثابتة، وأي قياس جديد بيتسجل لوحده.</p>
      </Card>
    </div>
  )
}

function Dashboard({ state, startDate }: { state: AppState; startDate: string }) {
  const today = state.days.find((day) => day.date === state.today)
  const dayNumber = dayNumberFor(startDate, state.today)
  const yesterday = state.days.find((day) => day.date === addDays(state.today, -1))
  const plan = planForDay(state.days, state.today, dayNumber, today?.checkin)
  const stats = summaryStats(state)
  const weight = measurementComparison(state, 'weight')
  const waist = measurementComparison(state, 'waist')
  const belly = measurementComparison(state, 'belly')
  const rewards = nextReward(state)
  const period = periodForDay(dayNumber)
  const bounds = periodBounds(startDate, period)
  const periodDays = state.days.filter((day) => day.date >= bounds.start && day.date <= state.today)
  const periodAverage = periodDays.length ? Math.round(periodDays.reduce((sum, day) => sum + day.score.total, 0) / periodDays.length) : 0
  const recentPain = [today, yesterday].some((day) => day?.feedback?.pain)

  return (
    <div className="page">
      <header className="today-head">
        <div>
          <p className="eyebrow">اليوم {dayNumber} · {formatDateLong(state.today)}</p>
          <h1>أهلًا يا منّة</h1>
        </div>
        <ScoreRing score={today?.score.total ?? 0} size={92} />
      </header>

      {recentPain && <SafetyNote compact />}
      {yesterday && yesterday.workout && !yesterday.feedback && <YesterdayFeedback day={yesterday} />}

      <TodayWorkout state={state} day={today} plan={plan} />

      <ScoreBreakdown day={today} />

      <FoodToday state={state} />

      <Card>
        <h2 className="card-title">ملخص سريع</h2>
        <div className="stat-grid">
          <StatTile label="أيام التمرين" value={stats.activeDays} unit={`/ ${stats.recordedDays}`} tone="accent" />
          <StatTile label="متوسط النقاط" value={stats.averageScore} unit="/100" />
          <StatTile label="دقائق التمرين" value={stats.totalMinutes} unit="دقيقة" />
          <StatTile label="الوزن الحالي" value={formatNumber(weight.current)} unit="كجم" hint={weight.entries ? `${formatChange(weight.changeFromBaseline, 'كجم')} من البداية` : 'نقطة البداية'} />
          <ChangeTile label="الوسط" comparison={waist} />
          <ChangeTile label="البطن" comparison={belly} />
        </div>
        <a className="text-link" href="#/measurements">سجّلي قياس جديد <ChevronLeft /></a>
      </Card>

      <div className="two-col">
        <Card>
          <h2 className="card-title"><Gift /> المكافأة الجاية</h2>
          {rewards.next ? (
            <>
              <p className="reward-mini"><span>{rewards.next.emoji}</span> {rewards.next.title}</p>
              <ProgressBar value={rewards.active} max={rewards.next.thresholdDays} label="التقدم للمكافأة الجاية" />
              <p className="muted small">{rewards.active} من {rewards.next.thresholdDays} يوم تمرين</p>
            </>
          ) : <p>فتحتي كل المكافآت 🎉</p>}
          <a className="text-link" href="#/rewards">كل المكافآت <ChevronLeft /></a>
        </Card>
        <Card>
          <h2 className="card-title"><CalendarDays /> الشهر {period}</h2>
          <ProgressBar value={dayNumber - (period - 1) * PERIOD_DAYS} max={PERIOD_DAYS} label="التقدم في الشهر" />
          <p className="muted small">يوم {dayNumber - (period - 1) * PERIOD_DAYS} من {PERIOD_DAYS} · متوسط نقاط الشهر {periodAverage}</p>
          <RecentStrip days={state.days} today={state.today} />
          <a className="text-link" href="#/progress">التقدم بالتفصيل <ChevronLeft /></a>
        </Card>
      </div>
    </div>
  )
}

/** Shows the change from baseline once there is a measurement, otherwise the baseline itself. */
function ChangeTile({ label, comparison }: { label: string; comparison: ReturnType<typeof measurementComparison> }) {
  if (!comparison.entries) return <StatTile label={label} value={formatNumber(comparison.baseline)} unit="سم" hint="نقطة البداية" />
  const change = comparison.changeFromBaseline ?? 0
  return (
    <StatTile
      label={label} value={formatChange(change, 'سم')} tone={change < 0 ? 'good' : 'neutral'}
      hint={`${formatNumber(comparison.baseline)} ← ${formatNumber(comparison.current)} سم`}
    />
  )
}

function TodayWorkout({ state, day, plan }: { state: AppState; day: DayRecord | undefined; plan: WorkoutPlan }) {
  const { saveCheckin, saveFeedback } = useAppData()
  const [editingCheckin, setEditingCheckin] = useState(false)
  const active = resumableSession(state.today, state.days)
  const inProgress = active && !active.finished && active.date === state.today && active.startedAt
  const minutes = Math.round(plan.totalSeconds / 60)
  const main = plan.blocks.find((block) => block.id === 'cardio' || block.id === 'light')
  const levelNote = plan.level > 0 ? LEVELS[plan.level].change : null
  const checkin = day?.checkin

  return (
    <Card className="today-card">
      <div className="today-card-head">
        <div>
          <p className="eyebrow">تمرين النهارده</p>
          <h2>{plan.title}</h2>
          <p className="muted">{plan.subtitle}</p>
        </div>
        <div className="chips">
          <span className="chip"><Timer /> {minutes} دقيقة</span>
          {plan.dayType === 'light' ? <span className="chip soft">تمرين خفيف</span> : <span className="chip"><Flame /> {plan.intensity === 'gentle' ? 'شدة أخف' : 'شدة عادية'}</span>}
          {levelNote && <span className="chip soft"><Sparkles /> مستوى {plan.level}</span>}
        </div>
      </div>

      {plan.notes.map((note) => <Notice key={note} tone="info">{note}</Notice>)}

      <div className="steps">
        <section className={`step ${checkin ? 'done' : 'current'}`}>
          <h3><span className="step-dot">{checkin ? <Check /> : 1}</span> إحساسك قبل التمرين <small>15 نقطة</small></h3>
          {checkin && !editingCheckin ? (
            <div className="summary-chips">
              <span className="chip soft">الطاقة: {labelOf(ENERGY_OPTIONS, checkin.energy)}</span>
              <span className="chip soft">المزاج: {labelOf(MOOD_OPTIONS, checkin.mood)}</span>
              <span className="chip soft">الجسم: {labelOf(BODY_OPTIONS, checkin.body)}</span>
              {!day?.workout && <button type="button" className="link-button" onClick={() => setEditingCheckin(true)}>تعديل</button>}
            </div>
          ) : (
            <CheckInForm initial={checkin} onSubmit={async (input) => { await saveCheckin(state.today, input); setEditingCheckin(false) }} />
          )}
        </section>

        <section className={`step ${day?.workout ? 'done' : checkin ? 'current' : 'locked'}`}>
          <h3><span className="step-dot">{day?.workout ? <Check /> : 2}</span> التمرين <small>70 نقطة</small></h3>
          {!day?.workout && (
            <>
              <ol className="block-list" aria-label="أجزاء التمرين بالترتيب">
                {plan.blocks.map((block, index) => (
                  <li key={block.id}>
                    <strong><span className="block-order">{index + 1}</span> {block.title}</strong>
                    <span>{block.exerciseIds.length} تمارين{block.rounds > 1 ? ` × ${block.rounds} جولات` : ''}</span>
                  </li>
                ))}
              </ol>
              <p className="muted small">التمرين بيبدأ بالتسخين وبيخلص بالإطالة. التسخين 5 نقاط والإطالة 5 نقاط (لو عملتي 80% من وقتهم)، والجزء الأساسي 60 نقطة على قد اللي تعمليه.</p>
              {main && (
                <div className="thumb-row" aria-label="تمارين الجزء الأساسي">
                  {main.exerciseIds.map((id) => (
                    <div key={id} className="thumb">
                      <ExerciseMedia exercise={EXERCISE_BY_ID[id]} size="sm" />
                      <span>{EXERCISE_BY_ID[id].name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {day?.workout ? (
            <p className="muted">
              {Math.round(day.workout.activeSeconds / 60)} دقيقة · {Math.round(day.workout.mainCompletion * 100)}% من التمرين
              {day.workout.status === 'completed' ? ' · خلّصتيه كله 👏' : ''}
            </p>
          ) : (
            <button type="button" className="button primary large" disabled={!checkin} onClick={() => navigate('workout')}>
              <Play /> {inProgress ? `كمّلي التمرين (${Math.round(workSummary(active).ratio * 100)}%)` : 'ابدئي التمرين'}
            </button>
          )}
          {!checkin && <p className="muted small">سجّلي إحساسك الأول عشان نظبط شدة التمرين.</p>}
        </section>

        <section className={`step ${day?.feedback ? 'done' : day?.workout ? 'current' : 'locked'}`}>
          <h3><span className="step-dot">{day?.feedback ? <Check /> : 3}</span> تقييم بعد التمرين <small>15 نقطة</small></h3>
          {day?.feedback ? (
            <div className="summary-chips">
              <span className="chip soft">الصعوبة {day.feedback.difficulty}/10</span>
              <span className="chip soft">{labelOf(OVERALL_OPTIONS, day.feedback.overall)}</span>
              {day.feedback.favoriteExerciseId && <span className="chip soft">❤️ {EXERCISE_BY_ID[day.feedback.favoriteExerciseId]?.name}</span>}
            </div>
          ) : day?.workout ? (
            <FeedbackForm exerciseIds={day.workout.exercises.map((item) => item.exerciseId)} onSubmit={(input) => saveFeedback(state.today, input)} />
          ) : <p className="muted small">بعد ما تخلّصي التمرين.</p>}
        </section>
      </div>
    </Card>
  )
}

function FoodToday({ state }: { state: AppState }) {
  const entries = state.foodEntries.filter((entry) => entry.date === state.today)
  const water = waterMl(entries)
  const meals = entries.filter((entry) => entry.category !== 'drink').length
  return (
    <Card>
      <div className="food-today">
        <h2 className="card-title"><Utensils /> أكلك وشربك النهارده</h2>
        <a className="button secondary" href="#/food">سجّلي</a>
      </div>
      <div className="stat-grid">
        <StatTile label="وجبات وسناكس" value={meals} />
        <StatTile label="المية" value={formatLitres(water)} unit="لتر" hint={<><Droplets className="inline-icon" /> الهدف {WATER_TARGET_ML / 1000}–2.5 لتر</>} />
      </div>
      <ProgressBar value={water} max={WATER_TARGET_ML} label="المية من الهدف" />
    </Card>
  )
}

function YesterdayFeedback({ day }: { day: DayRecord }) {
  const { saveFeedback } = useAppData()
  const [open, setOpen] = useState(false)
  return (
    <Card className="soft-card">
      <h2 className="card-title">تقييم تمرين امبارح لسه ناقص</h2>
      <p className="muted">لو اتمرنتي متأخر بالليل، تقدري تقيّميه دلوقتي ويتحسب ليوم {day.dayNumber}.</p>
      {open
        ? <FeedbackForm exerciseIds={day.workout!.exercises.map((item) => item.exerciseId)} onSubmit={(input) => saveFeedback(day.date, input)} />
        : <button type="button" className="button secondary" onClick={() => setOpen(true)}>قيّمي تمرين امبارح</button>}
    </Card>
  )
}

function ScoreBreakdown({ day }: { day: DayRecord | undefined }) {
  const score = day?.score
  const rows = [
    { label: 'إحساسك قبل التمرين', value: score?.checkin ?? 0, max: 15 },
    { label: 'التمرين', value: score?.workout ?? 0, max: 60 },
    { label: 'التسخين والإطالة', value: score?.warmupCooldown ?? 0, max: 10 },
    { label: 'التقييم بعد التمرين', value: score?.feedback ?? 0, max: 15 },
  ]
  return (
    <Card>
      <h2 className="card-title">نقاط النهارده: {score?.total ?? 0} من 100</h2>
      <ul className="score-rows">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <ProgressBar value={row.value} max={row.max} label={row.label} />
            <b>{row.value}/{row.max}</b>
          </li>
        ))}
      </ul>
      <p className="muted small">النقاط بتكافئ الاستمرار: التمرين الأصعب أو الأطول مش بيدي نقاط زيادة.</p>
    </Card>
  )
}

function RecentStrip({ days, today }: { days: DayRecord[]; today: string }) {
  const recent = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6))
  const byDate = new Map(days.map((day) => [day.date, day]))
  return (
    <div className="recent-strip" aria-label="آخر ٧ أيام">
      {recent.map((date) => {
        const day = byDate.get(date)
        return (
          <motion.span key={date} className={`cal-cell ${day ? scoreLevel(day.score.total, true) : 'future'} ${date === today ? 'is-today' : ''}`} title={day ? `${day.score.total} نقطة` : ''} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <span className="cal-score">{day ? day.score.total : ''}</span>
          </motion.span>
        )
      })}
    </div>
  )
}
