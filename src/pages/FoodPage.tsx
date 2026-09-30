import { useMemo, useState } from 'react'
import { Droplets, Plus, Trash2, Utensils } from 'lucide-react'
import { addDays, cairoTime, formatDateLong, formatDateShort } from '../../shared/date'
import { FOOD_BACKFILL_DAYS, FOOD_CATEGORIES, formatLitres, isWater, waterMl, WATER_TARGET_ML, type FoodCategory, type FoodEntry } from '../../shared/food'
import { WATER_POINTS_DAILY_MAX, waterPointsBalance, waterPointsForMl } from '../../shared/waterPoints'
import { Card, ChoiceGroup, EmptyState, Notice, PageHeader, ProgressBar } from '../components/ui'
import { useAppData, useAppState } from '../state/AppData'

const CATEGORY_OPTIONS = FOOD_CATEGORIES.map((category) => ({ value: category.id, label: category.label, emoji: category.emoji }))
const EMOJI = Object.fromEntries(FOOD_CATEGORIES.map((category) => [category.id, category.emoji])) as Record<FoodCategory, string>

export function FoodPage() {
  const state = useAppState()
  const start = state.profile.programStartDate
  const [date, setDate] = useState(state.today)

  if (!start) {
    return (
      <div className="page">
        <PageHeader eyebrow="الأكل والشرب" title="سجل الأكل" />
        <EmptyState icon={<Utensils />} title="ابدئي البرنامج الأول">التسجيل بيبدأ من اليوم الأول.</EmptyState>
      </div>
    )
  }

  const dates = Array.from({ length: FOOD_BACKFILL_DAYS + 1 }, (_, index) => addDays(state.today, -index)).filter((day) => day >= start)
  const entries = state.foodEntries.filter((entry) => entry.date === date)

  return (
    <div className="page">
      <PageHeader eyebrow="الأكل والشرب" title="سجّلي أكلك وشربك">
        <p>سجّلي كل حاجة بتاكليها أو بتشربيها طول اليوم. السجل بيظهر في التقرير الأسبوعي والشهري.</p>
      </PageHeader>

      <div className="day-chips" role="group" aria-label="اختاري اليوم">
        {dates.map((day) => (
          <button type="button" key={day} className="choice" aria-pressed={day === date} onClick={() => setDate(day)}>
            {day === state.today ? 'النهارده' : day === addDays(state.today, -1) ? 'امبارح' : formatDateShort(day)}
          </button>
        ))}
      </div>

      <WaterCard date={date} entries={entries} />
      <FoodForm date={date} isToday={date === state.today} />
      <DayLog date={date} entries={entries} />
    </div>
  )
}

function WaterCard({ date, entries }: { date: string; entries: FoodEntry[] }) {
  const state = useAppState()
  const { addFood } = useAppData()
  const [busy, setBusy] = useState(false)
  const total = waterMl(entries)
  const { balance } = waterPointsBalance(state.foodEntries, state.waterSpends)
  const add = async (ml: number) => {
    setBusy(true)
    try {
      await addFood(date, { category: 'drink', item: 'مية', time: cairoTime(), ml })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <h2 className="card-title"><Droplets /> المية: {formatLitres(total)} لتر</h2>
      <ProgressBar value={total} max={WATER_TARGET_ML} label="المية من الهدف" />
      <p className="muted small">الهدف ٢–٢٫٥ لتر في اليوم، رشفات على مدار اليوم.</p>
      <p className="water-points-line">
        💧 {waterPointsForMl(total)} من {WATER_POINTS_DAILY_MAX} نقطة مية لليوم ده · رصيدك {balance} · <a href="#/rewards">تصرفيها إزاي؟</a>
      </p>
      <div className="quick-water">
        <button type="button" className="button secondary" disabled={busy} onClick={() => void add(250)}><Plus /> كوباية 250 مل</button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => void add(500)}><Plus /> زجاجة 500 مل</button>
      </div>
    </Card>
  )
}

