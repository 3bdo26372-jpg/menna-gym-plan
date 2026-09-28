import { useState } from 'react'
import type { BodyFeeling, Energy, Mood } from '../../shared/types'
import { BODY_OPTIONS, ENERGY_OPTIONS, MOOD_OPTIONS } from '../lib/labels'
import { ChoiceGroup } from './ui'
import type { CheckInInput } from '../lib/backend'

export function CheckInForm({ initial, onSubmit }: { initial?: CheckInInput | null; onSubmit: (input: CheckInInput) => Promise<void> }) {
  const [energy, setEnergy] = useState<Energy | null>(initial?.energy ?? null)
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null)
  const [body, setBody] = useState<BodyFeeling | null>(initial?.body ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = energy && mood && body

  async function submit() {
    if (!energy || !mood || !body) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ energy, mood, body })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'حصلت مشكلة، جربي تاني')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <ChoiceGroup legend="طاقتك النهارده" options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} columns={3} />
      <ChoiceGroup legend="مزاجك" options={MOOD_OPTIONS} value={mood} onChange={setMood} columns={3} />
      <ChoiceGroup legend="إحساس جسمك" options={BODY_OPTIONS} value={body} onChange={setBody} columns={3} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button primary" disabled={!ready || saving}>
        {saving ? 'جاري الحفظ…' : 'حفظ وتجهيز تمرين النهارده'}
      </button>
    </form>
  )
}
