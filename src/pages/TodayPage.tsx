import { useEffect, useState } from 'react'
import { Check, Droplets, Flame, Play, Sparkles, Timer, Utensils } from 'lucide-react'
import { formatLitres, waterMl, WATER_TARGET_ML } from '../../shared/food'
import { addDays, cairoTime, dayNumberFor, formatDateLong } from '../../shared/date'
import { EXERCISE_BY_ID } from '../../shared/exercises'
import { BASELINE_METRICS } from '../../shared/measurements'
import { LEVELS, planForDay, type WorkoutPlan } from '../../shared/program'
import type { AppState, DayRecord } from '../../shared/types'
import { canAffordPassFor, canTakePass, isPeriodPassDate, missedWorkout, passPriceFor, type PassGift } from '../../shared/dayPasses'
import { newPagePeriod } from '../../shared/meals'
import { isPainRest, periodForecast, type PeriodForecast } from '../../shared/period'
import { ACTIVE_DAY_MIN_COMPLETION } from '../../shared/rewards'
import { SCORE_POINTS, WORKOUT_SHARE } from '../../shared/scoring'
import { CardGame, gameShown, specialGameOpen } from '../components/CardGame'
import { CheckInForm } from '../components/CheckInForm'
import { TreatCard } from '../components/ChocolateGift'
import { DailyTips } from '../components/DailyTips'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { FeedbackForm } from '../components/FeedbackForm'
import { isNewPageDismissed, NewPageCard } from '../components/NewPage'
import { NotificationsCard } from '../components/Notifications'
import { isUrgent, PeriodCard } from '../components/PeriodCard'
import { SafetyNote } from '../components/SafetyNote'
import { Card, Notice, ProgressBar, ScoreRing, StatTile } from '../components/ui'
import { formatNumber } from '../lib/format'
import { greetingFor } from '../lib/greetings'
import { ENERGY_OPTIONS, labelOf, MOOD_OPTIONS } from '../lib/labels'
import { navigate } from '../lib/router'
import { isTreatOpened, treatsFor } from '../lib/treats'
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

/** The small period card shows from this many days before the expected start. */
const PRE_PERIOD_DAYS = 7

function Dashboard({ state, startDate }: { state: AppState; startDate: string }) {
  const today = state.days.find((day) => day.date === state.today)
  const dayNumber = dayNumberFor(startDate, state.today)
  const yesterday = state.days.find((day) => day.date === addDays(state.today, -1))
  const plan = planForDay(state.days, state.today, dayNumber, today?.checkin)
  const recentPain = [today, yesterday].some((day) => day?.feedback?.pain)
  // The app can deploy before the Worker that sends periods; skip the card until it does.
  const cycle = state.periods ? periodForecast(state.periods, state.today) : null

  return (
    <div className="page">
      <header className="today-head">
        <div>
          <p className="eyebrow">اليوم {dayNumber} · {formatDateLong(state.today)}</p>
          <Greeting state={state} day={today} dayNumber={dayNumber} cycle={cycle} />
        </div>
        <ScoreRing score={today?.score.total ?? 0} size={92} />
      </header>

      {recentPain && <SafetyNote compact />}
      {cycle && isUrgent(cycle) && <PeriodCard state={state} forecast={cycle} />}
      <Highlight state={state} yesterday={yesterday} />

      <DailyTips state={state} />

      {isPeriodPassDate(state, state.today) && !today?.workout
        ? <PeriodRest state={state} day={today} plan={plan} />
        : <TodayWorkout state={state} day={today} plan={plan} />}

      <TodaySummary state={state} day={today} />

      {/* Small, and where she rates pain in the week before a period. */}
      {cycle && !isUrgent(cycle) && cycle.daysUntil !== null && cycle.daysUntil <= PRE_PERIOD_DAYS && <PeriodCard state={state} forecast={cycle} />}
    </div>
  )
}

/**
 * At most one extra card at a time, so the home page stays calm: the most
 * pressing of a special game round from him, a new treat, yesterday's feedback, the card game, the fresh
 * start after a period, a gift pass waiting, a pass for a missed yesterday,
 * or turning on notifications. The rest wait for their turn.
 */
