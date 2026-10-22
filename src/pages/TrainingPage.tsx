import { useState } from 'react'
import { Check, Flame, Play, Sparkles, Timer } from 'lucide-react'
import { dayNumberFor } from '../../shared/date'
import { isPeriodPassDate } from '../../shared/dayPasses'
import { EXERCISE_BY_ID } from '../../shared/exercises'
import { LEVELS, planForDay, type WorkoutPlan } from '../../shared/program'
import type { AppState, DayRecord } from '../../shared/types'
import { CheckInForm } from '../components/CheckInForm'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { FeedbackForm } from '../components/FeedbackForm'
import { Card, EmptyState, Notice, PageHeader } from '../components/ui'
import { ENERGY_OPTIONS, labelOf, MOOD_OPTIONS } from '../lib/labels'
import { navigate } from '../lib/router'
import { useAppData, useAppState } from '../state/AppData'
import { resumableSession, workSummary } from '../workout/session'

/** التمرين: today's workout on its own page, one step at a time. */
export function TrainingPage() {
  const state = useAppState()
  const start = state.profile.programStartDate
  if (!start) {
    return (
      <div className="page">
        <PageHeader eyebrow="التمرين" title="تمرين النهارده" />
        <EmptyState icon={<Play />} title="ابدئي البرنامج الأول">التمرين بيبدأ من اليوم الأول، من الصفحة الرئيسية.</EmptyState>
      </div>
    )
  }
  const day = state.days.find((item) => item.date === state.today)
  const plan = planForDay(state.days, state.today, dayNumberFor(start, state.today), day?.checkin)
  return (
    <div className="page">
      <PageHeader eyebrow="التمرين" title="تمرين النهارده" />
      {isPeriodPassDate(state, state.today) && !day?.workout
        ? <PeriodRest state={state} day={day} plan={plan} />
        : <TodayWorkout state={state} day={day} plan={plan} />}
    </div>
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
