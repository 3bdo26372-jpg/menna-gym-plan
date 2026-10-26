import { useState } from 'react'
import { Pencil, Pill } from 'lucide-react'
import { formatDateLong } from '../../shared/date'
import { PILL_SLOTS } from '../../shared/pills'
import { PillHistory, PillPlanForm, PillRow } from '../components/Pills'
import { Card, PageHeader } from '../components/ui'
import { useAppState } from '../state/AppData'

/** How many days back the page shows which pills she took. */
const HISTORY_DAYS = 7

/** البرشام: when she's reminded of each pill, ticking today's off, and the last days. */
export function PillsPage() {
  const state = useAppState()
  const [editing, setEditing] = useState(false)
  const plan = state.pillPlan ?? null
  const ended = plan?.until ? plan.until < state.today : false

  return (
    <div className="page">
      <PageHeader eyebrow="البرشام" title="برشامك 💊">
        <p>برشامتين كل يوم: واحدة بعد الفطار وواحدة بعد الغدا. اختاري أفكرك بيهم امتى، وأنا هبعتلك إشعار في ميعاد كل واحدة لحد آخر يوم 🤍</p>
      </PageHeader>

      {!state.profile.programStartDate ? null : !plan || editing || ended ? (
        <Card>
          <h2 className="card-title"><Pill /> {ended ? 'خلصتي البرشام؟ 🎉' : 'أفكرك امتى؟'}</h2>
          {ended && <p className="muted">آخر يوم كان {formatDateLong(plan!.until!)}. لو لسه هتكمّلي، اختاري المواعيد تاني.</p>}
          <PillPlanForm state={state} onDone={plan && !ended ? () => setEditing(false) : undefined} />
        </Card>
      ) : (
        <Card>
          <h2 className="card-title"><Pill /> النهارده</h2>
          <ul className="pill-list">{PILL_SLOTS.map((_, slot) => <PillRow key={slot} state={state} date={state.today} slot={slot} />)}</ul>
          <p className="muted small">{plan.until ? `هفكرك لحد ${formatDateLong(plan.until)}.` : 'هفكرك كل يوم لحد ما تقوليلي إنك خلصتيهم.'} ولو مدوستيش «خدتها» هفكرك تاني بعد شوية.</p>
          <button type="button" className="link-button" onClick={() => setEditing(true)}><Pencil /> غيّري المواعيد أو آخر يوم</button>
        </Card>
      )}

      {plan && (
        <Card>
          <h2 className="card-title">آخر {HISTORY_DAYS} أيام</h2>
          <PillHistory state={state} days={HISTORY_DAYS} />
        </Card>
      )}
    </div>
  )
}