function FoodForm({ date, isToday }: { date: string; isToday: boolean }) {
  const state = useAppState()
  const { addFood } = useAppData()
  const [category, setCategory] = useState<FoodCategory | null>(null)
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [ml, setMl] = useState('')
  const [time, setTime] = useState(() => cairoTime())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  const suggestions = useMemo(() => [...new Set(state.foodEntries.map((entry) => entry.item))].slice(-40), [state.foodEntries])

  async function submit() {
    if (!category || !item.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      await addFood(date, { category, item: item.trim(), time, quantity: quantity.trim() || undefined, ml: category === 'drink' && ml ? Number(ml) : null })
      setItem('')
      setQuantity('')
      setMl('')
      setTime(cairoTime())
      setMessage({ tone: 'success', text: 'اتسجل ✓' })
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h2 className="card-title"><Plus /> إضافة {isToday ? '' : `ليوم ${formatDateShort(date)}`}</h2>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <ChoiceGroup legend="النوع" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        <label className="field">
          <span>أكلتي / شربتي إيه؟</span>
          <input list="food-suggestions" value={item} maxLength={120} required onChange={(event) => setItem(event.target.value)} placeholder={category === 'drink' ? 'مثلًا: مية، شاي، قهوة' : 'مثلًا: بيض وعيش بلدي'} />
          <datalist id="food-suggestions">{suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
        </label>
        <div className="measure-grid">
          <label className="field">
            <span>الكمية <small>(اختياري)</small></span>
            <input value={quantity} maxLength={60} onChange={(event) => setQuantity(event.target.value)} placeholder="مثلًا: طبق، ٢ قطعة" />
          </label>
          {category === 'drink' && (
            <label className="field">
              <span>مل <small>(اختياري)</small></span>
              <input type="number" inputMode="numeric" min={1} max={5000} step={50} value={ml} onChange={(event) => setMl(event.target.value)} placeholder="250" />
            </label>
          )}
          <label className="field">
            <span>الساعة</span>
            <input type="time" value={time} required onChange={(event) => setTime(event.target.value)} />
          </label>
        </div>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <button type="submit" className="button primary" disabled={!category || !item.trim() || saving}>{saving ? 'جاري الحفظ…' : 'إضافة'}</button>
      </form>
    </Card>
  )
}

function DayLog({ date, entries }: { date: string; entries: FoodEntry[] }) {
  const { deleteFood } = useAppData()
  const [confirming, setConfirming] = useState<number | null>(null)
  const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id)
  return (
    <Card>
      <h2 className="card-title">سجل {formatDateLong(date)}</h2>
      {sorted.length ? (
        <ul className="food-list">
          {sorted.map((entry) => (
            <li key={entry.id} className={isWater(entry) ? 'is-water' : ''}>
              <span className="food-time">{entry.time}</span>
              <span className="food-emoji" aria-hidden="true">{EMOJI[entry.category]}</span>
              <div className="food-copy">
                <strong>{entry.item}</strong>
                <small>{FOOD_CATEGORIES.find((category) => category.id === entry.category)?.label}{entry.quantity ? ` · ${entry.quantity}` : ''}{entry.ml ? ` · ${entry.ml} مل` : ''}</small>
              </div>
              {confirming === entry.id ? (
                <span className="food-confirm">
                  <button type="button" className="link-button danger" onClick={async () => { await deleteFood(entry.id); setConfirming(null) }}>حذف</button>
                  <button type="button" className="link-button" onClick={() => setConfirming(null)}>إلغاء</button>
                </span>
              ) : (
                <button type="button" className="icon-button small" aria-label={`حذف ${entry.item}`} onClick={() => setConfirming(entry.id)}><Trash2 /></button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Utensils />} title="لسه مفيش تسجيلات لليوم ده">ابدئي بأول وجبة أو كوباية مية.</EmptyState>
      )}
    </Card>
  )
}