function Highlight({ state, yesterday }: { state: AppState; yesterday: DayRecord | undefined }) {
  // Decided once per visit, so the rose round stays on screen while its cards turn over.
  const [specialFirst] = useState(() => specialGameOpen(state))
  const [openedBefore] = useState(() => new Set(treatsFor(state).filter((treat) => treat.kind === 'gift' && isTreatOpened(treat.id)).map((treat) => treat.id)))
  const treats = treatsFor(state)
  const fresh = treats.find((treat) => !openedBefore.has(treat.id))
  if (specialFirst) return <CardGame state={state} />
  if (fresh) return <TreatCard treat={fresh} />
  if (yesterday?.workout && !yesterday.feedback) return <YesterdayFeedback day={yesterday} />
  if (gameShown(state)) return <CardGame state={state} />
  if (newPagePeriod(state.periods, state.today) && !isNewPageDismissed(state)) return <NewPageCard state={state} />
  const waiting = treats.flatMap((treat) => (treat.kind === 'gift' && openedBefore.has(treat.id) ? [treat.gift] : []))
  if (waiting.length) return <GiftsWaiting gifts={waiting} />
  if (yesterday && missedWorkout(yesterday) && !isPainRest(yesterday.periodPain) && canTakePass(yesterday) && canAffordPassFor(state, yesterday.date)) {
    return (
      <Card className="soft-card">
        <h2 className="card-title">فاتك تمرين امبارح؟ 🎟️</h2>
        <p className="muted">عندك إكسبشن{passPriceFor(state, yesterday.date) === 0 ? ' ببلاش' : ''} يكمّل يوم {yesterday.dayNumber} لـ 100 ويحسبه يوم تمرين.</p>
        <a className="button secondary" href="#/rewards/passes">استخدمي الإكسبشن</a>
      </Card>
    )
  }
  return <NotificationsCard state={state} />
}

/** Gift passes she already unwrapped but hasn't used: a short reminder with their notes. */
function GiftsWaiting({ gifts }: { gifts: PassGift[] }) {
  return (
    <Card className="soft-card">
      <h2 className="card-title">{gifts.length === 1 ? 'معاكي إكسبشن هدية 🎁' : `معاكي ${gifts.length} إكسبشن هدية 🎁`}</h2>
      {gifts.map((gift) => <p key={gift.id} className="reward-hint"><span>🎁 إكسبشن هدية</span>{gift.note ?? 'إكسبشن ببلاش'}</p>)}
      <a className="button secondary" href="#/rewards/passes">استخدميه</a>
    </Card>
  )
}

/** Today's points in one card: workout, water and calories, with where to log. */
function TodaySummary({ state, day }: { state: AppState; day: DayRecord | undefined }) {
  const score = day?.score
  const rest = score?.rest ?? 0
  const workout = (score?.checkin ?? 0) + (score?.workout ?? 0) + (score?.warmupCooldown ?? 0) + (score?.feedback ?? 0) + rest
  const water = waterMl(state.foodEntries.filter((entry) => entry.date === state.today))
  const passed = (score?.pass ?? 0) + (score?.makeup ?? 0)
  const rows = [
    { label: rest ? 'التمرين 🌸' : 'التمرين', value: workout, max: WORKOUT_SHARE },
    { label: `المية · ${formatLitres(water)} لتر`, value: score?.water ?? 0, max: SCORE_POINTS.water },
    { label: 'السعرات', value: score?.calories ?? 0, max: SCORE_POINTS.calories },
    ...(passed ? [{ label: 'إكسبشن 🎟️', value: passed, max: passed }] : []),
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
      <div className="summary-actions">
        <a className="button secondary small-button" href="#/food/add"><Utensils /> سجّلي أكل</a>
        <a className="button secondary small-button" href="#/food/water"><Droplets /> سجّلي مية</a>
      </div>
    </Card>
  )
}


