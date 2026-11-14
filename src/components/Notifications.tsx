import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { addDays } from '../../shared/date'
import type { AppState } from '../../shared/types'
import { enablePush, pushStatus, type PushStatus } from '../lib/push'
import { storage } from '../lib/storage'
import { useAppData } from '../state/AppData'
import { Card, Notice } from './ui'

const LATER_KEY = 'menna-flow:push-later'
/** "مش دلوقتي" hides the card for this many days. */
const LATER_DAYS = 3

/**
 * Turning reminders on. Always somewhere on the home page, so she can redo it
 * whenever nothing arrives: the full card while they are off, one short line
 * once they are on or after "مش دلوقتي".
 */
export function NotificationsCard({ state }: { state: AppState }) {
  const { mode, push } = useAppData()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [justEnabled, setJustEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [laterUntil, setLaterUntil] = useState(() => storage.get(LATER_KEY))

  useEffect(() => {
    if (mode !== 'remote') return
    let cancelled = false
    pushStatus(push).then((next) => !cancelled && setStatus(next), () => !cancelled && setStatus('off'))
    return () => {
      cancelled = true
    }
  }, [mode, push])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      const next = await enablePush(push)
      setStatus(next)
      setJustEnabled(next === 'on')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'حصلت مشكلة، جربي تاني')
    } finally {
      setBusy(false)
    }
  }

  function later() {
    const until = addDays(state.today, LATER_DAYS)
    storage.set(LATER_KEY, until)
    setLaterUntil(until)
  }

  if (!status) return null
  if (justEnabled) {
    return (
      <Card className="soft-card">
        <h2 className="card-title"><Bell /> الإشعارات اشتغلت 🎉</h2>
        <p className="muted small">بعتنالك إشعار تجربة. من هنا هفكّرك بالنوم الضهر، والمية العصر، والتمرين بالليل، وبس لو لسه ما عملتيهمش 🤍</p>
      </Card>
    )
  }

  const errorNote = error && <Notice tone="care">{error}</Notice>
  const redo = <button type="button" className="link-button" disabled={busy} onClick={() => void enable()}>{busy ? 'لحظة…' : 'شغّليها من جديد'}</button>

  if (status === 'on') {
    return (
      <div className="push-line">
        <p className="muted small"><Bell /> الإشعارات شغّالة. مش بيوصلك حاجة؟</p>
        {redo}
        {errorNote}
      </div>
    )
  }
  if (status === 'unsupported') {
    return (
      <div className="push-line">
        <p className="muted small"><Bell /> الإشعارات مش شغّالة هنا. افتحي التطبيق من الأيقونة اللي على الشاشة الرئيسية، ولو لسه مش ظاهرة حدّثي الآيفون.</p>
      </div>
    )
  }
  if (status === 'off' && laterUntil && state.today < laterUntil) {
    return (
      <div className="push-line">
        <p className="muted small"><Bell /> الإشعارات مقفولة.</p>
        <button type="button" className="link-button" disabled={busy} onClick={() => void enable()}>{busy ? 'لحظة…' : 'شغّليها'}</button>
        {errorNote}
      </div>
    )
  }

  return (
    <Card className="soft-card">
      <h2 className="card-title"><Bell /> أفكّرك؟ 🔔</h2>
      {status === 'install' && <p className="muted small">عشان الإشعارات تشتغل على الآيفون: من Safari دوسي مشاركة ← Add to Home Screen، وافتحي التطبيق من الأيقونة.</p>}
      {status === 'denied' && <p className="muted small">الإشعارات مقفولة. افتحي الإعدادات ← الإشعارات ← Menna Flow وشغّليها، وبعدين ارجعي هنا.</p>}
      {status === 'off' && (
        <>
          <p className="muted small">هبعتلك إشعار صغير لو نسيتي تسجّلي نومك، أو المية قليلة، أو لسه ما اتمرنتيش، وقبل الصلاة ومواعيد البرشام 🤍</p>
          <button type="button" className="button primary" disabled={busy} onClick={() => void enable()}>{busy ? 'لحظة…' : 'شغّلي الإشعارات'}</button>
        </>
      )}
      {errorNote}
      {status === 'off' && <button type="button" className="link-button" onClick={later}>مش دلوقتي</button>}
    </Card>
  )
}
