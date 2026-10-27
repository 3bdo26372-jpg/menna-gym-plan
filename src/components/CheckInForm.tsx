import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import type { BodyFeeling, Energy, Mood } from '../../shared/types'
import { BODY_OPTIONS, ENERGY_OPTIONS, labelOf, MOOD_OPTIONS } from '../lib/labels'
import { ChoiceGroup } from './ui'
import type { CheckInInput } from '../lib/backend'

const QUESTIONS = ['طاقتك النهارده عاملة إيه؟', 'ومزاجك؟', 'وجسمك حاسّة بيه إزاي؟']

/**
 * Three quick questions, one at a time: each answer moves on to the next by
 * itself, and an answer above can be tapped to change it.
 */
export function CheckInForm({ initial, onSubmit }: { initial?: CheckInInput | null; onSubmit: (input: CheckInInput) => Promise<void> }) {
  const [energy, setEnergy] = useState<Energy | null>(initial?.energy ?? null)
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null)
  const [body, setBody] = useState<BodyFeeling | null>(initial?.body ?? null)
  const [question, setQuestion] = useState(initial ? QUESTIONS.length : 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = energy && mood && body
  const answers = [labelOf(ENERGY_OPTIONS, energy), labelOf(MOOD_OPTIONS, mood), labelOf(BODY_OPTIONS, body)]
  const answered = [energy, mood, body].map(Boolean)
  // After an answer, the next question she hasn't answered yet (or none, when all are).
  const next = (from: number, done: boolean[]) => {
    const later = done.findIndex((value, index) => index > from && !value)
    const any = done.findIndex((value) => !value)
    return later >= 0 ? later : any >= 0 ? any : QUESTIONS.length
  }
  const pick = <T,>(set: (value: T) => void, index: number) => (value: T) => {
    set(value)
    setQuestion(next(index, answered.map((done, other) => done || other === index)))
  }

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
    <form className="form-stack checkin-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <div className="checkin-answers">
        {answered.map((done, index) => done && index !== question && (
          <button type="button" key={QUESTIONS[index]} className="chip soft" onClick={() => setQuestion(index)} aria-label={`غيّري: ${QUESTIONS[index]}`}>
            {answers[index]} ✎
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <m.div key={question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
          {question === 0 && <ChoiceGroup legend={QUESTIONS[0]} options={ENERGY_OPTIONS} value={energy} onChange={pick(setEnergy, 0)} columns={3} />}
          {question === 1 && <ChoiceGroup legend={QUESTIONS[1]} options={MOOD_OPTIONS} value={mood} onChange={pick(setMood, 1)} columns={3} />}
          {question === 2 && <ChoiceGroup legend={QUESTIONS[2]} options={BODY_OPTIONS} value={body} onChange={pick(setBody, 2)} columns={3} />}
          {question === QUESTIONS.length && ready && <p className="checkin-done">تمام كده 🌸 هجهّزلك تمرين على قد إحساسك النهارده.</p>}
        </m.div>
      </AnimatePresence>
      {question < QUESTIONS.length && <p className="checkin-count muted small">سؤال {question + 1} من {QUESTIONS.length}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {ready && question === QUESTIONS.length && (
        <button type="submit" className="button primary large" disabled={saving}>
          {saving ? 'لحظة…' : 'يلا نجهّز تمرينك 🌸'}
        </button>
      )}
    </form>
  )
}
