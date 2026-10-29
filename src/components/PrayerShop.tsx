import { useState } from 'react'
import { Store, Trophy } from 'lucide-react'
import { formatDateShort } from '../../shared/date'
import { BIG_GIFT_WEEKS, prayerBalance, prayerStreak, type PrayerShopItem } from '../../shared/prayer'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice, ProgressBar } from './ui'

/** محل الصلاة: her prayer points and what they buy. */
export function PrayerShop({ state }: { state: AppState }) {
  const { balance } = prayerBalance(state)
  const items = state.prayerShop ?? []
  const bought = (state.prayerBuys ?? []).filter((buy) => buy.status !== 'cancelled').slice(-4).reverse()
  if (!items.length) return null
  return (
    <Card id="section-shop">
      <h2 className="card-title"><Store /> محل الصلاة</h2>
      <p className="prayer-week-score"><strong>{balance}</strong> نقطة صلاة معاكي</p>
      <ul className="shop-list">{items.map((item) => <ShopItem key={item.id} item={item} balance={balance} />)}</ul>
      {bought.length > 0 && (
        <ul className="sleep-history">
          {bought.map((buy) => (
            <li key={buy.id}>
              <strong>{buy.title}</strong>
              <span>{buy.status === 'done' ? 'وصلتك 🎉' : 'في الطريق 🎁'}</span>
              <small>{formatDateShort(buy.createdAt.slice(0, 10))} · {buy.points} نقطة{buy.note ? ` · ${buy.note}` : ''}</small>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">نقط الصلاة دي غير «نقطك»، وبتتصرف هنا بس. اللي بتشتريه بيوصلك من بابا 🤍</p>
    </Card>
  )
}

function ShopItem({ item, balance }: { item: PrayerShopItem; balance: number }) {
  const { buyPrayerItem } = useAppData()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const short = item.price - balance

  async function buy() {
    setBusy(true)
    setError(null)
    try {
      await buyPrayerItem(item.id, note.trim() || undefined)
      setOpen(false)
      setNote('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="pill-row shop-item">
      <span aria-hidden="true">{item.emoji}</span>
      <div>
        <strong>{item.title}</strong>
        <small>{item.price} نقطة{short > 0 ? ` · فاضلك ${short}` : ''}</small>
      </div>
      <button type="button" className={`button ${short > 0 ? 'secondary' : 'primary'} small-button`} disabled={short > 0 || busy} onClick={() => setOpen(true)}>
        {short > 0 ? 'لسه' : 'اشتري'}
      </button>
      {open && (
        <form className="shop-confirm" onSubmit={(event) => { event.preventDefault(); void buy() }}>
          <label className="field">
            <span>{item.noteRequired ? 'نفسك في إيه؟' : 'عايزة تقولي حاجة عنها؟ (مش لازم)'}</span>
            <input type="text" value={note} maxLength={300} required={item.noteRequired} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="sleep-actions">
            <button type="submit" className="button primary small-button" disabled={busy || (item.noteRequired && !note.trim())}>{busy ? 'لحظة…' : `تأكيد (${item.price} نقطة)`}</button>
            <button type="button" className="link-button" onClick={() => setOpen(false)}>إلغاء</button>
          </div>
        </form>
      )}
      {error && <Notice tone="care">{error}</Notice>}
    </li>
  )
}

/** How many kept weeks in a row so far, toward the big gift. */
export function PrayerStreakCard({ state }: { state: AppState }) {
  const { run, milestones } = prayerStreak(state)
  return (
    <Card>
      <h2 className="card-title"><Trophy /> الهدية الكبيرة 🏆</h2>
      <p className="prayer-week-score"><strong>{run}</strong> من {BIG_GIFT_WEEKS} أسابيع ورا بعض</p>
      <ProgressBar value={run} max={BIG_GIFT_WEEKS} label="أسابيع الصلاة ورا بعض" />
      <p className="muted small">
        كل {BIG_GIFT_WEEKS} أسابيع تكسبي فيهم هدية الأسبوع ورا بعض، ليكي هدية أكبر. لو أسبوع فات من غير هدية العدّ يبدأ من الأول، وأسبوع كله بريود مش بيتحسب عليكي.
        {milestones.length > 0 && ` كسبتيها ${milestones.length === 1 ? 'مرة' : milestones.length === 2 ? 'مرتين' : `${milestones.length} مرات`} لحد دلوقتي 🤍`}
      </p>
    </Card>
  )
}
