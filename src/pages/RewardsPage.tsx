import { useState } from 'react'
import { Lock, Pencil, Trophy } from 'lucide-react'
import { formatDateFull } from '../../shared/date'
import { nextReward } from '../../shared/engine'
import type { RewardState } from '../../shared/types'
import { Card, PageHeader, ProgressBar } from '../components/ui'
import { useAppData, useAppState } from '../state/AppData'

export function RewardsPage() {
  const state = useAppState()
  const { active } = nextReward(state)
  return (
    <div className="page">
      <PageHeader eyebrow="المكافآت" title="استمرارك يستاهل احتفال">
        <p>أي يوم تخلّصي فيه نص التمرين على الأقل بيتحسب يوم حركة، حتى أيام الحركة الخفيفة. لحد دلوقتي: <strong>{active}</strong> يوم.</p>
      </PageHeader>
      <div className="reward-list">
        {[...state.rewards].sort((a, b) => a.sortOrder - b.sortOrder).map((reward) => <RewardCard key={reward.id} reward={reward} active={active} />)}
      </div>
      <p className="muted small">محتوى المكافآت قابل للتعديل في أي وقت من زرار التعديل.</p>
    </div>
  )
}

function RewardCard({ reward, active }: { reward: RewardState; active: number }) {
  const { updateReward } = useAppData()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(reward.title)
  const [description, setDescription] = useState(reward.description)
  const [emoji, setEmoji] = useState(reward.emoji)
  const [saving, setSaving] = useState(false)
  const unlocked = Boolean(reward.unlockedOn)

  async function save() {
    setSaving(true)
    try {
      await updateReward(reward.id, { title, description, emoji })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card as="article" className={`reward-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="reward-head">
        <span className="reward-emoji" aria-hidden="true">{unlocked ? reward.emoji : '🎁'}</span>
        <div>
          <p className="eyebrow">{unlocked ? '🎉 Reward Unlocked' : '🎁 Locked Reward'} · اليوم {reward.thresholdDays}</p>
          <h2>{reward.title}</h2>
        </div>
        {unlocked ? <Trophy className="reward-state-icon" aria-label="مفتوحة" /> : <Lock className="reward-state-icon" aria-label="مقفولة" />}
      </div>
      {editing ? (
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <div className="field-row">
            <label className="field narrow"><span>إيموجي</span><input value={emoji} maxLength={8} onChange={(event) => setEmoji(event.target.value)} /></label>
            <label className="field"><span>العنوان</span><input value={title} maxLength={80} required onChange={(event) => setTitle(event.target.value)} /></label>
          </div>
          <label className="field"><span>الوصف</span><textarea rows={2} value={description} maxLength={400} onChange={(event) => setDescription(event.target.value)} /></label>
          <div className="sheet-actions">
            <button type="button" className="button secondary" onClick={() => setEditing(false)}>إلغاء</button>
            <button type="submit" className="button primary" disabled={saving}>{saving ? 'جاري الحفظ…' : 'حفظ'}</button>
          </div>
        </form>
      ) : (
        <>
          <p>{reward.description}</p>
          {unlocked
            ? <p className="muted small">اتفتحت يوم {formatDateFull(reward.unlockedOn!)}</p>
            : (
              <>
                <ProgressBar value={active} max={reward.thresholdDays} label={`التقدم لـ ${reward.title}`} />
                <p className="muted small">{Math.min(active, reward.thresholdDays)} من {reward.thresholdDays} يوم حركة · فاضل {Math.max(0, reward.thresholdDays - active)}</p>
              </>
            )}
          <button type="button" className="link-button" onClick={() => setEditing(true)}><Pencil /> تعديل المكافأة</button>
        </>
      )}
    </Card>
  )
}
