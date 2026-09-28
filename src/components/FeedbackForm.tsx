import { useState } from 'react'
import { EXERCISE_BY_ID } from '../../shared/exercises'
import type { Energy, Overall, Sweating } from '../../shared/types'
import type { FeedbackInput } from '../lib/backend'
import { ENERGY_OPTIONS, OVERALL_OPTIONS, SWEAT_OPTIONS } from '../lib/labels'
import { SafetyNote } from './SafetyNote'
import { ChoiceGroup } from './ui'

const DIFFICULTY = Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))
const PAIN = [{ value: 'no', label: 'لا' }, { value: 'yes', label: 'أيوه' }] as const

export function FeedbackForm({ exerciseIds, onSubmit }: { exerciseIds: string[]; onSubmit: (input: FeedbackInput) => Promise<void> }) {
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [energyAfter, setEnergyAfter] = useState<Energy | null>(null)
  const [sweating, setSweating] = useState<Sweating | null>(null)
  const [overall, setOverall] = useState<Overall | null>(null)
  const [pain, setPain] = useState<'yes' | 'no' | null>(null)
  const [favorite, setFavorite] = useState('')
  const [hardest, setHardest] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = difficulty && energyAfter && sweating && overall && pain
  const unique = [...new Set(exerciseIds)].filter((id) => EXERCISE_BY_ID[id])

  async function submit() {
    if (!difficulty || !energyAfter || !sweating || !overall || !pain) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        difficulty, energyAfter, sweating, overall, pain: pain === 'yes',
        favoriteExerciseId: favorite || undefined, hardestExerciseId: hardest || undefined, note: note.trim() || undefined,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'حصلت مشكلة، جربي تاني')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <ChoiceGroup legend="التمرين كان صعب قد إيه؟ (1 سهل جدًا — 10 صعب جدًا)" options={DIFFICULTY} value={difficulty} onChange={setDifficulty} columns={5} />
      <ChoiceGroup legend="إحساسك بشكل عام" options={OVERALL_OPTIONS} value={overall} onChange={setOverall} columns={3} />
      <ChoiceGroup legend="طاقتك بعد التمرين" options={ENERGY_OPTIONS} value={energyAfter} onChange={setEnergyAfter} columns={3} />
      <ChoiceGroup legend="العرق" options={SWEAT_OPTIONS} value={sweating} onChange={setSweating} columns={3} />
      <ChoiceGroup legend="حسيتي بأي ألم؟" options={[...PAIN]} value={pain} onChange={setPain} columns={2} />
      {pain === 'yes' && <SafetyNote />}
      <div className="field-row">
        <label className="field">
          <span>أكتر تمرين حبيتيه</span>
          <select value={favorite} onChange={(event) => setFavorite(event.target.value)}>
            <option value="">—</option>
            {unique.map((id) => <option key={id} value={id}>{EXERCISE_BY_ID[id].name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>أصعب تمرين</span>
          <select value={hardest} onChange={(event) => setHardest(event.target.value)}>
            <option value="">—</option>
            {unique.map((id) => <option key={id} value={id}>{EXERCISE_BY_ID[id].name}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        <span>ملاحظة (اختياري)</span>
        <textarea rows={2} value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="أي حاجة حابة تفتكريها عن تمرين النهارده" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button primary" disabled={!ready || saving}>{saving ? 'جاري الحفظ…' : 'حفظ التقييم'}</button>
    </form>
  )
}
