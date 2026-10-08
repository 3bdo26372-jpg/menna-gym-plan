import { useState } from 'react'
import { Ticket } from 'lucide-react'
import { addDays, formatDateShort } from '../../shared/date'
import { isGiftOpened } from '../components/ChocolateGift'
import { missedWorkout, PASS_PRICE, passCandidates, passPrice, unusedGifts } from '../../shared/dayPasses'
import { pointsBalance } from '../../shared/points'
import { Card, EmptyState, Notice, StatTile } from '../components/ui'
import { useAppData, useAppState } from '../state/AppData'

/** Day passes: mark a day she didn't train as trained. The first is free, then calorie points. */
export function DayPasses() {
  const state = useAppState()
  const { takeDayPass } = useAppData()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  const { balance } = pointsBalance(state)
  const price = passPrice(state)
  const candidates = passCandidates(state)
  const label = (date: string) => (date === state.today ? 'النهارده' : date === addDays(state.today, -1) ? 'امبارح' : formatDateShort(date))

  async function take(date: string, dayNumber: number) {
    setBusy(true)
    setMessage(null)
    try {
      await takeDayPass(date)
      setMessage({ tone: 'success', text: `يوم ${dayNumber} بقى 100 واتحسب متمرّن ✓` })
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <Card className="day-passes" id="section-passes">
      <h2 className="card-title"><Ticket /> الإكسبشن</h2>
      <p className="muted small">يوم ناقص أو ماتمرنتيش فيه؟ الإكسبشن بيكمّله لـ 100 وبيحسبه يوم تمرين في المكافآت.</p>
      <div className="stat-grid">
        <StatTile label="الإكسبشن الجاي" value={price === 0 ? 'ببلاش' : price} unit={price === 0 ? '🎁' : 'نقطة'} tone="accent" />
        <StatTile label="رصيد نقطك" value={balance} unit="نقطة" hint="من المية والسعرات" />
      </div>
      <p className="muted small">أول إكسبشن ببلاش، وبعد كده بـ {PASS_PRICE} نقطة من <a href="#/rewards/points">نقطك</a>.</p>
      {unusedGifts(state).map((gift) => (
        <p key={gift.id} className="reward-hint"><span>🎁 إكسبشن هدية</span>{isGiftOpened(gift.id) ? gift.note ?? 'إكسبشن ببلاش' : 'مستنياكي شوكولاتة في الصفحة الرئيسية، افتحيها الأول 🍫'}</p>
      ))}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {candidates.length === 0 ? (
        <EmptyState icon={<Ticket />} title="كل الأيام كاملة 💪" />
      ) : (
        <ul className="makeup-list">
          {candidates.map((day) => (
            <li key={day.date}>
              <div className="food-copy">
                <strong>يوم {day.dayNumber} · {label(day.date)}</strong>
                <small>{day.score.total} من 100{missedWorkout(day) ? ' · ماتمرنتيش' : ''}</small>
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
