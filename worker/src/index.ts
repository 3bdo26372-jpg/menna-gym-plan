import { cairoDate, diffDays, isIsoDate } from '../../shared/date'
import { checkFoodDate, validateFood } from '../../shared/food'
import { checkWritableDate, newRewardUnlocks, preferWorkout, validateCheckin, validateFeedback, validateWorkout } from '../../shared/engine'
import { validateMeasurementValues } from '../../shared/measurements'
import { buildReport } from '../../shared/report'
import type { AppState, ReportKind, RewardPatch } from '../../shared/types'
import {
  addFood,
  addMeasurement,
  deleteFood,
  foodDate,
  loadReport,
  loadState,
  markCelebrated,
  refreshDerived,
  saveCheckin,
  saveFeedback,
  saveReport,
  saveWorkout,
  startProgram,
  updateReward,
} from './db'
import { originMatches } from './cors'

export interface Env {
  DB: D1Database
  /** Shared secret Menna types once in the app. Set with `wrangler secret put APP_PASSCODE`. */
  APP_PASSCODE?: string
  ALLOWED_ORIGINS?: string
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin')
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  if (!origin || !allowed.some((pattern) => originMatches(pattern, origin))) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

async function isAuthorized(request: Request, env: Env) {
  if (!env.APP_PASSCODE) throw new HttpError(500, 'APP_PASSCODE is not configured on the API')
  const header = request.headers.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(env.APP_PASSCODE)),
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

async function body<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'request body must be JSON')
  }
}

function requireWritable(state: AppState, date: string) {
  const problem = checkWritableDate(date, state.today, state.profile.programStartDate)
  if (problem) throw new HttpError(problem.includes('not started') ? 409 : 400, problem)
}

async function afterWrite(env: Env, today: string, date?: string) {
  const state = await loadState(env.DB, today)
  if (date) {
    await refreshDerived(env.DB, state, date)
    return loadState(env.DB, today)
  }
  return state
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '')
  const method = request.method
  const today = cairoDate()

  if (path === '/api/health') return json({ ok: true, today })
  if (!(await isAuthorized(request, env))) throw new HttpError(401, 'passcode required')

  if (method === 'GET' && path === '/api/state') {
    const state = await loadState(env.DB, today)
    // Catch up on anything that crossed a reward threshold since the last write.
    if (newRewardUnlocks(state.days, state.rewards).length === 0) return json(state)
    await refreshDerived(env.DB, state, today)
    return json(await loadState(env.DB, today))
  }

  if (method === 'POST' && path === '/api/program/start') {
    await startProgram(env.DB, today)
    return json(await afterWrite(env, today, today))
  }

  const day = path.match(/^\/api\/days\/(\d{4}-\d{2}-\d{2})\/(checkin|workout|feedback)$/)
  if (day && method === 'PUT') {
    const [, date, part] = day
    const state = await loadState(env.DB, today)
    requireWritable(state, date)
    const input = await body(request)
    if (part === 'checkin') {
      const checkin = validateCheckin(input)
      if (typeof checkin === 'string') throw new HttpError(400, checkin)
      await saveCheckin(env.DB, date, checkin)
    } else if (part === 'workout') {
      const workout = validateWorkout(input)
      if (typeof workout === 'string') throw new HttpError(400, workout)
      const existing = state.days.find((item) => item.date === date)?.workout ?? null
      if (preferWorkout(existing, workout)) await saveWorkout(env.DB, date, workout)
    } else {
      if (!state.days.find((item) => item.date === date)?.workout) throw new HttpError(409, 'finish the workout before sending feedback')
      const feedback = validateFeedback(input)
      if (typeof feedback === 'string') throw new HttpError(400, feedback)
      await saveFeedback(env.DB, date, feedback)
    }
    return json(await afterWrite(env, today, date))
  }

  if (method === 'POST' && path === '/api/measurements') {
    const input = await body<{ measuredOn?: unknown; values?: unknown; note?: unknown }>(request)
    if (!isIsoDate(input.measuredOn) || input.measuredOn > today) throw new HttpError(400, 'measuredOn must be a date up to today')
    const values = validateMeasurementValues(input.values)
    if (typeof values === 'string') throw new HttpError(400, values)
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) || undefined : undefined
    await addMeasurement(env.DB, { measuredOn: input.measuredOn, values, note })
    return json(await afterWrite(env, today))
  }

  const reward = path.match(/^\/api\/rewards\/([\w-]+)(\/celebrated)?$/)
  if (reward && method === 'PATCH' && !reward[2]) {
    const input = await body<Record<string, unknown>>(request)
    const text = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined)
    const patch: RewardPatch = { title: text(input.title, 80), description: text(input.description, 400), emoji: text(input.emoji, 8) }
    if (!(await updateReward(env.DB, reward[1], patch))) throw new HttpError(404, 'reward not found')
    return json(await afterWrite(env, today))
  }
  if (reward && method === 'POST' && reward[2]) {
    await markCelebrated(env.DB, reward[1])
    return json(await afterWrite(env, today))
  }

  const food = path.match(/^\/api\/days\/(\d{4}-\d{2}-\d{2})\/food$/)
  if (food && method === 'POST') {
    const state = await loadState(env.DB, today)
    const problem = checkFoodDate(food[1], today, state.profile.programStartDate, diffDays)
    if (problem) throw new HttpError(problem.includes('not started') ? 409 : 400, problem)
    const entry = validateFood(await body(request))
    if (typeof entry === 'string') throw new HttpError(400, entry)
    await addFood(env.DB, food[1], entry)
    return json(await loadState(env.DB, today))
  }
  const foodItem = path.match(/^\/api\/food\/(\d+)$/)
  if (foodItem && method === 'DELETE') {
    const date = await foodDate(env.DB, Number(foodItem[1]))
    if (!date) throw new HttpError(404, 'food entry not found')
    const state = await loadState(env.DB, today)
    const problem = checkFoodDate(date, today, state.profile.programStartDate, diffDays)
    if (problem) throw new HttpError(400, problem)
    await deleteFood(env.DB, Number(foodItem[1]))
    return json(await loadState(env.DB, today))
  }

  const report = path.match(/^\/api\/reports\/(week|month)\/(\d+)$/)
  if (report) {
    const kind = report[1] as ReportKind
    const periodIndex = Number(report[2])
    if (periodIndex < 1) throw new HttpError(400, 'invalid period')
    if (method === 'GET') {
      const saved = await loadReport(env.DB, kind, periodIndex)
      if (!saved) throw new HttpError(404, 'report not found')
      return json(saved)
    }
    if (method === 'POST') {
      const state = await loadState(env.DB, today)
      if (!state.profile.programStartDate) throw new HttpError(409, 'the program has not started yet')
      const data = buildReport(state, kind, periodIndex)
      if (data.startDate > today) throw new HttpError(400, 'that period has not started yet')
      await saveReport(env.DB, data)
      return json({ report: data, state: await loadState(env.DB, today) })
    }
  }

  throw new HttpError(404, 'not found')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    try {
      const response = await route(request, env)
      for (const [key, value] of Object.entries(cors)) response.headers.set(key, value)
      return response
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      const message = error instanceof Error ? error.message : 'unexpected error'
      if (status === 500) console.error(error)
      return json({ error: message }, status, cors)
    }
  },
} satisfies ExportedHandler<Env>