/** The Cairo hour, kept current so the greeting changes at 7 pm without a reload. */
function useCairoHour() {
  const read = () => Number(cairoTime().slice(0, 2))
  const [hour, setHour] = useState(read)
  useEffect(() => {
    const timer = window.setInterval(() => setHour(read()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return hour
}

/** A line that follows her day: pain, water, the workout, or the time. */
function Greeting({ state, day, dayNumber, cycle }: { state: AppState; day: DayRecord | undefined; dayNumber: number; cycle: PeriodForecast | null }) {
  const hour = useCairoHour()
  const pain = day?.periodPain ?? 0
  const water = waterMl(state.foodEntries.filter((entry) => entry.date === state.today))
  const greeting = greetingFor({
    dayNumber,
    hour,
    painRest: isPainRest(pain),
    periodDay: pain > 0 || cycle?.phase === 'period',
    inPeriod: cycle?.phase === 'period',
    trained: (day?.workout?.mainCompletion ?? 0) >= ACTIVE_DAY_MIN_COMPLETION,
    waterDone: water >= WATER_TARGET_ML,
    score: day?.score.total ?? 0,
  })
  return (
    <>
      <h1>{greeting.title}</h1>
      <p className="greeting-line">{greeting.line}</p>
    </>
  )
}


/** A period day: no workout to do, the day already counts. A light one is there if she wants it. */
function PeriodRest({ state, day, plan }: { state: AppState; day: DayRecord | undefined; plan: WorkoutPlan }) {
  const [moving, setMoving] = useState(false)
  if (moving) return <TodayWorkout state={state} day={day} plan={plan} />
  return (
    <Card className="today-card soft-card">
      <p className="eyebrow">تمرين النهارده</p>
      <h2>النهارده راحة 🌸</h2>
      <p className="muted">طول البريود مفيش تمارين، وكل يوم بيتحسب لك يوم تمرين كامل ونقطه 100 لوحده. ريّحي جسمك، واشربي مية وحاجة دافية 🤍</p>
      <button type="button" className="link-button" onClick={() => setMoving(true)}>حابة تتحركي شوية؟ وريني التمرين (اختياري)</button>
    </Card>
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

      <ol className="mini-steps" aria-label="خطوات النهارده">
        {[
          { label: 'إحساسك', done: Boolean(checkin) },
          { label: 'التمرين', done: Boolean(day?.workout) },
          { label: 'التقييم', done: Boolean(day?.feedback) },
        ].map((step, index) => (
          <li key={step.label} className={step.done ? 'done' : ''}><span className="step-dot">{step.done ? <Check /> : index + 1}</span>{step.label}</li>
        ))}
      </ol>

      {/* Only the step she is on; the others are a tick above. */}
      {(!checkin || editingCheckin) && !day?.workout ? (
        <CheckInForm initial={checkin} onSubmit={async (input) => { await saveCheckin(state.today, input); setEditingCheckin(false) }} />
      ) : !day?.workout ? (
        <>
          <button type="button" className="button primary large" onClick={() => navigate('workout')}>
            <Play /> {inProgress ? `كمّلي التمرين (${Math.round(workSummary(active).ratio * 100)}%)` : 'ابدئي التمرين'}
          </button>
          <div className="summary-chips">
            <span className="chip soft">الطاقة: {labelOf(ENERGY_OPTIONS, checkin!.energy)}</span>
            <span className="chip soft">المزاج: {labelOf(MOOD_OPTIONS, checkin!.mood)}</span>
            <button type="button" className="link-button" onClick={() => setEditingCheckin(true)}>تعديل</button>
          </div>
          <details className="workout-details">
            <summary>شوفي التمارين</summary>
            <ol className="block-list" aria-label="أجزاء التمرين بالترتيب">
              {plan.blocks.map((block, index) => (
                <li key={block.id}>
                  <strong><span className="block-order">{index + 1}</span> {block.title}</strong>
                  <span>{block.exerciseIds.length} تمارين{block.rounds > 1 ? ` × ${block.rounds} جولات` : ''}</span>
                </li>
              ))}
            </ol>
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
          </details>
        </>
      ) : !day.feedback ? (
        <FeedbackForm exerciseIds={day.workout.exercises.map((item) => item.exerciseId)} onSubmit={(input) => saveFeedback(state.today, input)} />
      ) : (
        <p className="muted">
          خلّصتي النهارده 👏 {Math.round(day.workout.activeSeconds / 60)} دقيقة · {Math.round(day.workout.mainCompletion * 100)}% من التمرين · الصعوبة {day.feedback.difficulty}/10
        </p>
      )}
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


