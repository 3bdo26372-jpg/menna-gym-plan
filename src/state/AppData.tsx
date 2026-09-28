import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cairoDate } from '../../shared/date'
import type { ReportData } from '../../shared/report'
import type { AppState, MeasurementInput, RewardPatch } from '../../shared/types'
import { AuthRequiredError, type Backend, type CheckInInput, type FeedbackInput, type WorkoutInput } from '../lib/backend'
import { createHttpBackend, passcodeStore } from '../lib/httpBackend'
import { createLocalBackend } from '../lib/localBackend'

type Status = 'loading' | 'ready' | 'error' | 'passcode'

interface AppDataValue {
  mode: Backend['mode']
  status: Status
  state: AppState | null
  error: string | null
  reload(): Promise<void>
  submitPasscode(passcode: string): Promise<boolean>
  startProgram(): Promise<void>
  saveCheckin(date: string, input: CheckInInput): Promise<void>
  saveWorkout(date: string, input: WorkoutInput): Promise<AppState>
  saveFeedback(date: string, input: FeedbackInput): Promise<void>
  addMeasurement(input: MeasurementInput): Promise<void>
  updateReward(id: string, patch: RewardPatch): Promise<void>
  markRewardCelebrated(id: string): Promise<void>
  generateReport(periodIndex: number): Promise<ReportData>
  getReport(periodIndex: number): Promise<ReportData>
}

const AppDataContext = createContext<AppDataValue | null>(null)

function createBackend(): Backend {
  const url = import.meta.env.VITE_API_URL?.trim()
  return url ? createHttpBackend(url) : createLocalBackend()
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [backend] = useState(createBackend)
  const [state, setState] = useState<AppState | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((caught: unknown) => {
    if (caught instanceof AuthRequiredError) {
      setStatus('passcode')
      return
    }
    setError(caught instanceof Error ? caught.message : String(caught))
    setStatus((current) => (current === 'ready' ? current : 'error'))
  }, [])

  const reload = useCallback(async () => {
    try {
      const next = await backend.getState()
      setState(next)
      setError(null)
      setStatus('ready')
    } catch (caught) {
      handleError(caught)
    }
  }, [backend, handleError])

  useEffect(() => {
    let cancelled = false
    backend.getState().then(
      (next) => {
        if (cancelled) return
        setState(next)
        setStatus('ready')
      },
      (caught) => {
        if (!cancelled) handleError(caught)
      },
    )
    return () => {
      cancelled = true
    }
  }, [backend, handleError])

  // A new Cairo day starts at local midnight in Cairo, whatever the phone's time zone.
  useEffect(() => {
    if (!state) return
    const timer = window.setInterval(() => {
      if (cairoDate() !== state.today) void reload()
    }, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && cairoDate() !== state.today) void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state, reload])

  const value = useMemo<AppDataValue>(() => {
    const apply = async (action: Promise<AppState>) => {
      try {
        const next = await action
        setState(next)
        return next
      } catch (caught) {
        if (caught instanceof AuthRequiredError) setStatus('passcode')
        throw caught
      }
    }
    return {
      mode: backend.mode,
      status,
      state,
      error,
      reload,
      async submitPasscode(passcode) {
        passcodeStore.set(passcode.trim())
        try {
          setState(await backend.getState())
          setStatus('ready')
          return true
        } catch (caught) {
          if (caught instanceof AuthRequiredError) {
            passcodeStore.clear()
            return false
          }
          handleError(caught)
          return true
        }
      },
      startProgram: async () => void (await apply(backend.startProgram())),
      saveCheckin: async (date, input) => void (await apply(backend.saveCheckin(date, input))),
      saveWorkout: (date, input) => apply(backend.saveWorkout(date, input)),
      saveFeedback: async (date, input) => void (await apply(backend.saveFeedback(date, input))),
      addMeasurement: async (input) => void (await apply(backend.addMeasurement(input))),
      updateReward: async (id, patch) => void (await apply(backend.updateReward(id, patch))),
      markRewardCelebrated: async (id) => void (await apply(backend.markRewardCelebrated(id))),
      async generateReport(periodIndex) {
        const result = await backend.generateReport(periodIndex)
        setState(result.state)
        return result.report
      },
      getReport: (periodIndex) => backend.getReport(periodIndex),
    }
  }, [backend, status, state, error, reload, handleError])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData must be used inside AppDataProvider')
  return value
}

/** For screens that only render once data is loaded. */
export function useAppState(): AppState {
  const { state } = useAppData()
  if (!state) throw new Error('state is not loaded yet')
  return state
}
