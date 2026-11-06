import { useState } from 'react'
import { Pill, Plus } from 'lucide-react'
import { MAX_PILLS, pillsOn } from '../../shared/pills'
import { PillForm, PillHistory, PillRow } from '../components/Pills'
import { Card, PageHeader } from '../components/ui'
import { useAppState } from '../state/AppData'

/** How many days back the page shows which pills she took. */
const HISTORY_DAYS = 7

/** البرشام: her own list of pills, ticking today's off, and the last days. */
export function PillsPage() {
  const state = useAppState()
  const [adding, setAdding] = useState(false)
  const today = pillsOn(state.pills, state.today)
  const started = Boolean(state.profile.programStartDate)
  const known = state.pills !== undefined

  return (
    <div className="page">
      <PageHeader eyebrow="البرشام" title="برشامك 💊">
        <p>ضيفي كل برشامة بتاخديها باسمها وميعادها، وأنا هبعتلك إشعار في ميعاد كل واحدة. ولما تبطّلي واحدة، شيليها 🤍</p>
      </PageHeader>

      {started && known && (
        <Card>
          <h2 className="card-title"><Pill /> النهارده</h2>
          {today.length
            ? <ul className="pill-list">{today.map((pill) => <PillRow key={pill.id} state={state} date={state.today} pill={pill} editable />)}</ul>
            : <p className="muted">مفيش برشام دلوقتي. لو بتاخدي حاجة، ضيفيها تحت وأنا هفكرك بيها.</p>}
          {today.length > 0 && <p className="muted small">ولو مدوستيش «خدتها» هفكرك تاني بعد شوية.</p>}
        </Card>
      )}

      {started && known && today.length < MAX_PILLS && (
        <Card>
          <h2 className="card-title"><Plus /> ضيفي برشامة</h2>
          {adding || !today.length
            ? <PillForm onDone={today.length ? () => setAdding(false) : undefined} />
            : <button type="button" className="button secondary" onClick={() => setAdding(true)}><Plus /> برشامة جديدة</button>}
        </Card>
      )}

      {started && known && (
        <Card>
          <h2 className="card-title">آخر {HISTORY_DAYS} أيام</h2>
          <PillHistory state={state} days={HISTORY_DAYS} />
        </Card>
      )}
    </div>
  )
}
