import { useState } from 'react'
import { Droplets, Lock, Trophy } from 'lucide-react'
import { cairoDate, dayNumberFor, formatDateFull, formatDateShort } from '../../shared/date'
import { nextReward } from '../../shared/engine'
import type { RewardState } from '../../shared/types'
import {
  makeupCandidates,
  NOTE_MAX_LENGTH,
  SPEND_PRICE,
  WATER_GOAL_BONUS,
  WATER_POINTS_DAILY_MAX,
  waterMlByDate,
  waterPointsBalance,
  waterPointsForMl,
  type WaterSpend,
  type WaterSpendInput,
  type WaterSpendKind,
} from '../../shared/waterPoints'
import { Card, ChoiceGroup, EmptyState, Notice, PageHeader, ProgressBar, StatTile, type ChoiceOption } from '../components/ui'
import { useAppData, useAppState } from '../state/AppData'

export function RewardsPage() {
  const state = useAppState()
  const { active } = nextReward(state)
  return (
    <div className="page">
      <PageHeader eyebrow="المكافآت" title="استمرارك يستاهل احتفال">
        <p>أي يوم تخلّصي فيه نص التمرين على الأقل بيتحسب يوم تمرين، حتى أيام التمرين الخفيف. لحد دلوقتي: <strong>{active}</strong> يوم.</p>
      </PageHeader>
      <div className="reward-list">
        {[...state.rewards].sort((a, b) => a.sortOrder - b.sortOrder).map((reward) => <RewardCard key={reward.id} reward={reward} active={active} />)}
      </div>
      <p className="muted small">كل مكافأة مفاجأة، وبتعرفي هي إيه يوم ما تتفتح 🤫</p>
      {state.profile.programStartDate && <WaterPoints />}
    </div>
  )
}

