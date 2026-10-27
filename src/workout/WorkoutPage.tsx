import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
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
import { navigate } from '../lib/router'
import { useAppData, useAppState } from '../state/AppData'
import { createSession, exerciseForStep, resumableSession, sessionStore, toWorkoutInput, workSummary, type Session } from './session'
import { CheerBubble, FinishCelebration } from './CheerOverlays'
import { currentCheer, finishStyle, hardestExerciseIds, planCheers } from './cheers'
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
          <button type="button" className="button primary" onClick={() => navigate('training')}>ارجعي لصفحة التمرين</button>
        </Card>
      </div>
    )
  }
  return <Player initial={initial} />
}

type Phase = 'play' | 'saving' | 'feedback' | 'done'

/** "0:28", "1:05": the step's time left, without a leading zero. */
function formatTimer(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** The first start counts down from this, so she has a moment to get in place. */
const GET_READY_SECONDS = 3
/** The timer says she's nearly there for the last few seconds of a move. */
const ALMOST_SECONDS = 5

/** The time left, inside a ring that empties as the step goes. */
function TimerRing({ remaining, seconds, kind, label }: { remaining: number; seconds: number; kind: 'work' | 'rest'; label: string }) {
  const radius = 46
  const length = 2 * Math.PI * radius
  const left = seconds > 0 ? Math.min(1, Math.max(0, remaining / 1000 / seconds)) : 0
  return (
    <div className={`player-timer ${kind}`} aria-live="off">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={radius} />
        <circle className="ring-fill" cx="50" cy="50" r={radius} strokeDasharray={length} strokeDashoffset={length * (1 - left)} />
      </svg>
      <span className="timer-digits">{formatTimer(remaining / 1000)}</span>
      <span className="timer-label">{label}</span>
    </div>
  )
}

function Player({ initial }: { initial: Session }) {
  const { saveWorkout, saveFeedback, state } = useAppData()
  const player = useSession(initial)
  const { session, remaining, running } = player
  const alreadySaved = Boolean(state?.days.find((day) => day.date === initial.date)?.workout)
  const [phase, setPhase] = useState<Phase>(initial.finished && alreadySaved ? 'feedback' : 'play')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [getReady, setGetReady] = useState<number | null>(null)
  const savingRef = useRef(false)
  const hardest = useMemo(() => hardestExerciseIds(state?.days ?? []), [state?.days])
  const cheers = useMemo(() => planCheers(session, hardest), [session, hardest])
  const cheer = currentCheer(session, cheers, remaining)
  // The big celebration plays once, when the whole workout is finished in this visit.
  const [partyClosed, setPartyClosed] = useState(false)
  const closeParty = useCallback(() => setPartyClosed(true), [])
  const party = !initial.finished && session.finished && workSummary(session).ratio >= 0.99 && !partyClosed

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
  const minutesLeft = Math.max(1, Math.ceil((total - elapsed) / 60))
  // A rest already shows the move that comes next, so its card shows the one after that.
  const upcoming = step.kind === 'rest' && nextWork ? workSteps.find(({ index }) => index > nextWork.index) : nextWork
  const nextExercise = upcoming ? getExercise(exerciseForStep(session, upcoming.item)) : null
  const [lightTip, setLightTip] = useState(false)
  const timerLabel = step.kind === 'rest' ? 'خدي نفس 🌬️'
    : !running ? 'واقف' : remaining / 1000 <= ALMOST_SECONDS ? 'قربتي 💪' : halfway ? 'الجهة التانية' : 'تحركي'

  // 3, 2, 1, then the timer starts. Leaving the page cancels the count.
  const readyTimers = useRef<number[]>([])
  useEffect(() => () => readyTimers.current.forEach((timer) => window.clearTimeout(timer)), [])

  function start() {
    if (session.startedAt) return player.play()
    player.unlockAudio()
    navigator.vibrate?.(40)
    setGetReady(GET_READY_SECONDS)
    readyTimers.current = Array.from({ length: GET_READY_SECONDS }, (_, index) => window.setTimeout(() => {
      const left = GET_READY_SECONDS - index - 1
      setGetReady(left || null)
      if (!left) player.play()
    }, (index + 1) * 1000))
  }

  // A finished session that is not saved yet shows the saving view until the request settles.
  const view: Phase = phase === 'play' && session.finished ? 'saving' : phase

  async function persist() {
    if (savingRef.current) return
    savingRef.current = true
    try {
      if (workSummary(session).done === 0) {
        sessionStore.clear()
        navigate('training')
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
      <>
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
        <FinishCelebration open={party} variant={finishStyle(session.plan.dayNumber)} onClose={closeParty} />
      </>
    )
  }

  return (
    <div className="player-shell">
      <div className="player">
        <header className="player-top">
          <button type="button" className="icon-button" onClick={() => { player.pause(); navigate('training') }} aria-label="إغلاق التمرين (هيتحفظ)">
            <X />
          </button>
          <div className="player-top-copy">
            <strong>{step.blockTitle}</strong>
            <span>تمرين {Math.max(1, workPosition)} من {workSteps.length}{step.rounds > 1 ? ` · جولة ${step.round} من ${step.rounds}` : ''} · فاضل {minutesLeft} د</span>
          </div>
          <button type="button" className="icon-button" onClick={player.toggleSound} aria-label={player.soundOn ? 'كتم الصوت' : 'تشغيل الصوت'}>
            {player.soundOn ? <Volume2 /> : <VolumeX />}
          </button>
        </header>
        <ProgressBar value={elapsed} max={total} label="تقدم التمرين" />

        <div className={`player-stage ${step.kind === 'rest' ? 'is-rest' : ''}`}>
          <div className="player-media">
            {/* Each new move fades in gently instead of jumping. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div key={`${session.stepIndex}:${exercise.id}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                <ExerciseMedia exercise={exercise} size="lg" eager />
              </m.div>
            </AnimatePresence>
            {step.kind === 'rest' && <span className="rest-badge">راحة · ده اللي جاي</span>}
            {halfway && <span className="switch-side-badge">بدّلي الجهة 🔄</span>}
            <CheerBubble cheer={cheer} />
          </div>
          <div className="player-info">
            <m.div key={`${session.stepIndex}:${exercise.id}`} className="player-name" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
              <h1>{exercise.nameAr}</h1>
              <span>{exercise.name}{usingAlternative && ' · البديل الأسهل 🍃'}</span>
            </m.div>
            <TimerRing remaining={remaining} seconds={step.seconds} kind={step.kind} label={timerLabel} />
          </div>
          <p className="player-instruction">{exercise.instruction}</p>
        </div>

        <div className="player-side">
        <div className="player-controls">
          <button type="button" className="control-main" onClick={running ? player.pause : start} disabled={getReady !== null}>
            {running ? <><Pause /> {step.kind === 'rest' ? 'وقّفي الوقت' : 'استريحي شوية'}</> : <><Play /> {session.startedAt ? 'نكمّل' : 'يلا نبدأ'}</>}
          </button>
          <button type="button" className="control" onClick={player.skip}><SkipForward /> {step.kind === 'rest' ? 'جاهزة، يلا' : 'اللي بعده'}</button>
          {usingAlternative ? (
            <button type="button" className="control" onClick={() => player.switchTo(null)}><Undo2 /> الأساسي</button>
          ) : alternative ? (
            <button type="button" className="control easier" onClick={() => player.switchTo(alternative.id)}><ArrowDownUp /> أسهل شوية 🍃</button>
          ) : (
            // No easier version of this move: the button says how to make it lighter instead.
            <button type="button" className="control" aria-expanded={lightTip} onClick={() => setLightTip((open) => !open)}><ArrowDownUp /> أسهل</button>
          )}
        </div>
        {!usingAlternative && alternative && <p className="alt-hint">البديل الأسهل: {alternative.nameAr} — {alternative.name}</p>}
        {!usingAlternative && !alternative && lightTip && <p className="alt-hint">التمرين ده خفيف أصلًا 🤍 بطّئي الحركة أو صغّري المدى على راحتك</p>}

        {nextExercise && (
          <div className="next-up">
            <ExerciseMedia exercise={nextExercise} size="sm" />
            <div><span>{step.kind === 'rest' ? 'وبعده' : 'اللي بعده'}</span><strong>{nextExercise.nameAr}</strong><small>{nextExercise.name}</small></div>
          </div>
        )}

        <div className="player-footer">
          <button type="button" className="link-button" onClick={() => { player.pause(); setSafetyOpen(true) }}><HeartPulse /> مش مرتاحة؟</button>
          <button type="button" className="link-button" onClick={() => { player.pause(); setConfirmFinish(true) }}><CircleCheck /> إنهاء التمرين</button>
        </div>
        </div>
      </div>

      <AnimatePresence>
        {getReady !== null && getReady > 0 && (
          <m.div className="get-ready" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p>خدي مكانك… 🌸</p>
            <m.strong key={getReady} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 220 }}>{getReady}</m.strong>
            <span>{exercise.nameAr}</span>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(confirmFinish || safetyOpen) && (
          <m.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <m.div className="sheet" role="dialog" aria-modal="true" initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
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
                  <p>عادي خالص 🤍 اللي عملتيه هيتحفظ، والنقط بتتحسب على الجزء اللي خلص.</p>
                  <div className="sheet-actions">
                    <button type="button" className="button secondary" onClick={() => setConfirmFinish(false)}>لا، كمّلي</button>
                    <button type="button" className="button primary" onClick={() => { setConfirmFinish(false); player.finish() }}>أيوه، إنهاء</button>
                  </div>
                </>
              )}
            </m.div>
          </m.div>
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
          <m.div className="done-view" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <ScoreRing score={day?.score.total ?? 0} size={150} />
            <h1>كده تمام يا منّة</h1>
            <p>{Math.round(summary.done / 60)} دقيقة تمرين النهارده. اشربي مية وخدي نفس هادي.</p>
            {day?.feedback?.pain && <SafetyNote compact />}
            <button type="button" className="button primary" onClick={() => navigate('training')}>كمّلي على صفحة التمرين</button>
          </m.div>
        ) : (
          <>
            <header className="finished-head">
              <span className="finished-icon"><CircleCheck /></span>
              <div>
                <h1>{summary.ratio >= 0.99 ? 'خلّصتي التمرين!' : 'اتحفظ اللي عملتيه'}</h1>
                <p>{Math.round(summary.done / 60)} دقيقة تمرين · {Math.round(summary.ratio * 100)}% من التمرين</p>
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
