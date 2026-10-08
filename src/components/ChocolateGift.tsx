import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import type { PassGift } from '../../shared/dayPasses'
import { storage } from '../lib/storage'
import { Card } from './ui'

const openedKey = (id: number) => `menna-flow:gift-opened:${id}`

/** Whether she already unwrapped this gift on this device. */
export const isGiftOpened = (id: number) => storage.get(openedKey(id)) === '1'

const HEARTS = ['💗', '🤍', '💕', '💗', '🍫', '💕']

/**
 * A gifted day pass wrapped as a chocolate bar: the note stays hidden until
 * she taps it, then the wrapper tears open and the note shows.
 */
export function ChocolateGift({ gift }: { gift: PassGift }) {
  const [opened, setOpened] = useState(() => isGiftOpened(gift.id))
  const [justOpened, setJustOpened] = useState(false)

  function open() {
    storage.set(openedKey(gift.id), '1')
    setJustOpened(true)
    setOpened(true)
  }

  return (
    <Card className="gift-card chocolate-card">
      <div className="chocolate-stage">
        <button type="button" className="chocolate" disabled={opened} onClick={open} aria-label={opened ? 'الشوكولاتة اتفتحت' : 'افتحي الشوكولاتة'}>
          <span className="chocolate-bar" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </span>
          <AnimatePresence initial={false}>
            {!opened && (
              <m.span
                key="wrapper" className="chocolate-wrapper" aria-hidden="true"
                animate={{ rotate: [0, -2, 2, -1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.4 }}
                exit={{ opacity: 0, transition: { duration: 0.01, delay: 0.9 } }}
              >
                <m.span className="wrapper-half is-start" exit={{ x: '-115%', rotate: -14, opacity: 0, transition: { duration: 0.9, ease: 'easeIn' } }} />
                <m.span className="wrapper-half is-end" exit={{ x: '115%', rotate: 14, opacity: 0, transition: { duration: 0.9, ease: 'easeIn' } }} />
                <m.span className="wrapper-label" exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}>
                  <b>🍫 شوكولاتة ليكي</b>
                  <small>دوسي عليا</small>
                </m.span>
              </m.span>
            )}
          </AnimatePresence>
          {justOpened && (
            <span className="chocolate-hearts" aria-hidden="true">
              {HEARTS.map((heart, index) => (
                <m.span
                  key={index} style={{ insetInlineStart: `${12 + index * 15}%` }}
                  initial={{ y: 0, opacity: 0, scale: 0.6 }} animate={{ y: -90, opacity: [0, 1, 0], scale: 1.1 }}
                  transition={{ duration: 1.6, delay: 0.5 + index * 0.08, ease: 'easeOut' }}
                >{heart}</m.span>
              ))}
            </span>
          )}
        </button>
      </div>
      {opened ? (
        <m.div initial={justOpened ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: justOpened ? 0.6 : 0, duration: 0.4 }}>
          <h2 className="card-title">جالك إكسبشن هدية!</h2>
          {gift.note && <p className="gift-note">{gift.note}</p>}
          <p className="muted small">إكسبشن ببلاش، تكمّلي بيه أي يوم لـ 100 ويتحسب يوم تمرين.</p>
          <a className="button secondary" href="#/rewards/passes">شوفيه</a>
        </m.div>
      ) : (
        <div>
          <h2 className="card-title">فيه حاجة حلوة مستنياكي 🎁</h2>
          <p className="muted small">دوسي على الشوكولاتة وافتحيها.</p>
        </div>
      )}
    </Card>
  )
}
