import { useState } from 'react'
import { Plus, Ruler } from 'lucide-react'
import { formatDateFull } from '../../shared/date'
import { measurementComparison } from '../../shared/engine'
import { BASELINE_METRICS, MEASUREMENT_FIELD_BY_KEY, MEASUREMENT_FIELDS } from '../../shared/measurements'
import { Card, EmptyState, Notice, PageHeader } from '../components/ui'
import { formatChange, formatNumber } from '../lib/format'
import { useAppData, useAppState } from '../state/AppData'

/** Lower is the goal for these; the others are shown neutrally. */
const LOWER_IS_PROGRESS = new Set(['weight', 'bodyFat', 'waist', 'belly'])

export function MeasurementsPage() {
  const state = useAppState()
  const history = [...state.measurements].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn) || b.id - a.id)
  return (
    <div className="page">
      <PageHeader eyebrow="القياسات" title="الأرقام بتحكي الحكاية">
        <p>كل قياس بيتسجل بتاريخه ومبيتمسحش. نقطة البداية ثابتة دايمًا للمقارنة.</p>
      </PageHeader>

      <MeasurementForm today={state.today} />

      <Card>
        <h2 className="card-title">البداية ← السابق ← الحالي</h2>
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr><th scope="col">القياس</th><th scope="col">البداية</th><th scope="col">السابق</th><th scope="col">الحالي</th><th scope="col">الفرق من البداية</th></tr>
            </thead>
            <tbody>
              {MEASUREMENT_FIELDS.map((field) => {
                const row = measurementComparison(state, field.key)
                const change = row.changeFromBaseline
                const good = change !== null && change !== 0 && LOWER_IS_PROGRESS.has(field.key) && change < 0
                return (
                  <tr key={field.key}>
                    <th scope="row">{field.label}<small>{field.unit}{field.estimate ? ' · تقدير' : ''}</small></th>
                    <td>{formatNumber(row.baseline)}</td>
                    <td>{row.entries >= 1 ? formatNumber(row.previous) : '—'}</td>
                    <td><strong>{formatNumber(row.current)}</strong></td>
                    <td className={good ? 'change-good' : ''}>{row.entries ? formatChange(change, field.unit) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">قيم الميزان الذكي (نسبة الدهون وتكوين الجسم) تقديرية؛ اتابعيها كاتجاه عام مش كرقم دقيق.</p>
      </Card>

      <Card>
        <h2 className="card-title">سجل القياسات</h2>
        {history.length ? (
          <ul className="history-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <div className="history-date">{formatDateFull(entry.measuredOn)}</div>
                <div className="history-values">
                  {Object.entries(entry.values).map(([key, value]) => (
                    <span key={key} className="chip soft">{MEASUREMENT_FIELD_BY_KEY[key]?.label ?? key}: {formatNumber(value)} {MEASUREMENT_FIELD_BY_KEY[key]?.unit}</span>
                  ))}
                </div>
                {entry.note && <p className="muted small">{entry.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Ruler />} title="لسه مفيش قياسات جديدة">سجّلي أول قياس فوق، ويستحسن كل أسبوع أو اتنين في نفس الوقت من اليوم.</EmptyState>
        )}
      </Card>

      <Card>
        <h2 className="card-title">نقطة البداية كاملة</h2>
        <dl className="baseline-grid">
          {BASELINE_METRICS.map((metric) => (
            <div key={metric.key}>
              <dt>{metric.label}{metric.estimate ? ' *' : ''}</dt>
              <dd>{formatNumber(state.baseline.find((item) => item.key === metric.key)?.value ?? metric.value)} <small>{metric.unit}</small></dd>
            </div>
          ))}
        </dl>
        <p className="muted small">* تقدير من الميزان الذكي.</p>
      </Card>
    </div>
  )
}

function MeasurementForm({ today }: { today: string }) {
  const { addMeasurement } = useAppData()
  const [date, setDate] = useState(today)
  const [values, setValues] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  const filled = Object.values(values).some((value) => value.trim() !== '')

  async function submit() {
    setSaving(true)
    setMessage(null)
    try {
      const numbers = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, Number(value.replace(',', '.'))]))
      await addMeasurement({ measuredOn: date, values: numbers, note: note.trim() || undefined })
      setValues({})
      setNote('')
      setMessage({ tone: 'success', text: 'اتسجل القياس ✓' })
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="card-title"><Plus /> قياس جديد</h2>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <label className="field narrow">
          <span>التاريخ</span>
          <input type="date" value={date} max={today} required onChange={(event) => setDate(event.target.value)} />
        </label>
        <div className="measure-grid">
          {MEASUREMENT_FIELDS.map((field) => (
            <label key={field.key} className="field">
              <span>{field.label} <small>({field.unit})</small></span>
              <input
                type="number" inputMode="decimal" step={field.step} min={field.min} max={field.max}
                value={values[field.key] ?? ''} placeholder="—"
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span>ملاحظة (اختياري)</span>
          <input type="text" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="مثلًا: الصبح قبل الفطار" />
        </label>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <button type="submit" className="button primary" disabled={!filled || saving}>{saving ? 'جاري الحفظ…' : 'حفظ القياس'}</button>
      </form>
    </Card>
  )
}
