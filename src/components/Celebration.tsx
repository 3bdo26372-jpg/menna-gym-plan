import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RewardState } from '../../shared/types'
import { formatDateFull } from '../../shared/date'

const COLORS = ['#9f2d64', '#e59dbd', '#f4c77b', '#7fb8a4', '#c65a8d']

/** Lightweight confetti + card for a newly unlocked reward. */
export function Celebration({ reward, onClose }: { reward: RewardState | null; onClose: () => void }) {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, index) => ({
    id: index,
    left: (index * 37) % 100,
    delay: (index % 9) * 0.08,
    rotate: (index * 53) % 360,
    color: COLORS[index % COLORS.length],
  })), [])
  return (
    <AnimatePresence>
      {reward && (
        <motion.div className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="confetti" aria-hidden="true">
            {pieces.map((piece) => (
              <motion.i
                key={piece.id} style={{ left: `${piece.left}%`, background: piece.color }}
                initial={{ y: -40, rotate: piece.rotate, opacity: 1 }} animate={{ y: '105vh', rotate: piece.rotate + 240, opacity: [1, 1, 0.6] }}
                transition={{ duration: 2.6, delay: piece.delay, ease: 'easeIn' }}
              />
            ))}
          </div>
          <motion.div className="celebration-card" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 14 }}>
            <span className="celebration-emoji">{reward.emoji}</span>
            <p className="eyebrow">🎉 Reward Unlocked</p>
            <h2 id="celebration-title">{reward.title}</h2>
            <p>{reward.description}</p>
            {reward.unlockedOn && <p className="muted small">اتفتحت يوم {formatDateFull(reward.unlockedOn)} بعد {reward.thresholdDays} أيام حركة.</p>}
            <button type="button" className="button primary" onClick={onClose}>تستاهليها 💗</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
