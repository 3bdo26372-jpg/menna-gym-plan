import { Lock, Trophy } from 'lucide-react'
import { formatDateFull } from '../../shared/date'
import { nextReward } from '../../shared/engine'
import type { RewardState } from '../../shared/types'
import { Card, PageHeader, ProgressBar } from '../components/ui'
import { useAppState } from '../state/AppData'

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
