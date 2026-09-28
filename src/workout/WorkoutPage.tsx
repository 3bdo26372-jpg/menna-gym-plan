import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownUp, CircleCheck, HeartPulse, Pause, Play, SkipForward, Undo2, Volume2, VolumeX, X,
} from 'lucide-react'
import { dayNumberFor } from '../../shared/date'
import { EXERCISE_BY_ID, getExercise } from '../../shared/exercises'
import { planForDay } from '../../shared/program'
import type { AppState } from '../../shared/types'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { FeedbackForm } from '../components/FeedbackForm'
import { SafetyNote } from '../components/SafetyNote'
import { Card, ProgressBar, ScoreRing } from '../components/ui'
import { formatClock } from '../lib/format'
import { navigate } from '../lib/router'
import { useAppData, useAppState } from '../state/AppData'
import { createSession, exerciseForStep, resumableSession, sessionStore, toWorkoutInput, workSummary, type Session } from './session'
import { useSession } from './useSession'

/** Resume a stored session (paused) for today or last night, otherwise plan a new one. */
function initialSession(state: AppState): Session | null {
  const stored = resumableSession(state.today, state.days)
  if (stored) {
    if (stored.endsAt === null) return stored
    const step = stored.steps[stored.stepIndex]
    return { ...stored, endsAt: null, remainingMs: Math.min(step.seconds * 1000, Math.max(0, stored.endsAt - Date.now())) }
  }
  const start = state.profile.programStartDate
  const today = state.days.find((day) => day.date === state.today)
  if (!start || !today?.checkin) return null
  return createSession(state.today, planForDay(state.days, state.today, dayNumberFor(start, state.today), today.checkin))
}

export function WorkoutPage() {
  const state = useAppState()
  const [initial] = useState(() => initialSession(state))
  if (!initial) {
    return (
      <div className="player-shell">
        <Card className="player-empty">
          <h2>سجّلي إحساسك الأول</h2>
          <p>الـ check-in بيحدد شدة تمرين النهارده.</p>
          <button type="button" className="button primary" onClick={() => navigate('today')}>روحي للصفحة الرئيسية</button>
        </Card>
      </div>
    )
  }
  return <Player initial={initial} />
}

type Phase = 'play' | 'saving' | 'feedback' | 'done'

