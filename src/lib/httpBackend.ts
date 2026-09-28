import type { ReportData } from '../../shared/report'
import type { AppState } from '../../shared/types'
import { ApiError, AuthRequiredError, type Backend } from './backend'
import { storage } from './storage'

const PASSCODE_KEY = 'menna-flow:passcode'

export const passcodeStore = {
  get: () => storage.get(PASSCODE_KEY) ?? '',
  set: (value: string) => storage.set(PASSCODE_KEY, value),
  clear: () => storage.remove(PASSCODE_KEY),
}

/** Talks to the Cloudflare Worker API. The passcode is typed by Menna, never bundled. */
export function createHttpBackend(baseUrl: string): Backend {
  const root = baseUrl.replace(/\/+$/, '')

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!passcodeStore.get()) throw new AuthRequiredError()
    const response = await fetch(`${root}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${passcodeStore.get()}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status === 401) throw new AuthRequiredError()
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new ApiError(response.status, (data as { error?: string }).error ?? `HTTP ${response.status}`)
    return data as T
  }

  return {
    mode: 'remote',
    getState: () => request<AppState>('GET', '/api/state'),
    startProgram: () => request<AppState>('POST', '/api/program/start'),
    saveCheckin: (date, input) => request<AppState>('PUT', `/api/days/${date}/checkin`, input),
    saveWorkout: (date, input) => request<AppState>('PUT', `/api/days/${date}/workout`, input),
    saveFeedback: (date, input) => request<AppState>('PUT', `/api/days/${date}/feedback`, input),
    addMeasurement: (input) => request<AppState>('POST', '/api/measurements', input),
    updateReward: (id, patch) => request<AppState>('PATCH', `/api/rewards/${id}`, patch),
    markRewardCelebrated: (id) => request<AppState>('POST', `/api/rewards/${id}/celebrated`),
    addFood: (date, input) => request<AppState>('POST', `/api/days/${date}/food`, input),
    deleteFood: (id) => request<AppState>('DELETE', `/api/food/${id}`),
    generateReport: (kind, periodIndex) => request<{ report: ReportData; state: AppState }>('POST', `/api/reports/${kind}/${periodIndex}`),
    getReport: (kind, periodIndex) => request<ReportData>('GET', `/api/reports/${kind}/${periodIndex}`),
  }
}
