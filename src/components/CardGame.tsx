import { useState } from 'react'
import { m } from 'framer-motion'
import { formatDateShort } from '../../shared/date'
import { currentGame, gamePrize, PRIZES, SPECIAL_DECKS } from '../../shared/game'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

const FLIP = { duration: 0.6, ease: 'easeInOut' } as const
const OTHERS_DELAY = 1.1
const HEARTS = ['💗', '💸', '🤍', '💕', '💸', '💗']

/**
 * اللعبة: three face-down cards, each hiding money or a treat. Her card turns over
 * first, then the other two. Shown on the home page while today's round is
 * open, and on the day she played it.
 */
/** Whether the home page shows the game: a round is open, or she played it today. */
export function gameShown(state: AppState) {
  const game = currentGame(state)
  return Boolean(game && (!game.played || game.played.date === state.today))
}

/** A special round (the roses) she hasn't played yet: it goes first on the home page. */
export const specialGameOpen = (state: AppState) => Boolean(currentGame(state)?.special && !currentGame(state)?.played)

export function CardGame({ state }: { state: AppState }) {
  const { playGame } = useAppData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justPlayed, setJustPlayed] = useState(false)
  const game = currentGame(state)
  if (!game || (game.played && game.played.date !== state.today && !justPlayed)) return null
  const { played } = game

  async function pick(index: number) {
    setBusy(true)
    setError(null)
    try {
      await playGame(index)
      setJustPlayed(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="game-card" id="section-game">
      <div className="game-head">
        {game.special ? (
          <h2 className="card-title game-title-roses">
            <span className="rose-trio" aria-hidden="true">{SPECIAL_DECKS[game.special.kind].map((id) => <img key={id} src={PRIZES[id].image} alt="" />)}</span>
            اختاري وردتك يا وردتي
          </h2>
        ) : <h2 className="card-title">🎲 اختاري كارت</h2>}
        <p className="muted small">{game.special
          ? (played ? 'هدية من بابا عشان يصالحك 🤍' : 'تحت كل كارت وردة بلون مختلف، اختاري واحدة وهتوصلك من بابا 🤍')
          : (played ? 'كل ٥ أيام فيه لعبة جديدة.' : 'تحت كل كارت مفاجأة: فلوس أو حاجة حلوة. اختاري واحد بس!')}</p>
      </div>
      <div className="game-cards">
        {[0, 1, 2].map((index) => {
          const prize = played ? PRIZES[played.cards[index]] : null
          const mine = played?.pick === index
          const delay = justPlayed && !mine ? OTHERS_DELAY : 0
          return (
            <button
              key={index} type="button" className={`game-card-button ${mine ? 'is-mine' : ''} ${played && !mine ? 'is-other' : ''}`}
              disabled={busy || Boolean(played)} onClick={() => void pick(index)} aria-label={prize ? prize.label : `الكارت ${index + 1}`}
            >
              <m.span
                className="game-flip" initial={false}
                animate={{ rotateY: played ? 180 : 0, scale: busy ? [1, 1.04, 1] : 1 }}
                transition={played ? { ...FLIP, delay: justPlayed ? delay : 0 } : { duration: 0.6, repeat: busy ? Infinity : 0 }}
              >
                <span className="game-face game-back" aria-hidden="true"><b>؟</b>{game.special ? <img className="game-back-image" src={PRIZES['rose-red'].image} alt="" /> : <small>💌</small>}</span>
                <span className={`game-face game-front ${prize?.pounds ? 'is-money' : ''}`} style={prize?.color ? { background: prize.color } : undefined} aria-hidden="true">
                  {prize?.pounds
                    ? <><b>{prize.pounds}</b><small>جنيه</small></>
                    : <>{prize?.image ? <img className="game-image" src={prize.image} alt="" /> : <b className="game-emoji">{prize?.emoji}</b>}<small>{prize?.label}</small></>}
                </span>
              </m.span>
            </button>
          )
        })}
        {justPlayed && played && (
          <span className="game-hearts" aria-hidden="true">
            {HEARTS.map((heart, index) => (
              <m.span
                key={index} style={{ insetInlineStart: `${10 + index * 15}%` }}
                initial={{ y: 0, opacity: 0 }} animate={{ y: -110, opacity: [0, 1, 0] }}
                transition={{ duration: 1.8, delay: 0.5 + index * 0.1, ease: 'easeOut' }}
              >{heart}</m.span>
            ))}
          </span>
        )}
      </div>
      {played && (
        <m.div className="game-result" initial={justPlayed ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: justPlayed ? OTHERS_DELAY + 0.6 : 0 }}>
          <p className="gift-note">{gamePrize(played).image && <img className="game-result-image" src={gamePrize(played).image} alt="" />}كسبتي {gamePrize(played).pounds || gamePrize(played).image ? gamePrize(played).label : `${gamePrize(played).emoji} ${gamePrize(played).label}`} 🎉</p>
          <p className="muted small">هتوصلك من بابا {gamePrize(played).pounds ? '💸' : '🤍'}{game.special ? '' : ` · اللعبة الجاية يوم ${formatDateShort(game.next)}`}</p>
        </m.div>
      )}
      {error && <Notice tone="care">{error}</Notice>}
    </Card>
  )
}
