import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatDateShort } from '../../shared/date'

const INK_MUTED = '#8a7280'
const GRID = '#efe4e9'
const SERIES = '#9f2d64'
const SURFACE = '#ffffff'

const axisProps = {
  tick: { fill: INK_MUTED, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: GRID },
} as const

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload: { date: string; value: number } }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span>{formatDateShort(point.date)}</span>
      <strong>{point.value} {unit}</strong>
    </div>
  )
}

/** One measurement over time, with the original baseline as a dashed reference. */
export function TrendChart({ data, unit, baseline, label }: { data: { date: string; value: number }[]; unit: string; baseline: number | null; label: string }) {
  const values = [...data.map((point) => point.value), ...(baseline === null ? [] : [baseline])]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(0.5, (max - min) * 0.25)
  return (
    <div className="chart" role="img" aria-label={`${label}: ${data.map((point) => `${formatDateShort(point.date)} ${point.value}`).join('، ')}`}>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={formatDateShort} {...axisProps} minTickGap={24} reversed />
          <YAxis domain={[Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]} {...axisProps} width={42} orientation="right" />
          {baseline !== null && <ReferenceLine y={baseline} stroke={INK_MUTED} strokeDasharray="4 4" label={{ value: 'البداية', fill: INK_MUTED, fontSize: 11, position: 'insideTopLeft' }} />}
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
          <Line type="monotone" dataKey="value" stroke={SERIES} strokeWidth={2} dot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }} activeDot={{ r: 6, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Daily bars (score or minutes). */
export function DailyBars({ data, unit, max, label }: { data: { date: string; value: number }[]; unit: string; max?: number; label: string }) {
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={formatDateShort} {...axisProps} minTickGap={24} reversed />
          <YAxis domain={[0, max ?? 'auto']} {...axisProps} width={34} orientation="right" allowDecimals={false} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(159,45,100,.06)' }} />
          <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
