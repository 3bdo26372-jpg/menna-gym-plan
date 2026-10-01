import { useState } from 'react'
import { Ticket } from 'lucide-react'
import { addDays, formatDateShort } from '../../shared/date'
import { calorieRange, formatCalories } from '../../shared/calories'
import { CALORIE_POINTS_FLOOR_KCAL, CALORIE_POINTS_PER_DAY, PASS_PRICE, passBalance, passCandidates } from '../../shared/dayPasses'
import { Card, EmptyState, Notice, StatTile } from '../components/ui'
import { useAppData, useAppState } from '../state/AppData'

/** Day passes: mark a day she didn't train as trained. The first is free, then calorie points. */
export function DayPasses() {
  const state = useAppState()
  const { takeDayPass } = useAppData()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  const { earned, balance, price } = passBalance(state)
  const candidates = passCandidates(state)
  const today = state.days.find((day) => day.date === state.today)
  const range = calorieRange(today?.dayNumber ?? 1)
  const label = (date: string) => (date === state.today ? 'النهارده' : date === addDays(state.today, -1) ? 'امبارح' : formatDateShort(date))

  async function take(date: string, dayNumber: number) {
    setBusy(true)
    setMessage(null)
    try {
      await takeDayPass(date)
      setMessage({ tone: 'success', text: `يوم ${dayNumber} اتحسب متمرّن وخد 100 ✓` })
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <Card className="day-passes">
      <h2 className="card-title"><Ticket /> الإكسبشن</h2>
      <p className="muted small">يوم ماتمرنتيش فيه؟ الإكسبشن بيحسبه يوم تمرين وبياخد 100، ويتحسب في المكافآت كمان.</p>
      <div className="stat-grid">
        <StatTile label="الإكسبشن الجاي" value={price === 0 ? 'ببلاش' : price} unit={price === 0 ? '🎁' : 'نقطة'} tone="accent" />
        <StatTile label="نقط السعرات" value={balance} unit="نقطة" hint={`كسبتي ${earned}`} />
      </div>
      <p className="muted small">
        كل يوم أكلك فيه لحد {formatCalories(range.max)} سعرة (ومش أقل من {formatCalories(CALORIE_POINTS_FLOOR_KCAL)}) بياخد {CALORIE_POINTS_PER_DAY} نقط. الإكسبشن بعد الأول بـ {PASS_PRICE} نقطة.
      </p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {candidates.length === 0 ? (
        <EmptyState icon={<Ticket />} title="كل الأيام متمرّنة 💪" />
      ) : (
        <ul className="makeup-list">
          {candidates.map((day) => (
            <li key={day.date}>
              <div className="food-copy">
                <strong>يوم {day.dayNumber} · {label(day.date)}</strong>
                <small>{day.score.total} من 100</small>
              </div>
              {confirming === day.date ? (
                <span className="spend-confirm">
                  <button type="button" className="button primary" disabled={busy} onClick={() => void take(day.date, day.dayNumber)}>
                    {busy ? 'لحظة…' : price === 0 ? 'تأكيد (ببلاش)' : `تأكيد (${price} نقطة)`}
                  </button>
                  <button type="button" className="link-button" disabled={busy} onClick={() => setConfirming(null)}>إلغاء</button>
                </span>
              ) : (
                <button type="button" className="button secondary" disabled={price > balance} onClick={() => setConfirming(day.date)}>
                  {price > balance ? `محتاجة ${price - balance} نقطة` : price === 0 ? 'استخدمي الإكسبشن 🎁' : 'استخدمي الإكسبشن'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