function Player({ initial }: { initial: Session }) {
  const { saveWorkout, saveFeedback, state } = useAppData()
  const player = useSession(initial)
  const { session, remaining, running } = player
  const alreadySaved = Boolean(state?.days.find((day) => day.date === initial.date)?.workout)
  const [phase, setPhase] = useState<Phase>(initial.finished && alreadySaved ? 'feedback' : 'play')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const savingRef = useRef(false)

  const step = session.steps[session.stepIndex]
  const exercise = getExercise(exerciseForStep(session, step))
  const planned = getExercise(step.plannedExerciseId)
  const alternative = planned.alternativeId ? EXERCISE_BY_ID[planned.alternativeId] : undefined
  const usingAlternative = exercise.id !== planned.id
  const workSteps = useMemo(() => session.steps.map((item, index) => ({ item, index })).filter(({ item }) => item.kind === 'work'), [session.steps])
  const workPosition = workSteps.findIndex(({ index }) => index >= session.stepIndex) + 1
  const nextWork = workSteps.find(({ index }) => index > session.stepIndex)
  const elapsed = session.steps.slice(0, session.stepIndex).reduce((sum, item) => sum + item.seconds, 0) + (step.seconds - remaining / 1000)
  const total = session.steps.reduce((sum, item) => sum + item.seconds, 0)
  const halfway = exercise.bothSides && step.kind === 'work' && remaining / 1000 <= step.seconds / 2

  // A finished session that is not saved yet shows the saving view until the request settles.
  const view: Phase = phase === 'play' && session.finished ? 'saving' : phase

  async function persist() {
    if (savingRef.current) return
    savingRef.current = true
    try {
      if (workSummary(session).done === 0) {
        sessionStore.clear()
        navigate('today')
        return
      }
      await saveWorkout(session.date, toWorkoutInput(session))
      setSaveError(null)
      setPhase('feedback')
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    // Also runs on mount, so a finished session whose save failed earlier is retried.
    if (session.finished && phase === 'play') queueMicrotask(() => void persist())
    // persist reads the latest session; it only needs to run when the session finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.finished])

  if (view !== 'play') {
    return (
      <FinishedView
        session={session}
        phase={view}
        error={saveError}
        onRetry={() => { setSaveError(null); void persist() }}
        onFeedback={async (input) => {
          await saveFeedback(session.date, input)
          sessionStore.clear()
          setPhase('done')
        }}
      />
    )
  }

  return (
    <div className="player-shell">
      <div className="player">
        <header className="player-top">
          <button type="button" className="icon-button" onClick={() => { player.pause(); navigate('today') }} aria-label="إغلاق التمرين (هيتحفظ)">
            <X />
          </button>
          <div className="player-top-copy">
            <strong>{step.blockTitle}</strong>
            <span>تمرين {Math.max(1, workPosition)} من {workSteps.length}{step.rounds > 1 ? ` · جولة ${step.round} من ${step.rounds}` : ''}</span>
          </div>
          <button type="button" className="icon-button" onClick={player.toggleSound} aria-label={player.soundOn ? 'كتم الصوت' : 'تشغيل الصوت'}>
            {player.soundOn ? <Volume2 /> : <VolumeX />}
          </button>
        </header>
        <ProgressBar value={elapsed} max={total} label="تقدم التمرين" />

        <div className={`player-stage ${step.kind === 'rest' ? 'is-rest' : ''}`}>
          <div className="player-media">
            <ExerciseMedia exercise={exercise} size="lg" eager />
            {step.kind === 'rest' && <span className="rest-badge">راحة · استعدي</span>}
            {halfway && <span className="switch-side-badge">بدّلي الجهة</span>}
          </div>
          <div className="player-info">
            <div className="player-name">
              <h1>{exercise.name}</h1>
              <span>{exercise.nameAr}{usingAlternative && ' · البديل الأسهل'}</span>
            </div>
            <div className={`player-timer ${step.kind}`} aria-live="off">
              <span className="timer-digits">{formatClock(remaining / 1000)}</span>
              <span className="timer-label">{step.kind === 'work' ? (running ? 'تحركي' : 'متوقف') : 'راحة'}</span>
            </div>
          </div>
          <p className="player-instruction">{exercise.instruction}</p>
        </div>

        <div className="player-side">
        <div className="player-controls">
          <button type="button" className="control-main" onClick={running ? player.pause : player.play}>
            {running ? <><Pause /> إيقاف مؤقت</> : <><Play /> {session.startedAt ? 'كمّلي' : 'ابدئي'}</>}
          </button>
          <button type="button" className="control" onClick={player.skip}><SkipForward /> تخطي</button>
          {usingAlternative ? (
            <button type="button" className="control" onClick={() => player.switchTo(null)}><Undo2 /> الأساسي</button>
          ) : alternative ? (
            <button type="button" className="control easier" onClick={() => player.switchTo(alternative.id)}><ArrowDownUp /> صعب؟ أسهل</button>
          ) : (
            <button type="button" className="control" disabled title="التمرين ده منخفض الشدة؛ خففي السرعة أو المدى"><ArrowDownUp /> أسهل</button>
          )}
        </div>
        {!usingAlternative && alternative && <p className="alt-hint">البديل: {alternative.name} — {alternative.nameAr}</p>}

        {nextWork && (
          <div className="next-up">
            <ExerciseMedia exercise={getExercise(exerciseForStep(session, nextWork.item))} size="sm" />
            <div><span>التالي</span><strong>{getExercise(exerciseForStep(session, nextWork.item)).name}</strong></div>
          </div>
        )}

        <div className="player-footer">
          <button type="button" className="link-button" onClick={() => { player.pause(); setSafetyOpen(true) }}><HeartPulse /> مش مرتاحة؟</button>
          <button type="button" className="link-button" onClick={() => { player.pause(); setConfirmFinish(true) }}><CircleCheck /> إنهاء التمرين</button>
        </div>
        </div>
      </div>

      <AnimatePresence>
        {(confirmFinish || safetyOpen) && (
          <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="sheet" role="dialog" aria-modal="true" initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
              {safetyOpen ? (
                <>
                  <h2>خدي نفس، التمرين متوقف</h2>
                  <SafetyNote />
                  <div className="sheet-actions">
                    {alternative && !usingAlternative && (
                      <button type="button" className="button secondary" onClick={() => { player.switchTo(alternative.id); setSafetyOpen(false) }}>بدّلي للأسهل</button>
                    )}
                    <button type="button" className="button secondary" onClick={() => setSafetyOpen(false)}>ارتحت، هكمّل</button>
                    <button type="button" className="button primary" onClick={() => { setSafetyOpen(false); player.finish() }}>إنهاء التمرين</button>
                  </div>
                </>
              ) : (
                <>
                  <h2>تنهي التمرين دلوقتي؟</h2>
                  <p>هيتحفظ اللي عملتيه، والنقاط بتتحسب على الجزء اللي خلص.</p>
                  <div className="sheet-actions">
                    <button type="button" className="button secondary" onClick={() => setConfirmFinish(false)}>لا، كمّلي</button>
                    <button type="button" className="button primary" onClick={() => { setConfirmFinish(false); player.finish() }}>أيوه، إنهاء</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FinishedView({ session, phase, error, onRetry, onFeedback }: {
  session: Session
  phase: Phase
  error: string | null
  onRetry: () => void
  onFeedback: Parameters<typeof FeedbackForm>[0]['onSubmit']
}) {
  const state = useAppState()
  const day = state.days.find((item) => item.date === session.date)
  const summary = workSummary(session)
  const performed = Object.values(session.performed)
  return (
    <div className="player-shell">
      <div className="player finished">
        {phase === 'done' ? (
          <motion.div className="done-view" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <ScoreRing score={day?.score.total ?? 0} size={150} />
            <h1>كده تمام يا منّة</h1>
            <p>{Math.round(summary.done / 60)} دقيقة حركة النهارده. اشربي مية وخدي نفس هادي.</p>
            {day?.feedback?.pain && <SafetyNote compact />}
            <button type="button" className="button primary" onClick={() => navigate('today')}>الرجوع للصفحة الرئيسية</button>
          </motion.div>
        ) : (
          <>
            <header className="finished-head">
              <span className="finished-icon"><CircleCheck /></span>
              <div>
                <h1>{summary.ratio >= 0.99 ? 'خلّصتي التمرين!' : 'اتحفظ اللي عملتيه'}</h1>
                <p>{Math.round(summary.done / 60)} دقيقة حركة · {Math.round(summary.ratio * 100)}% من التمرين</p>
              </div>
            </header>
            {phase === 'saving' && (error
              ? <div className="notice notice-care"><div><strong>تعذّر الحفظ</strong><div>{error}</div><button type="button" className="button secondary" onClick={onRetry}>حاولي تاني</button></div></div>
              : <p className="muted">جاري الحفظ…</p>)}
            {phase === 'feedback' && (
              <Card>
                <h2 className="card-title">قيّمي تمرين النهارده</h2>
                <p className="muted">التقييم بيخلّي التمارين الجاية مناسبة ليكي أكتر.</p>
                <FeedbackForm exerciseIds={performed} onSubmit={onFeedback} />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
