/**
 * Measurement fields and Menna's original baseline. Adding a field here is
 * enough for it to appear in the form, tables, charts and reports: values are
 * stored by key, so no database migration is needed.
 */
export interface MeasurementField {
  key: string
  label: string
  unit: string
  step: number
  min: number
  max: number
  /** Smart-scale values are estimates; the UI says so. */
  estimate?: boolean
  chart?: boolean
  /** An extra reading from the smart scale: the form keeps these folded away. */
  scale?: boolean
}

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'weight', label: 'الوزن', unit: 'كجم', step: 0.1, min: 30, max: 200, chart: true },
  { key: 'bodyFat', label: 'نسبة الدهون', unit: '%', step: 0.1, min: 5, max: 70, estimate: true, chart: true },
  { key: 'waist', label: 'الوسط', unit: 'سم', step: 0.5, min: 40, max: 200, chart: true },
  { key: 'belly', label: 'البطن', unit: 'سم', step: 0.5, min: 40, max: 200, chart: true },
  { key: 'glutes', label: 'الأرداف', unit: 'سم', step: 0.5, min: 50, max: 200 },
  { key: 'thigh', label: 'الفخذ', unit: 'سم', step: 0.5, min: 30, max: 120 },
  { key: 'biceps', label: 'الذراع', unit: 'سم', step: 0.5, min: 15, max: 70 },
  { key: 'shoulders', label: 'الأكتاف', unit: 'سم', step: 0.5, min: 25, max: 200 },
  // The rest of what the smart scale reads. The keys match the baseline, so each compares with the start.
  { key: 'bmi', label: 'مؤشر كتلة الجسم', unit: '', step: 0.1, min: 10, max: 60, scale: true },
  { key: 'fatMass', label: 'كتلة الدهون', unit: 'كجم', step: 0.1, min: 5, max: 100, estimate: true, scale: true },
  { key: 'leanMass', label: 'الكتلة الخالية من الدهون', unit: 'كجم', step: 0.01, min: 20, max: 120, estimate: true, scale: true },
  { key: 'muscleMass', label: 'كتلة العضلات', unit: 'كجم', step: 0.1, min: 15, max: 100, estimate: true, scale: true },
  { key: 'skeletalMuscle', label: 'العضلات الهيكلية', unit: 'كجم', step: 0.1, min: 10, max: 60, estimate: true, scale: true },
  { key: 'visceralFat', label: 'دهون الأحشاء', unit: '', step: 0.5, min: 1, max: 30, estimate: true, scale: true },
  { key: 'bmr', label: 'معدل الحرق الأساسي', unit: 'سعر/يوم', step: 1, min: 800, max: 3500, estimate: true, scale: true },
  { key: 'water', label: 'نسبة المية في الجسم', unit: '%', step: 0.1, min: 20, max: 80, estimate: true, scale: true },
  { key: 'protein', label: 'نسبة البروتين', unit: '%', step: 0.1, min: 5, max: 30, estimate: true, scale: true },
  { key: 'boneMass', label: 'كتلة العظام', unit: 'كجم', step: 0.1, min: 1, max: 8, estimate: true, scale: true },
  { key: 'bodyAge', label: 'عمر الجسم', unit: 'سنة', step: 1, min: 10, max: 90, estimate: true, scale: true },
]

export const MEASUREMENT_FIELD_BY_KEY = Object.fromEntries(MEASUREMENT_FIELDS.map((field) => [field.key, field]))

/** Everything recorded at the start. Stored once and never changed. */
export const BASELINE_METRICS: { key: string; label: string; value: number; unit: string; estimate?: boolean }[] = [
  { key: 'age', label: 'العمر', value: 21, unit: 'سنة' },
  { key: 'height', label: 'الطول', value: 171, unit: 'سم' },
  { key: 'weight', label: 'الوزن', value: 79.1, unit: 'كجم' },
  { key: 'bmi', label: 'مؤشر كتلة الجسم', value: 27.1, unit: '' },
  { key: 'bodyFat', label: 'نسبة الدهون', value: 37.8, unit: '%', estimate: true },
  { key: 'fatMass', label: 'كتلة الدهون', value: 29.9, unit: 'كجم', estimate: true },
  { key: 'leanMass', label: 'الكتلة الخالية من الدهون', value: 49.23, unit: 'كجم', estimate: true },
  { key: 'muscleMass', label: 'كتلة العضلات', value: 45, unit: 'كجم', estimate: true },
  { key: 'skeletalMuscle', label: 'العضلات الهيكلية', value: 27.1, unit: 'كجم', estimate: true },
  { key: 'visceralFat', label: 'دهون الأحشاء', value: 7.5, unit: '', estimate: true },
  { key: 'bmr', label: 'معدل الحرق الأساسي', value: 1530, unit: 'سعر/يوم', estimate: true },
  { key: 'glutes', label: 'الأرداف', value: 106, unit: 'سم' },
  { key: 'belly', label: 'البطن', value: 97, unit: 'سم' },
  { key: 'waist', label: 'الوسط', value: 85, unit: 'سم' },
  { key: 'shoulders', label: 'الأكتاف', value: 46, unit: 'سم' },
  { key: 'biceps', label: 'الذراع', value: 30, unit: 'سم' },
  { key: 'thigh', label: 'الفخذ', value: 95, unit: 'سم' },
]

export const BASELINE_LABEL_BY_KEY = Object.fromEntries(BASELINE_METRICS.map((metric) => [metric.key, metric]))

export function validateMeasurementValues(values: unknown): Record<string, number> | string {
  if (!values || typeof values !== 'object') return 'values must be an object'
  const clean: Record<string, number> = {}
  for (const [key, raw] of Object.entries(values as Record<string, unknown>)) {
    const field = MEASUREMENT_FIELD_BY_KEY[key]
    if (!field) return `unknown measurement: ${key}`
    if (raw === null || raw === undefined || raw === '') continue
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(value) || value < field.min || value > field.max) return `${key} is out of range`
    clean[key] = Math.round(value * 100) / 100
  }
  if (Object.keys(clean).length === 0) return 'enter at least one measurement'
  return clean
}
