import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'
import { PERIOD_PASS_DAYS } from '../../shared/dayPasses'
import { NICKNAMES } from '../../shared/nicknames'
import type { AppState } from '../../shared/types'
import { giftTreatId, isTreatOpened, openTreat, treatsFor, useTreatOpened, type Treat } from '../lib/treats'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

/** Whether she already unwrapped this gift on this device. */
export const isGiftOpened = (id: number) => isTreatOpened(giftTreatId({ id, note: null, createdAt: '' }))

const HEARTS = ['💗', '🤍', '💕', '🍫', '💗', '💕', '🤍']

/**
 * A chocolate bar in a foil-ended wrapper. Tapping it tears the wrapper in
 * two and shows the chocolate; a few hearts float up.
 */
function Chocolate({ treat, opened, onOpen, big = false }: { treat: Treat; opened: boolean; onOpen: () => void; big?: boolean }) {
  const [justOpened, setJustOpened] = useState(false)
  const period = treat.kind === 'period'
  function open() {
    setJustOpened(true)
    onOpen()
  }
  return (
    <button
      type="button" className={`chocolate ${big ? 'is-big' : ''} ${period ? 'is-period' : ''}`} disabled={opened} onClick={open}
      aria-label={opened ? 'اتفتحت' : period ? 'افتحي المفاجأة' : 'افتحي الشوكولاتة'}
    >
      <span className="chocolate-foil" aria-hidden="true" />
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
            <m.span className="wrapper-shine" exit={{ opacity: 0, transition: { duration: 0.1 } }} />
            <m.span className="wrapper-label" exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}>
              <b className={period ? 'is-emoji' : undefined}>{period ? '🌸' : '🍫 شوكولاتة ليكي'}</b>
              <small>دوسي عليا</small>
            </m.span>
          </m.span>
        )}
      </AnimatePresence>
      {justOpened && (
        <span className="chocolate-hearts" aria-hidden="true">
          {HEARTS.map((heart, index) => (
            <m.span
              key={index} style={{ insetInlineStart: `${8 + index * 13}%` }}
              initial={{ y: 0, opacity: 0, scale: 0.6 }} animate={{ y: big ? -130 : -90, opacity: [0, 1, 0], scale: 1.15 }}
              transition={{ duration: 1.7, delay: 0.5 + index * 0.08, ease: 'easeOut' }}
            >{heart}</m.span>
          ))}
        </span>
      )}
    </button>
  )
}

const nickFor = (date: string) => NICKNAMES[[...date].reduce((sum, char) => sum + char.charCodeAt(0), 0) % NICKNAMES.length]

