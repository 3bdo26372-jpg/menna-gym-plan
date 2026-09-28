import type { ReportData } from '../../shared/report'
import type { FoodInput } from '../../shared/food'
import type { AppState, CheckIn, Feedback, MeasurementInput, ReportKind, RewardPatch, WorkoutResult } from '../../shared/types'

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
  addMeasurement(input: MeasurementInput): Promise<AppState>
  updateReward(id: string, patch: RewardPatch): Promise<AppState>
  markRewardCelebrated(id: string): Promise<AppState>
  addFood(date: string, input: FoodInput): Promise<AppState>
  deleteFood(id: number): Promise<AppState>
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
