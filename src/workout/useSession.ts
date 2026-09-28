import { useEffect, useReducer, useRef, useState } from 'react'
import { remainingMs, sessionReducer, sessionStore, type Session } from './session'
import { storage } from '../lib/storage'

const SOUND_KEY = 'menna-flow:sound'

/**
 * Drives a session with a 250 ms ticker. The remaining time is always derived
 * from the step's end timestamp, so re-renders, pauses and a locked screen
 * never reset or drift the timer.
 */
export function useSession(initial: Session) {
  const [session, dispatch] = useReducer(sessionReducer, initial)
  const [now, setNow] = useState(() => Date.now())
  const [soundOn, setSoundOn] = useState(() => storage.get(SOUND_KEY) !== 'off')
  const running = session.endsAt !== null && !session.finished
  const audio = useRef<AudioContext | null>(null)
  const lastStep = useRef(session.stepIndex)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      dispatch({ type: 'tick', now: time })
    }, 250)
    return () => window.clearInterval(timer)
  }, [running])

  // Persist on every meaningful change (steps, pause, switches); ticks alone don't create new state.
  useEffect(() => {
    sessionStore.save(session)
  }, [session])

  // Keep the screen awake while the timer runs.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock.request('screen').then((sentinel) => { lock = sentinel }, () => undefined)
    return () => {
      void lock?.release()
    }
  }, [running])

  // A short cue when a new step starts.
  useEffect(() => {
    if (lastStep.current === session.stepIndex) return
    lastStep.current = session.stepIndex
    navigator.vibrate?.(session.steps[session.stepIndex]?.kind === 'work' ? [60, 40, 60] : 80)
    if (!soundOn || !audio.current) return
    const context = audio.current
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = session.steps[session.stepIndex]?.kind === 'work' ? 880 : 520
    gain.gain.setValueAtTime(0.12, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.26)
  }, [session.stepIndex, session.steps, soundOn])

  return {
    session,
    remaining: remainingMs(session, now),
    running,
    soundOn,
    toggleSound() {
      setSoundOn((value) => {
        storage.set(SOUND_KEY, value ? 'off' : 'on')
        return !value
      })
    },
    play() {
      // Audio may only start after a user gesture.
      if (!audio.current && typeof AudioContext !== 'undefined') audio.current = new AudioContext()
      const time = Date.now()
      setNow(time)
      dispatch({ type: 'play', now: time })
    },
    pause: () => dispatch({ type: 'pause', now: Date.now() }),
    skip: () => dispatch({ type: 'skip', now: Date.now() }),
    finish: () => dispatch({ type: 'finish', now: Date.now() }),
    switchTo: (exerciseId: string | null) => dispatch({ type: 'switch', exerciseId }),
  }
}
