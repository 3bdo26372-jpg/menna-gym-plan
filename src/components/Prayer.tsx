import { useEffect, useState, type ReactNode } from 'react'
import { Check, Gift, MoonStar } from 'lucide-react'
import { addDays, cairoTime, diffDays, formatDateShort } from '../../shared/date'
import {
  cairoInstant,
  DAY_POINTS,
  FAJR,
  ON_TIME_MIN,
  pointsFor,
  prayerFreeDates,
  prayerLog,
  prayerPoints,
  PRAYERS,
  prayerTimes,
  unopenedBigGifts,
  unopenedPrayerGifts,
  BIG_GIFT_WEEKS,
  type PrayerGiftKind,
  type PrayerWeek,
} from '../../shared/prayer'
import type { Quote } from '../../shared/prayerTexts'
import type { AppState } from '../../shared/types'
import { useAppData } from '../state/AppData'
import { Card, Notice, ProgressBar } from './ui'

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
/** "7:29 م": the time of day words would say المغرب at Isha, so prayers just get ص / م. */
const prayerClock = (minutes: number) => `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes < 12 * 60 ? 'ص' : 'م'}`

/** Now as a timestamp, kept current every half minute so rows unlock as each prayer comes in. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/** A verse in ﴿﴾ or the Prophet's words in «», with where it comes from. */
export function QuoteBlock({ quote }: { quote: Quote }) {
  return (
    <figure className={`quote quote-${quote.kind}`}>
      <blockquote>
        {quote.lead && <span className="quote-lead">{quote.lead} </span>}
        {quote.kind === 'quran' ? `﴿${quote.text}﴾` : `«${quote.text}»`}
      </blockquote>
      <figcaption>{quote.kind === 'quran' ? `سورة ${quote.source}` : `رواه ${quote.source}`}</figcaption>
    </figure>
  )
}

