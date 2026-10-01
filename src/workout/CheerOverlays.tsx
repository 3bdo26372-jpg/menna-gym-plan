import { useEffect } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import type { Cheer, FinishStyle } from './cheers'

/** A short message over the exercise demo. It never takes focus or blocks a tap. */
export function CheerBubble({ cheer }: { cheer: { key: number; cheer: Cheer } | null }) {
  return (
    <div className="cheer-anchor" role="status" aria-live="polite">
      <AnimatePresence>
        {cheer && (
          <m.div
            key={cheer.key} className="cheer-bubble"
            initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ type: 'spring', damping: 15, stiffness: 260 }}
          >
            <span>{cheer.cheer.text}</span>
            {cheer.cheer.loading && (
              <span className="cheer-loading" aria-hidden="true">
                <span className="cheer-loading-bar"><m.i initial={{ scaleX: 0.08 }} animate={{ scaleX: 0.9 }} transition={{ duration: 2.6, ease: 'easeOut' }} /></span>
                <small>loading…</small>
              </span>
            )}
            {cheer.cheer.emoji && (
              <m.span className="cheer-emoji" animate={{ scale: [1, 1.25, 1, 1.25, 1] }} transition={{ duration: 1.2, delay: 0.25 }}>{cheer.cheer.emoji}</m.span>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const HEARTS = ['💗', '❤️', '💖', '💕', '💘']

function Hearts() {
  return Array.from({ length: 26 }, (_, index) => {
    const sway = (index % 2 ? 1 : -1) * (12 + ((index * 5) % 24))
    return (
      <m.span
        key={index} className="party-bit" style={{ left: `${(index * 37 + 7) % 100}%`, fontSize: 22 + ((index * 7) % 20) }}
        initial={{ y: 0, opacity: 0 }} animate={{ y: '-115vh', x: [0, sway, -sway / 2, sway], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3 + (index % 5) * 0.25, delay: (index % 9) * 0.12, ease: 'easeOut' }}
      >
        {HEARTS[index % HEARTS.length]}
      </m.span>
    )
  })
}

function Rockets() {
  return (
    <>
      {Array.from({ length: 9 }, (_, index) => (
        <m.span
          key={index} className="party-bit" style={{ left: `${4 + ((index * 23) % 80)}%`, fontSize: 34 + (index % 3) * 8 }}
          initial={{ y: 0, x: 0 }} animate={{ y: '-120vh', x: '30vw' }}
          transition={{ duration: 1.6 + (index % 4) * 0.2, delay: 0.1 + index * 0.18, ease: 'easeIn' }}
        >
          🚀
        </m.span>
      ))}
      {Array.from({ length: 16 }, (_, index) => (
        <m.span
          key={`spark-${index}`} className="party-bit pop" style={{ left: `${(index * 29 + 5) % 95}%`, top: `${(index * 17 + 4) % 45}%`, fontSize: 18 + (index % 4) * 6 }}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: 0.9 + (index % 8) * 0.18, repeat: 1, repeatDelay: 0.4 }}
        >
          ✨
        </m.span>
      ))}
    </>
  )
}

function Claps() {
  return Array.from({ length: 16 }, (_, index) => (
    <m.span
      key={index} className="party-bit pop" style={{ left: `${(index * 31 + 3) % 92}%`, top: `${(index * 23 + 6) % 88}%`, fontSize: 30 + (index % 4) * 8 }}
      initial={{ scale: 0, rotate: 0 }} animate={{ scale: [0, 1.3, 1, 1.25, 1, 0], rotate: [0, -14, 10, -10, 6, 0] }}
      transition={{ duration: 2.4, delay: (index % 8) * 0.12, ease: 'easeInOut' }}
    >
      {index % 5 === 4 ? '🎉' : '👏'}
    </m.span>
  ))
}

const FINISH_EMOJI: Record<FinishStyle, string> = { hearts: '💗', rockets: '🚀', claps: '👏' }
const FINISH_DURATION_MS = 4200

/** The end-of-workout celebration. It closes by itself, or with a tap anywhere. */
export function FinishCelebration({ open, variant, onClose }: { open: boolean; variant: FinishStyle; onClose: () => void }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(onClose, FINISH_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="finish-party" role="dialog" aria-modal="true" aria-labelledby="finish-party-title" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {!reduceMotion && (
            <div className="party-bits" aria-hidden="true">
              {variant === 'hearts' && <Hearts />}
              {variant === 'rockets' && <Rockets />}
              {variant === 'claps' && <Claps />}
            </div>
          )}
          <m.div className="finish-party-card" initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 12, stiffness: 200 }}>
            <span className="finish-party-emoji" aria-hidden="true">{FINISH_EMOJI[variant]}</span>
            <h2 id="finish-party-title">عاش يا أشطر وأقوى حد</h2>
            <p>خلّصتي التمرين كله يا كتكوتي 💗</p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