/** What's inside, once unwrapped: the note and what she can do with it. */
function TreatInside({ treat, onDone, inPopup = false }: { treat: Treat; onDone?: () => void; inPopup?: boolean }) {
  const { takeDayPass } = useAppData()
  const [busy, setBusy] = useState(false)
  const [used, setUsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function applyToday(date: string) {
    setBusy(true)
    setError(null)
    try {
      await takeDayPass(date)
      setUsed(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  if (treat.kind === 'gift') {
    return (
      <>
        <h2 className="card-title">جالك إكسبشن هدية!</h2>
        {treat.gift.note && <p className="gift-note">{treat.gift.note}</p>}
        <p className="muted small">إكسبشن ببلاش، تكمّلي بيه أي يوم لـ 100 ويتحسب يوم تمرين.</p>
        <div className="treat-actions">
          <a className="button primary" href="#/rewards/passes" onClick={onDone}>شوفيه</a>
          {inPopup && <button type="button" className="link-button" onClick={onDone}>خليه بعدين</button>}
        </div>
      </>
    )
  }

  if (used) {
    return (
      <>
        <h2 className="card-title">النهارده اتحسب يوم كامل 🤍</h2>
        <p className="muted small">ريّحي نفسك يا {nickFor(treat.date)}، ونقطك كلها محفوظة.</p>
        {inPopup && <button type="button" className="button primary" onClick={onDone}>تمام 💗</button>}
      </>
    )
  }
  return (
    <>
      <h2 className="card-title">اليوم {treat.periodDay} من البريود 🌸</h2>
      <p className="gift-note">أول {PERIOD_PASS_DAYS} أيام البريود عليا يا {nickFor(treat.date)} 🤍</p>
      <p className="muted small">لو مش قادرة تتمرني النهارده، استخدمي الإكسبشن ده ويتحسب يوم كامل. ولو مش محتاجاه سيبيه، وتقدري تستخدميه بعدين من صفحة الإكسبشن.</p>
      <div className="treat-actions">
        <button type="button" className="button primary" disabled={busy} onClick={() => void applyToday(treat.date)}>{busy ? 'لحظة…' : 'استخدميه للنهارده'}</button>
        {inPopup && <button type="button" className="link-button" disabled={busy} onClick={onDone}>مش دلوقتي</button>}
      </div>
      {error && <Notice tone="care">{error}</Notice>}
    </>
  )
}

/** A treat on the home page: wrapped until she taps it. */
export function TreatCard({ treat }: { treat: Treat }) {
  const opened = useTreatOpened(treat.id)
  return (
    <Card className={`gift-card chocolate-card ${treat.kind === 'period' ? 'is-period' : ''}`}>
      <div className="chocolate-stage">
        <Chocolate treat={treat} opened={opened} onOpen={() => openTreat(treat.id)} />
      </div>
      {opened ? (
        <m.div className="treat-inside" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
          <TreatInside treat={treat} />
        </m.div>
      ) : (
        <div className="treat-inside">
          <h2 className="card-title">{treat.kind === 'period' ? 'مفاجأة أيام البريود 🌸' : 'فيه حاجة حلوة مستنياكي 🎁'}</h2>
          <p className="muted small">{treat.kind === 'period' ? 'دوسي عليها وافتحيها.' : 'دوسي على الشوكولاتة وافتحيها.'}</p>
        </div>
      )}
    </Card>
  )
}

/**
 * Shows an unopened treat on its own, floating over the app, as soon as she
 * opens it. "بعدين" hides it until the next time she opens the app.
 */
export function TreatPopup({ state }: { state: AppState }) {
  // The treat on screen stays put while she opens and uses it, even once it is no longer pending.
  const [current, setCurrent] = useState<Treat | null>(null)
  const [seen, setSeen] = useState<string[]>([])
  const treat = current ?? treatsFor(state).find((item) => !seen.includes(item.id) && !isTreatOpened(item.id)) ?? null
  const opened = useTreatOpened(treat?.id ?? '')

  function close() {
    if (treat) setSeen((list) => [...list, treat.id])
    setCurrent(null)
  }

  return (
    <AnimatePresence>
      {treat && (
        <m.div key={treat.id} className="treat-popup" role="dialog" aria-modal="true" aria-label="مفاجأة ليكي" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <m.div className="treat-popup-card" initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: 'spring', damping: 16 }}>
            <button type="button" className="icon-button treat-close" onClick={close} aria-label="بعدين"><X /></button>
            <m.div className="treat-float" animate={opened ? { y: 0 } : { y: [0, -10, 0] }} transition={opened ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
              <Chocolate treat={treat} opened={opened} big onOpen={() => { setCurrent(treat); openTreat(treat.id) }} />
            </m.div>
            {opened ? (
              <m.div className="treat-inside" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.4 }}>
                <TreatInside treat={treat} onDone={close} inPopup />
              </m.div>
            ) : (
              <div className="treat-inside">
                <h2 className="card-title">{treat.kind === 'period' ? 'مفاجأة أيام البريود 🌸' : 'فيه حاجة حلوة ليكي 🎁'}</h2>
                <p className="muted small">{treat.kind === 'period' ? 'دوسي عليها وافتحيها.' : 'دوسي على الشوكولاتة وافتحيها.'}</p>
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