/** One prayer on a day: its time, then «صليت», or when she prayed and its points. */
export function PrayerRow({ state, date, prayer, now }: { state: AppState; date: string; prayer: number; now: number }) {
  const { savePrayer } = useAppData()
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const at = prayerTimes(date).prayers[prayer]
  const log = prayerLog(state.prayers, date, prayer)
  const started = now >= cairoInstant(date, at)
  const today = date === state.today
  const lateFrom = Math.min(at + ON_TIME_MIN, 24 * 60 - 1)
  const nowMinutes = minutesOf(cairoTime(new Date(now)))
  const [picked, setPicked] = useState(() => clock(at))
  const { name, emoji } = PRAYERS[prayer]

  async function mark(prayed: boolean, time?: string) {
    setBusy(true)
    setError(null)
    try {
      await savePrayer(date, prayer, prayed, time ? new Date(cairoInstant(date, minutesOf(time))).toISOString() : undefined)
      setPicking(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  const minutesLate = Math.max(0, (now - cairoInstant(date, at)) / 60_000)
  const hint = log
    ? `صليتيها ${prayerClock(minutesOf(cairoTime(new Date(log.prayedAt))))} · ${pointsFor(log)} نقط`
    : !started ? `الساعة ${prayerClock(at)}`
      : prayer === FAJR ? `الساعة ${prayerClock(at)} · الفجر ليه الـ 10 نقط كاملين دايمًا`
        : minutesLate <= ON_TIME_MIN ? `الساعة ${prayerClock(at)} · الـ 10 نقط كاملين لحد ${prayerClock(lateFrom)}`
          : `الساعة ${prayerClock(at)} · لو صليتي دلوقتي: ${prayerPoints(prayer, minutesLate)} نقط`

  return (
    <li className={`pill-row prayer-row${log ? ' is-taken' : ''}${!started ? ' is-later' : ''}`}>
      <span aria-hidden="true">{emoji}</span>
      <div>
        <strong>{name}</strong>
        <small>{hint}</small>
      </div>
      {log
        ? <button type="button" className="chip soft" disabled={busy} onClick={() => void mark(false)} aria-label={`إلغاء: صليتي ${name}`}><Check /> صليتي</button>
        : started
          ? <button type="button" className="button primary small-button" disabled={busy} onClick={() => void mark(true)}><Check /> {busy ? 'لحظة…' : 'صليت'}</button>
          : <span className="chip">لسه</span>}
      {!log && started && today && (picking ? (
        <form className="prayer-pick" onSubmit={(event) => { event.preventDefault(); void mark(true, picked) }}>
          <label className="field">
            <span>صليتيها الساعة كام؟</span>
            <input type="time" value={picked} min={clock(at)} max={clock(nowMinutes)} required onChange={(event) => setPicked(event.target.value)} />
          </label>
          <button type="submit" className="button secondary small-button" disabled={busy || picked < clock(at) || picked > clock(nowMinutes)}>سجّليها</button>
        </form>
      ) : (
        <button type="button" className="link-button prayer-earlier" onClick={() => setPicking(true)}>صليتيها بدري ونسيتي تسجّلي؟</button>
      ))}
      {error && <Notice tone="care">{error}</Notice>}
    </li>
  )
}

/** The week so far: points against the gift's goal. */
export function PrayerWeekCard({ week, state, children }: { week: PrayerWeek; state: AppState; children?: ReactNode }) {
  const daysLeft = Math.max(0, diffDays(state.today, week.end))
  return (
    <Card>
      <h2 className="card-title"><Gift /> هدية الأسبوع</h2>
      <p className="prayer-week-score"><strong>{week.earned}</strong> من {week.goal} نقطة للهدية</p>
      <ProgressBar value={week.earned} max={week.goal} label="نقط الصلاة الأسبوع ده" />
      <p className="muted small">
        {week.reached ? 'وصلتي للهدية 🎉 هتتفتح بعد آخر يوم في الأسبوع.' : `من ${formatDateShort(week.start)} لحد ${formatDateShort(week.end)}${daysLeft ? `، فاضل ${daysLeft === 1 ? 'يوم' : daysLeft === 2 ? 'يومين' : `${daysLeft} أيام`} بعد النهارده` : '، النهارده آخر يوم'}.`}
        {week.possible < 7 * DAY_POINTS && ' أيام البريود مش متحسوبة عليكي.'}
      </p>
      {children}
    </Card>
  )
}

/** Weeks that earned a gift: she opens it, with a hint if she likes, and then sees where it is. */
export function PrayerGifts({ state }: { state: AppState }) {
  const waiting = [...unopenedBigGifts(state).map((week) => ({ week, kind: 'big' as const })), ...unopenedPrayerGifts(state).map((week) => ({ week, kind: 'week' as const }))]
  const opened = [
    ...(state.prayerBigGifts ?? []).map((gift) => ({ gift, kind: 'big' as const })),
    ...(state.prayerGifts ?? []).map((gift) => ({ gift, kind: 'week' as const })),
  ].filter(({ gift }) => gift.status !== 'cancelled').sort((a, b) => b.gift.createdAt.localeCompare(a.gift.createdAt)).slice(0, 4)
  if (!waiting.length && !opened.length) return null
  return (
    <Card className="soft-card">
      <h2 className="card-title"><Gift /> هدايا الصلاة 🎁</h2>
      {waiting.map(({ week, kind }) => <OpenGift key={`${kind}-${week.start}`} week={week} kind={kind} />)}
      {opened.length > 0 && (
        <ul className="sleep-history">
          {opened.map(({ gift, kind }) => (
            <li key={`${kind}-${gift.weekStart}`}>
              <strong>{kind === 'big' ? `الهدية الكبيرة 🏆 ${formatDateShort(gift.weekStart)}` : `أسبوع ${formatDateShort(gift.weekStart)}`}</strong>
              <span>{gift.status === 'done' ? 'وصلتك 🎉' : 'في الطريق 🎁'}</span>
              {gift.note && <small>تلميحتك: {gift.note}</small>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function OpenGift({ week, kind }: { week: PrayerWeek; kind: PrayerGiftKind }) {
  const { openPrayerGift } = useAppData()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function open() {
    setBusy(true)
    setError(null)
    try {
      await openPrayerGift(week.start, note.trim() || undefined, kind)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ')
      setBusy(false)
    }
  }
  return (
    <form className="prayer-gift" onSubmit={(event) => { event.preventDefault(); void open() }}>
      <p>{kind === 'big'
        ? `🏆 ${BIG_GIFT_WEEKS} أسابيع صلاة ورا بعض لحد ${formatDateShort(week.end)}! دي الهدية الكبيرة، ربنا يثبّتك 🤍`
        : `كسبتي هدية أسبوع ${formatDateShort(week.start)}: ${week.earned} نقطة من ${week.possible} 🤍`}</p>
      <label className="field">
        <span>نفسك في حاجة؟ اكتبيها تلميحة (مش لازم)</span>
        <input type="text" value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} placeholder="أو سيبيها مفاجأة" />
      </label>
      <button type="submit" className="button primary" disabled={busy}>{busy ? 'لحظة…' : 'افتحي هديتك'}</button>
      {error && <Notice tone="care">{error}</Notice>}
    </form>
  )
}

/** The last days, a mark per prayer. */
export function PrayerHistory({ state, days }: { state: AppState; days: number }) {
  const first = (state.prayers ?? []).reduce<string | null>((min, log) => (!min || log.date < min ? log.date : min), null)
  if (!first) return null
  const free = prayerFreeDates(state.periods, state.today)
  const dates = Array.from({ length: days }, (_, index) => addDays(state.today, -(index + 1))).filter((date) => date >= first)
  if (!dates.length) return null
  return (
    <ul className="sleep-history prayer-history">
      {dates.map((date) => {
        const points = PRAYERS.reduce((sum, _, prayer) => {
          const log = prayerLog(state.prayers, date, prayer)
          return sum + (log ? pointsFor(log) : 0)
        }, 0)
        return (
          <li key={date}>
            <strong>{formatDateShort(date)}</strong>
            {free.has(date)
              ? <span>بريود 🌸</span>
              : <>
                  <span aria-label={PRAYERS.map((item, prayer) => `${item.name} ${prayerLog(state.prayers, date, prayer) ? 'اتصلت' : 'لأ'}`).join('، ')}>
                    {PRAYERS.map((_, prayer) => (prayerLog(state.prayers, date, prayer) ? '✅' : '▫️')).join(' ')}
                  </span>
                  <b>{points} / {DAY_POINTS}</b>
                </>}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * On the home page only when it matters: a prayer whose time has come and
 * that she hasn't ticked, or a weekly gift waiting to be opened.
 */
export function PrayerCard({ state }: { state: AppState }) {
  const now = useNow()
  if (state.prayers === undefined || !state.profile.programStartDate) return null
  const big = unopenedBigGifts(state)
  if (big.length) {
    return (
      <Card className="soft-card">
        <h2 className="card-title"><Gift /> كسبتي الهدية الكبيرة 🏆</h2>
        <p className="muted">{BIG_GIFT_WEEKS} أسابيع صلاة ورا بعض، ربنا يثبّتك 🤍</p>
        <a className="button primary" href="#/prayer">افتحيها</a>
      </Card>
    )
  }
  const gifts = unopenedPrayerGifts(state)
  if (gifts.length) {
    return (
      <Card className="soft-card">
        <h2 className="card-title"><Gift /> كسبتي هدية أسبوع الصلاة 🎁</h2>
        <p className="muted">{gifts[0].earned} نقطة من {gifts[0].possible}، ربنا يتقبّل منك 🤍</p>
        <a className="button primary" href="#/prayer">افتحي هديتك</a>
      </Card>
    )
  }
  if (prayerFreeDates(state.periods, state.today).has(state.today)) return null
  const times = prayerTimes(state.today).prayers
  // The latest prayer that has come in today, if she hasn't ticked it.
  const current = times.map((at, prayer) => ({ at, prayer })).filter(({ at }) => now >= cairoInstant(state.today, at)).pop()
  if (!current || prayerLog(state.prayers, state.today, current.prayer)) return null
  return (
    <Card className="soft-card">
      <h2 className="card-title"><MoonStar /> وقت {PRAYERS[current.prayer].name} 🕌</h2>
      <ul className="pill-list"><PrayerRow state={state} date={state.today} prayer={current.prayer} now={now} /></ul>
      <a className="link-button" href="#/prayer">صلاة النهارده والأذكار</a>
    </Card>
  )
}