function RewardCard({ reward, active }: { reward: RewardState; active: number }) {
  const unlocked = Boolean(reward.unlockedOn)
  return (
    <Card as="article" className={`reward-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="reward-head">
        <span className="reward-emoji" aria-hidden="true">{reward.emoji}</span>
        <div>
          <p className="eyebrow">{unlocked ? '🎉 Reward Unlocked' : '🎁 Locked Reward'} · اليوم {reward.thresholdDays}</p>
          <h2>{reward.title}</h2>
        </div>
        {unlocked ? <Trophy className="reward-state-icon" aria-label="مفتوحة" /> : <Lock className="reward-state-icon" aria-label="مقفولة" />}
      </div>
      <p>{reward.description}</p>
      {!unlocked && reward.hint && <p className="reward-hint"><span>💌 تلميحة</span>{reward.hint}</p>}
      {unlocked
        ? <p className="muted small">اتفتحت يوم {formatDateFull(reward.unlockedOn!)}</p>
        : (
          <>
            <ProgressBar value={active} max={reward.thresholdDays} label={`التقدم لـ ${reward.title}`} />
            <p className="muted small">{Math.min(active, reward.thresholdDays)} من {reward.thresholdDays} يوم تمرين · فاضل {Math.max(0, reward.thresholdDays - active)}</p>
          </>
        )}
    </Card>
  )
}

const SPEND_OPTIONS: ChoiceOption<WaterSpendKind>[] = [
  { value: 'request', label: `طلب · ${SPEND_PRICE.request}`, emoji: '🙋‍♀️' },
  { value: 'gift', label: `هدية · ${SPEND_PRICE.gift}`, emoji: '🎁' },
  { value: 'makeup', label: 'تعويض يوم', emoji: '🔁' },
]

function WaterPoints() {
  const state = useAppState()
  const [kind, setKind] = useState<WaterSpendKind | null>(null)
  const { earned, spent, balance } = waterPointsBalance(state.foodEntries, state.waterSpends)
  const today = waterPointsForMl(waterMlByDate(state.foodEntries).get(state.today) ?? 0)
  return (
    <>
      <Card className="water-points">
        <h2 className="card-title"><Droplets /> نقط المية</h2>
        <div className="stat-grid">
          <StatTile label="رصيدك" value={balance} unit="نقطة" tone="accent" hint={`كسبتي ${earned} · صرفتي ${spent}`} />
          <StatTile label="النهارده" value={today} unit={`من ${WATER_POINTS_DAILY_MAX}`} />
        </div>
        <p className="muted small">كل كوباية 250 مل = نقطة لحد 2.5 لتر في اليوم، و+{WATER_GOAL_BONUS} بونص لما توصلي 2 لتر 💧</p>
        <ChoiceGroup legend="تصرفيها في إيه؟" options={SPEND_OPTIONS} value={kind} onChange={setKind} />
        {kind === 'request' && (
          <NoteSpend key="request" kind="request" balance={balance} required label="عايزة إيه؟" placeholder="مثلًا: خروجة، أكلة معيّنة، فيلم من اختيارك…"
            help="الطلب بيوصل ويستنى لحد ما يتنفّذ." />
        )}
        {kind === 'gift' && (
          <NoteSpend key="gift" kind="gift" balance={balance} label="تلميحة (اختياري)" placeholder="مثلًا: حاجة للبيت، حاجة حلوة، لون بحبه…"
            help="الهدية مفاجأة: إنتي بتدفعي النقط، وهي بتتختار ليكي 🤫" />
        )}
        {kind === 'makeup' && <MakeupDays balance={balance} />}
      </Card>
      {state.waterSpends.length > 0 && <SpendHistory spends={state.waterSpends} />}
    </>
  )
}

/** Runs a spend and reports how it went. */
function useSpend() {
  const { spendWaterPoints } = useAppData()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'care'; text: string } | null>(null)
  async function run(input: WaterSpendInput, success: string) {
    setBusy(true)
    setMessage(null)
    try {
      await spendWaterPoints(input)
      setMessage({ tone: 'success', text: success })
      return true
    } catch (caught) {
      setMessage({ tone: 'care', text: caught instanceof Error ? caught.message : 'تعذّر الحفظ' })
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, message, run }
}

function NoteSpend({ kind, balance, required = false, label, placeholder, help }: {
  kind: 'request' | 'gift'
  balance: number
  required?: boolean
  label: string
  placeholder: string
  help: string
}) {
  const price = SPEND_PRICE[kind]
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const { busy, message, run } = useSpend()
  const ready = !required || Boolean(note.trim())

  async function confirm() {
    const ok = await run({ kind, note: note.trim() || undefined }, kind === 'request' ? 'طلبك اتبعت ✓' : 'الهدية اتطلبت 🎁')
    setConfirming(false)
    if (ok) setNote('')
  }

  return (
    <div className="form-stack">
      <label className="field">
        <span>{label}</span>
        <textarea rows={2} maxLength={NOTE_MAX_LENGTH} value={note} required={required} placeholder={placeholder} onChange={(event) => setNote(event.target.value)} />
      </label>
      <p className="muted small">{help}</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {balance < price
        ? <p className="muted small">محتاجة {price - balance} نقطة كمان عشان توصلي لـ {price} 💧</p>
        : confirming
          ? (
            <div className="spend-confirm">
              <span>هيتخصم {price} نقطة من رصيدك.</span>
              <button type="button" className="button primary" disabled={busy} onClick={() => void confirm()}>{busy ? 'لحظة…' : 'تأكيد'}</button>
              <button type="button" className="link-button" disabled={busy} onClick={() => setConfirming(false)}>إلغاء</button>
            </div>
          )
          : <button type="button" className="button primary" disabled={!ready} onClick={() => setConfirming(true)}>{kind === 'request' ? 'اطلبي' : 'اطلبي الهدية'} بـ {price} 💧</button>}
    </div>
  )
}

function MakeupDays({ balance }: { balance: number }) {
  const state = useAppState()
  const [confirming, setConfirming] = useState<string | null>(null)
  const { busy, message, run } = useSpend()
  const candidates = makeupCandidates(state)

  if (!candidates.length) {
    return <EmptyState icon={<Droplets />} title="مفيش أيام ناقصة تتعوّض 👏">النهارده وامبارح لسه مفتوحين للتسجيل، فمبيتعوّضوش غير بعد ما يخلصوا.</EmptyState>
  }
  return (
    <div className="form-stack">
      <p className="muted small">كل نقطة مية بتكمّل نقطة من سكور اليوم لحد 100. التعويض بيكمّل السكور بس، ومش بيحسب اليوم يوم تمرين في المكافآت.</p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <ul className="makeup-list">
        {candidates.map(({ day, gap }) => {
          const points = Math.min(gap, balance)
          return (
            <li key={day.date}>
              <div className="food-copy">
                <strong>يوم {day.dayNumber} · {formatDateShort(day.date)}</strong>
                <small>{day.score.total} من 100 · ناقص {gap}</small>
              </div>
              {confirming === day.date ? (
                <span className="spend-confirm">
                  <button type="button" className="button primary" disabled={busy} onClick={async () => {
                    await run({ kind: 'makeup', date: day.date, points }, `يوم ${day.dayNumber} بقى ${day.score.total + points} من 100 ✓`)
                    setConfirming(null)
                  }}>{busy ? 'لحظة…' : `تأكيد (${points} 💧)`}</button>
                  <button type="button" className="link-button" disabled={busy} onClick={() => setConfirming(null)}>إلغاء</button>
                </span>
              ) : (
                <button type="button" className="button secondary" disabled={points < 1} onClick={() => setConfirming(day.date)}>
                  {points < 1 ? 'مفيش رصيد' : `عوّضي ${points} 💧`}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const SPEND_EMOJI: Record<WaterSpendKind, string> = { request: '🙋‍♀️', gift: '🎁', makeup: '🔁' }

function spendStatus(spend: WaterSpend) {
  if (spend.status === 'cancelled') return 'اتلغى · النقط رجعت'
  if (spend.kind === 'makeup') return 'اتعوّض ✓'
  if (spend.status === 'done') return spend.kind === 'gift' ? 'وصلت 🎉' : 'اتنفّذ ✓'
  return 'مستني ⏳'
}

function SpendHistory({ spends }: { spends: WaterSpend[] }) {
  const state = useAppState()
  const start = state.profile.programStartDate
  return (
    <Card>
      <h2 className="card-title">اللي صرفتيه</h2>
      <ul className="food-list">
        {[...spends].reverse().map((spend) => (
          <li key={spend.id} className={`spend-${spend.status}`}>
            <span className="food-emoji" aria-hidden="true">{SPEND_EMOJI[spend.kind]}</span>
            <div className="food-copy">
              <strong>
                {spend.kind === 'request' ? 'طلب' : spend.kind === 'gift' ? 'هدية مفاجأة' : `تعويض يوم ${start && spend.date ? dayNumberFor(start, spend.date) : ''}`}
                {spend.note ? `: ${spend.note}` : ''}
              </strong>
              <small>{formatDateShort(cairoDate(new Date(spend.createdAt)))} · {spendStatus(spend)}</small>
            </div>
            <span className="spend-points">−{spend.points} 💧</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
