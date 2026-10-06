import type { ReportData } from '../../shared/report'
import type { FoodInput } from '../../shared/food'
import type { WaterSpendInput } from '../../shared/waterPoints'
import type { AppState, CheckIn, Feedback, MeasurementInput, ReportKind, WorkoutResult } from '../../shared/types'

export type CheckInInput = Pick<CheckIn, 'energy' | 'mood' | 'body'>
export type FeedbackInput = Omit<Feedback, 'at'>
export type WorkoutInput = Omit<WorkoutResult, 'status' | 'mainCompletion' | 'warmupDone' | 'cooldownDone' | 'activeSeconds' | 'plannedSeconds'>

/** Everything the UI needs from persistence. Both implementations return the full, fresh state after writes. */
export interface Backend {
  mode: 'remote' | 'local'
  getState(): Promise<AppState>
  startProgram(): Promise<AppState>
  saveCheckin(date: string, input: CheckInInput): Promise<AppState>
  saveWorkout(date: string, input: WorkoutInput): Promise<AppState>
  saveFeedback(date: string, input: FeedbackInput): Promise<AppState>
  savePeriodPain(date: string, level: number | null): Promise<AppState>
  addMeasurement(input: MeasurementInput): Promise<AppState>
  markRewardCelebrated(id: string): Promise<AppState>
  addFood(date: string, input: FoodInput): Promise<AppState>
  deleteFood(id: number): Promise<AppState>
  spendWaterPoints(input: WaterSpendInput): Promise<AppState>
  takeDayPass(date: string): Promise<AppState>
  addPeriod(startDate: string, endDate?: string): Promise<AppState>
  endPeriod(id: number, endDate: string): Promise<AppState>
  deletePeriod(id: number): Promise<AppState>
  generateReport(kind: ReportKind, periodIndex: number): Promise<{ report: ReportData; state: AppState }>
  getReport(kind: ReportKind, periodIndex: number): Promise<ReportData>
}

export class AuthRequiredError extends Error {
  constructor() {
    super('passcode required')
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
