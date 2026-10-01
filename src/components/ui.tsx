import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

export function Card({ children, className = '', as: Tag = 'section', id }: { children: ReactNode; className?: string; as?: 'section' | 'article' | 'div'; id?: string }) {
  return <Tag id={id} className={`card ${className}`}>{children}</Tag>
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <div className="page-header-copy">{children}</div>}
    </header>
  )
}

export function StatTile({ label, value, unit, hint, tone = 'neutral' }: {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  tone?: 'neutral' | 'good' | 'accent'
}) {
  return (
    <div className={`stat-tile tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}{unit && <small>{unit}</small>}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span style={{ transform: `scaleX(${ratio})` }} />
    </div>
  )
}

export function ScoreRing({ score, size = 132, label = 'نقاط اليوم' }: { score: number; size?: number; label?: string }) {
  const stroke = 11
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className="score-ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score} من 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="score-ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} className="score-ring-value" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(100, score) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring-copy">
        <strong>{score}</strong>
        <span>من 100</span>
      </div>
    </div>
  )
}

export interface ChoiceOption<T extends string | number> {
  value: T
  label: string
  emoji?: string
}

export function ChoiceGroup<T extends string | number>({ legend, options, value, onChange, columns }: {
  legend: string
  options: ChoiceOption<T>[]
  value: T | null
  onChange: (value: T) => void
  columns?: number
}) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className="choice-options" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {options.map((option) => (
          <button
            type="button" key={String(option.value)} className="choice" aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function Notice({ tone = 'info', icon, title, children }: { tone?: 'info' | 'care' | 'success'; icon?: ReactNode; title?: string; children: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'care' ? 'note' : undefined}>
      {icon && <span className="notice-icon">{icon}</span>}
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  )
}

export function Spinner({ label = 'جاري التحميل' }: { label?: string }) {
  return <span className="spinner" role="status"><LoaderCircle aria-hidden="true" /> {label}</span>
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}
