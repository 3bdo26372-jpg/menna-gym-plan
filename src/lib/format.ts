const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export const formatNumber = (value: number | null | undefined) => (value === null || value === undefined ? '—' : number.format(value))

export function formatChange(value: number | null | undefined, unit = '') {
  if (value === null || value === undefined) return '—'
  if (value === 0) return `0 ${unit}`.trim()
  return `${value > 0 ? '+' : '−'}${number.format(Math.abs(value))} ${unit}`.trim()
}

export function formatMinutes(seconds: number) {
  return Math.round(seconds / 60)
}

export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
