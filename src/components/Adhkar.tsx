import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cairoTime } from '../../shared/date'
import { prayerTimes } from '../../shared/prayer'
import { ADHKAR, type AdhkarSet } from '../../shared/prayerTexts'
import { storage } from '../lib/storage'

const SETS: AdhkarSet[] = ['morning', 'evening', 'after']
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** Morning until Dhuhr, evening from Asr until Isha, otherwise the after-prayer ones. */
function setFor(date: string) {
  const [fajr, dhuhr, asr, , isha] = prayerTimes(date).prayers
  const now = minutesOf(cairoTime())
  return now >= fajr && now < dhuhr ? 'morning' : now >= asr && now < isha ? 'evening' : 'after'
}

/** Taps per dhikr, kept on this phone for the day only. */
const countsKey = (date: string, set: AdhkarSet) => `menna-flow:adhkar:${date}:${set}`

/** The adhkar as a list she reads through, tapping each one as she says it. */
export function Adhkar({ date }: { date: string }) {
  const [set, setSet] = useState<AdhkarSet>(() => setFor(date))
  const [counts, setCounts] = useState<Record<string, number>>(() => storage.getJson(countsKey(date, set)) ?? {})
  const { title, when, items } = ADHKAR[set]
  const done = items.filter((item) => (counts[item.id] ?? 0) >= item.count).length

  function choose(next: AdhkarSet) {
    setSet(next)
    setCounts(storage.getJson(countsKey(date, next)) ?? {})
  }
  function update(next: Record<string, number>) {
    setCounts(next)
    storage.setJson(countsKey(date, set), next)
  }

  return (
    <div className="adhkar">
      <div className="adhkar-tabs" role="tablist" aria-label="الأذكار">
        {SETS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={name === set} className={`chip${name === set ? ' is-active' : ''}`} onClick={() => choose(name)}>
            {ADHKAR[name].title}
          </button>
        ))}
      </div>
      <p className="muted small">{title}: {when}. {done ? `خلّصتي ${done} من ${items.length} 🤍` : 'دوسي على العداد كل ما تقولي الذكر.'}</p>
      <ol className="dhikr-list" role="tabpanel">
        {items.map((item) => {
          const said = counts[item.id] ?? 0
          const finished = said >= item.count
          return (
            <li key={item.id} className={`dhikr${finished ? ' is-done' : ''}`}>
              <p className="dhikr-text">{item.text}</p>
              {item.virtue && <p className="dhikr-virtue">«{item.virtue}»</p>}
              <div className="dhikr-foot">
                <small>{item.source}</small>
                <button
                  type="button"
                  className={`dhikr-count${finished ? ' is-done' : ''}`}
                  disabled={finished}
                  onClick={() => update({ ...counts, [item.id]: said + 1 })}
                  aria-label={`${said} من ${item.count}`}
                >
                  {finished ? '✓' : item.count === 1 ? 'قلته' : `${said} / ${item.count}`}
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      {Object.keys(counts).length > 0 && (
        <button type="button" className="link-button" onClick={() => update({})}><RotateCcw /> ابدئي العداد من الأول</button>
      )}
    </div>
  )
}
