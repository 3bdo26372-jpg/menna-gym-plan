import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cairoDate } from '../../shared/date'
import type { ReportData } from '../../shared/report'
import type { FoodInput } from '../../shared/food'
import type { WaterSpendInput } from '../../shared/waterPoints'
import type { AppState, MeasurementInput, ReportKind } from '../../shared/types'
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
  markRewardCelebrated(id: string): Promise<void>
  addFood(date: string, input: FoodInput): Promise<void>
  deleteFood(id: number): Promise<void>
  spendWaterPoints(input: WaterSpendInput): Promise<void>
  generateReport(kind: ReportKind, periodIndex: number): Promise<ReportData>
  getReport(kind: ReportKind, periodIndex: number): Promise<ReportData>
}

const AppDataContext = createContext<AppDataValue | null>(null)

/**
 * The API URL comes from VITE_API_URL at build time or, failing that, from
 * /api-config.json (written by the deploy-api GitHub workflow). Without
 * either, the app uses the local development fallback.
 */
async function resolveBackend(): Promise<Backend> {
  const built = import.meta.env.VITE_API_URL?.trim()
  if (built) return createHttpBackend(built)
  try {
    const response = await fetch('/api-config.json', { cache: 'no-store' })
    const config = response.ok ? ((await response.json()) as { apiUrl?: string }) : {}
    if (config.apiUrl?.trim()) return createHttpBackend(config.apiUrl.trim())
  } catch {
    /* no runtime config: fall back to local mode */
  }
  return createLocalBackend()
}

/** A Backend that forwards every call once the real one is resolved. */
function createBackend(): Backend {
  let resolved: Backend | null = null
  const ready = resolveBackend().then((backend) => (resolved = backend))
  const forward = <K extends Exclude<keyof Backend, 'mode'>>(key: K) =>
    ((...args: unknown[]) => ready.then((backend) => (backend[key] as (...a: unknown[]) => unknown)(...args))) as Backend[K]
  return {
    get mode() {
      return resolved?.mode ?? 'remote'
    },
    getState: forward('getState'),
    startProgram: forward('startProgram'),
    saveCheckin: forward('saveCheckin'),
    saveWorkout: forward('saveWorkout'),
    saveFeedback: forward('saveFeedback'),
    addMeasurement: forward('addMeasurement'),
    markRewardCelebrated: forward('markRewardCelebrated'),
    addFood: forward('addFood'),
    deleteFood: forward('deleteFood'),
    spendWaterPoints: forward('spendWaterPoints'),
    generateReport: forward('generateReport'),
    getReport: forward('getReport'),
  }
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
      markRewardCelebrated: async (id) => void (await apply(backend.markRewardCelebrated(id))),
      addFood: async (date, input) => void (await apply(backend.addFood(date, input))),
      deleteFood: async (id) => void (await apply(backend.deleteFood(id))),
      spendWaterPoints: async (input) => void (await apply(backend.spendWaterPoints(input))),
      async generateReport(kind, periodIndex) {
        const result = await backend.generateReport(kind, periodIndex)
        setState(result.state)
        return result.report
      },
      getReport: (kind, periodIndex) => backend.getReport(kind, periodIndex),
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
