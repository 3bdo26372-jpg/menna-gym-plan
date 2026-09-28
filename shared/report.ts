import { dateRange, periodBounds, dayNumberFor } from './date'
import { latestMeasurement, isActiveDay, round1 } from './engine'
import { EXERCISE_BY_ID } from './exercises'
import { MEASUREMENT_FIELDS } from './measurements'
import { DAY_TYPE_LABEL } from './program'
import type { AppState, DayType, Energy } from './types'

/**
 * Everything the monthly (30-day) PDF shows. It is computed from the app
 * state so a saved snapshot can be re-rendered later exactly as it was.
 */
export interface ReportData {
  programName: string
  periodIndex: number
  startDate: string
  endDate: string
  programStartDate: string
  generatedAt: string
  inProgress: boolean
  days: { date: string; dayNumber: number; score: number; recorded: boolean; dayType: DayType | null; active: boolean }[]
  averageScore: number
  workoutCount: number
  activeDays: number
  totalMinutes: number
  averageDifficulty: number | null
  averageEnergyBefore: number | null
  averageEnergyAfter: number | null
  measurements: { key: string; label: string; unit: string; start: number | null; end: number | null; change: number | null; estimate: boolean }[]
  bodyFatTrend: { date: string; value: number }[]
  topExercises: { id: string; name: string; count: number }[]
  favoriteExercises: { id: string; name: string; count: number }[]
  hardExercises: { id: string; name: string; count: number }[]
  rewardsUnlocked: { title: string; emoji: string; unlockedOn: string }[]
  summary: string[]
  suggestions: string[]
}

const ENERGY_VALUE: Record<Energy, number> = { low: 1, normal: 2, high: 3 }

export function energyLabel(value: number | null) {
  if (value === null) return '—'
  if (value < 1.67) return 'منخفضة'
  if (value < 2.34) return 'عادية'
  return 'عالية'
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

function countBy(ids: string[], limit = 5) {
  const counts = new Map<string, number>()
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, name: EXERCISE_BY_ID[id]?.name ?? id, count }))
}

export function buildReport(state: AppState, periodIndex: number, generatedAt = new Date().toISOString()): ReportData {
  const programStartDate = state.profile.programStartDate
  if (!programStartDate) throw new Error('The program has not started yet')
  const { start, end } = periodBounds(programStartDate, periodIndex)
  const lastRecorded = end < state.today ? end : state.today
  const byDate = new Map(state.days.map((day) => [day.date, day]))

  const days = dateRange(start, end).map((date) => {
    const day = byDate.get(date)
    return {
      date,
      dayNumber: dayNumberFor(programStartDate, date),
      score: day?.score.total ?? 0,
      // Today only counts once something has been logged, so an unfinished day doesn't lower the average.
      recorded: date < state.today || (date === state.today && (day?.score.total ?? 0) > 0),
      dayType: day?.workout?.dayType ?? null,
      active: day ? isActiveDay(day) : false,
    }
  })
  const periodDays = state.days.filter((day) => day.date >= start && day.date <= lastRecorded)
  const withWorkout = periodDays.filter((day) => day.workout)
  const recordedCount = days.filter((day) => day.recorded).length

  const averageScore = recordedCount ? Math.round(days.filter((day) => day.recorded).reduce((sum, day) => sum + day.score, 0) / recordedCount) : 0
  const totalMinutes = Math.round(withWorkout.reduce((sum, day) => sum + (day.workout?.activeSeconds ?? 0), 0) / 60)
  const feedbacks = periodDays.flatMap((day) => (day.feedback ? [day.feedback] : []))
  const checkins = periodDays.flatMap((day) => (day.checkin ? [day.checkin] : []))
  const averageDifficulty = average(feedbacks.map((feedback) => feedback.difficulty))
  const averageEnergyBefore = average(checkins.map((checkin) => ENERGY_VALUE[checkin.energy]))
  const averageEnergyAfter = average(feedbacks.map((feedback) => ENERGY_VALUE[feedback.energyAfter]))

  const measurements = MEASUREMENT_FIELDS.map((field) => {
    const startValue = periodIndex === 1
      ? state.baseline.find((metric) => metric.key === field.key)?.value ?? null
      : latestMeasurement(state, field.key, start)?.value ?? null
    const endValue = latestMeasurement(state, field.key, lastRecorded)?.value ?? null
    return {
      key: field.key,
      label: field.label,
      unit: field.unit,
      start: startValue,
      end: endValue,
      change: startValue !== null && endValue !== null ? round1(endValue - startValue) : null,
      estimate: Boolean(field.estimate),
    }
  })
  const bodyFatTrend = state.measurements
    .filter((entry) => entry.values.bodyFat !== undefined && entry.measuredOn >= start && entry.measuredOn <= lastRecorded)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
    .map((entry) => ({ date: entry.measuredOn, value: entry.values.bodyFat }))

  const performed = withWorkout.flatMap((day) =>
    day.workout!.exercises.filter((item) => item.blockId !== 'warmup' && item.blockId !== 'cooldown' && item.completedSeconds > 0).map((item) => item.exerciseId))
  const topExercises = countBy(performed)
  const favoriteExercises = countBy(feedbacks.flatMap((feedback) => (feedback.favoriteExerciseId ? [feedback.favoriteExerciseId] : [])), 3)
  const hardExercises = countBy(feedbacks.flatMap((feedback) => (feedback.hardestExerciseId ? [feedback.hardestExerciseId] : [])), 3)
    .filter((item) => item.count >= 2)
  const rewardsUnlocked = state.rewards
    .filter((reward) => reward.unlockedOn && reward.unlockedOn >= start && reward.unlockedOn <= end)
    .map((reward) => ({ title: reward.title, emoji: reward.emoji, unlockedOn: reward.unlockedOn! }))

  const activeDays = days.filter((day) => day.active).length
  const report: ReportData = {
    programName: 'Menna Flow',
    periodIndex,
    startDate: start,
    endDate: end,
    programStartDate,
    generatedAt,
    inProgress: end >= state.today,
    days,
    averageScore,
    workoutCount: withWorkout.length,
    activeDays,
    totalMinutes,
    averageDifficulty: averageDifficulty === null ? null : round1(averageDifficulty),
    averageEnergyBefore,
    averageEnergyAfter,
    measurements,
    bodyFatTrend,
    topExercises,
    favoriteExercises,
    hardExercises,
    rewardsUnlocked,
    summary: [],
    suggestions: [],
  }
  report.summary = writeSummary(report, recordedCount, withWorkout.map((day) => day.workout!.dayType))
  report.suggestions = writeSuggestions(report, recordedCount, feedbacks.filter((feedback) => feedback.pain).length, state, start, lastRecorded)
  return report
}

