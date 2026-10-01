import { lazy, Suspense, useState } from 'react'
import { LazyMotion } from 'framer-motion'
import { CalendarCheck, ChartLine, FileText, Gift, HeartPulse, KeyRound, RefreshCw, Ruler, Utensils } from 'lucide-react'
import { Celebration } from './components/Celebration'
import { Card, Spinner } from './components/ui'
import { useRoute, type Route } from './lib/router'
import { TodayPage } from './pages/TodayPage'
import { AppDataProvider, useAppData } from './state/AppData'

const WorkoutPage = lazy(() => import('./workout/WorkoutPage').then((module) => ({ default: module.WorkoutPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })))
const FoodPage = lazy(() => import('./pages/FoodPage').then((module) => ({ default: module.FoodPage })))
const MeasurementsPage = lazy(() => import('./pages/MeasurementsPage').then((module) => ({ default: module.MeasurementsPage })))
const RewardsPage = lazy(() => import('./pages/RewardsPage').then((module) => ({ default: module.RewardsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))

const NAV: { route: Exclude<Route, 'workout'>; label: string; icon: typeof CalendarCheck }[] = [
  { route: 'today', label: 'اليوم', icon: CalendarCheck },
  { route: 'progress', label: 'التقدم', icon: ChartLine },
  { route: 'food', label: 'الأكل', icon: Utensils },
  { route: 'measurements', label: 'القياسات', icon: Ruler },
  { route: 'rewards', label: 'المكافآت', icon: Gift },
  { route: 'reports', label: 'التقارير', icon: FileText },
]

const loadMotion = () => import('./lib/motionFeatures').then((module) => module.default)

export default function App() {
  return (
    <LazyMotion features={loadMotion} strict>
      <AppDataProvider>
        <Shell />
      </AppDataProvider>
    </LazyMotion>
  )
}

function Shell() {
  const route = useRoute()
  const { status, error, reload, mode, state, markRewardCelebrated } = useAppData()
  const pending = state?.rewards.find((reward) => reward.unlockedOn && !reward.celebratedAt) ?? null

  if (status === 'passcode') return <PasscodeScreen />
  if (route === 'workout' && status === 'ready') return <Suspense fallback={<div className="page center"><Spinner /></div>}><WorkoutPage /></Suspense>

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/today" className="brand" aria-label="Menna Flow — اليوم">
          <span className="brand-mark"><HeartPulse /></span>
          <span><strong>Menna Flow</strong><small>تمرين كل يوم</small></span>
        </a>
        <nav className="nav" aria-label="الأقسام">
          {NAV.map(({ route: target, label, icon: Icon }) => (
            <a key={target} href={`#/${target}`} className="nav-link" aria-current={route === target ? 'page' : undefined}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </a>
          ))}
        </nav>
      </header>
      {mode === 'local' && (
        <p className="mode-banner">وضع تجربة محلي: البيانات محفوظة على الجهاز ده بس لحد ما يتوصل الـ API (VITE_API_URL).</p>
      )}
      <main className="main">
        {status === 'loading' && <div className="page center"><Spinner /></div>}
        {status === 'error' && (
          <div className="page center">
            <Card>
              <h2 className="card-title">مش قادرين نوصل للبيانات دلوقتي</h2>
              <p className="muted">{error}</p>
              <button type="button" className="button primary" onClick={() => void reload()}><RefreshCw /> حاولي تاني</button>
            </Card>
          </div>
        )}
        {status === 'ready' && (
          <Suspense fallback={<div className="page center"><Spinner /></div>}>
            {route === 'today' && <TodayPage />}
            {route === 'progress' && <ProgressPage />}
            {route === 'food' && <FoodPage />}
            {route === 'measurements' && <MeasurementsPage />}
            {route === 'rewards' && <RewardsPage />}
            {route === 'reports' && <ReportsPage />}
          </Suspense>
        )}
        {status === 'ready' && error && <p className="toast" role="alert">{error}</p>}
      </main>
      <Celebration reward={pending} onClose={() => pending && void markRewardCelebrated(pending.id)} />
    </div>
  )
}

function PasscodeScreen() {
  const { submitPasscode } = useAppData()
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div className="passcode">
      <Card>
        <span className="brand-mark large"><KeyRound /></span>
        <h1>Menna Flow</h1>
        <p className="muted">اكتبي كلمة السر مرة واحدة على الجهاز ده.</p>
        <form className="form-stack" onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setWrong(!(await submitPasscode(value)))
          setBusy(false)
        }}>
          <label className="field">
            <span>كلمة السر</span>
            <input type="password" autoComplete="current-password" value={value} onChange={(event) => setValue(event.target.value)} required />
          </label>
          {wrong && <p className="form-error" role="alert">كلمة السر مش صح، جربي تاني.</p>}
          <button type="submit" className="button primary" disabled={busy || !value}>{busy ? 'لحظة…' : 'دخول'}</button>
        </form>
      </Card>
    </div>
  )
}
