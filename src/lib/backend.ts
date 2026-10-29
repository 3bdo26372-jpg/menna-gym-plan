import type { ReportData } from '../../shared/report'
import type { FoodInput } from '../../shared/food'
import type { WaterSpendInput } from '../../shared/waterPoints'
import type { SleepLog } from '../../shared/sleep'
import type { PillPlan } from '../../shared/pills'
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
  saveSleep(date: string, sleep: SleepLog | null): Promise<AppState>
  addMeasurement(input: MeasurementInput): Promise<AppState>
  markRewardCelebrated(id: string): Promise<AppState>
  addFood(date: string, input: FoodInput): Promise<AppState>
  deleteFood(id: number): Promise<AppState>
  spendWaterPoints(input: WaterSpendInput): Promise<AppState>
  takeDayPass(date: string): Promise<AppState>
  playGame(pick: number): Promise<AppState>
  addPeriod(startDate: string, endDate?: string): Promise<AppState>
  endPeriod(id: number, endDate: string): Promise<AppState>
  deletePeriod(id: number): Promise<AppState>
  savePillPlan(plan: Omit<PillPlan, 'updatedAt'>): Promise<AppState>
  savePillDose(date: string, slot: number, taken: boolean): Promise<AppState>
  /** `at` is when she prayed (ISO); the API uses now when it is left out. */
  savePrayer(date: string, prayer: number, prayed: boolean, at?: string): Promise<AppState>
  openPrayerGift(weekStart: string, note?: string): Promise<AppState>
  generateReport(kind: ReportKind, periodIndex: number): Promise<{ report: ReportData; state: AppState }>
  getReport(kind: ReportKind, periodIndex: number): Promise<ReportData>
  /** The API's VAPID public key, for pushManager.subscribe(). */
  pushKey(): Promise<string>
  savePushSubscription(subscription: PushSubscriptionJSON): Promise<void>
  /** Sends a test notification to this subscription; true when the push service took it. */
  testPush(subscription: PushSubscriptionJSON): Promise<boolean>
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