function signed(value: number, unit: string) {
  return `${value > 0 ? '+' : ''}${value} ${unit}`.trim()
}

function writeSummary(report: ReportData, recordedCount: number, dayTypes: DayType[]) {
  const lines: string[] = []
  lines.push(`اتحركتي ${report.activeDays} يوم من ${recordedCount} يوم مسجّل، وجمعتي ${report.totalMinutes} دقيقة تمرين.`)
  lines.push(`متوسط نقاطك اليومية ${report.averageScore} من 100 — النقاط بتكافئ الاستمرار مش الشدة.`)
  const lightDays = dayTypes.filter((type) => type === 'light').length
  if (lightDays) lines.push(`${lightDays} من الأيام كانت ${DAY_TYPE_LABEL.light}، ودي جزء مهم من الاستمرار.`)
  const weight = report.measurements.find((item) => item.key === 'weight')
  const waist = report.measurements.find((item) => item.key === 'waist')
  if (weight?.change !== null && weight?.change !== undefined && weight.change < 0) lines.push(`الوزن نزل ${Math.abs(weight.change)} كجم في الفترة دي.`)
  else if (weight?.change) lines.push(`الوزن اتغير ${signed(weight.change, 'كجم')}؛ الوزن بيتذبذب طبيعي، والقياسات بتوضح الصورة أكتر.`)
  if (waist?.change !== null && waist?.change !== undefined && waist.change < 0) lines.push(`مقاس الوسط قلّ ${Math.abs(waist.change)} سم.`)
  if (report.favoriteExercises[0]) lines.push(`التمرين المفضّل: ${report.favoriteExercises[0].name}.`)
  return lines
}

function writeSuggestions(report: ReportData, recordedCount: number, painCount: number, state: AppState, start: string, end: string) {
  const suggestions: string[] = []
  const ratio = recordedCount ? report.activeDays / recordedCount : 0
  if (ratio < 0.6) suggestions.push('حطي ميعاد ثابت للتمرين في يومك؛ حتى ١٥ دقيقة أو يوم حركة خفيفة بيفرقوا.')
  else suggestions.push('استمري على نفس الإيقاع؛ الانتظام ده هو اللي بيعمل الفرق.')
  if (report.averageDifficulty !== null && report.averageDifficulty <= 4) suggestions.push('التمارين بقت أسهل عليكي؛ جرّبي الحركة الأساسية بدل البديل، والبرنامج هيزود الشدة تدريجيًا.')
  if (report.averageDifficulty !== null && report.averageDifficulty >= 8) suggestions.push('خدي البدائل الأخف براحتك في الأيام التقيلة، والبرنامج هيقلل الفترات تلقائيًا.')
  if (report.hardExercises.length) suggestions.push(`كمّلي على البديل الأخف لـ ${report.hardExercises.map((item) => item.name).join(' و ')} لحد ما تحسيه أسهل.`)
  const entries = state.measurements.filter((entry) => entry.measuredOn >= start && entry.measuredOn <= end).length
  if (entries < 2) suggestions.push('سجلي القياسات كل أسبوعين تقريبًا في نفس الوقت من اليوم عشان المقارنة تبقى أدق.')
  if (painCount > 0) suggestions.push('لو الألم اتكرر في نفس المكان، خففي الحركة دي واستشيري مختص لو استمر.')
  suggestions.push('نوم كفاية ومية وأكل متوازن بيساعدوا جسمك يستفيد من كل تمرين.')
  return suggestions.slice(0, 5)
}
