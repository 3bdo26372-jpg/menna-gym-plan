import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  CirclePause,
  CirclePlay,
  Clock3,
  Footprints,
  HeartPulse,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wind,
  ExternalLink,
  Search,
  X,
} from 'lucide-react'
import {
  library,
  libraryById,
  libraryCategories,
  exerciseGif,
  variantLabels,
  youtubeSearch,
  youtubeWatch,
  type LibraryCategory,
  type LibraryExercise,
  type Variant,
} from './library'

type Level = {
  id: 'easy' | 'steady' | 'active'
  name: string
  shortName: string
  description: string
  work: number
  rest: number
  rounds: number
  duration: string
  effort: string
  exercises: LibraryExercise[]
}

const pick = (...ids: string[]) => ids.map((id) => libraryById[id])

const levels: Level[] = [
  {
    id: 'easy',
    name: 'المستوى الأول — بداية هادية',
    shortName: 'بداية هادية',
    description: 'حركة خفيفة تفوّق الجسم وتنشّط الدورة الدموية من غير نط أو ضغط.',
    work: 30,
    rest: 15,
    rounds: 2,
    duration: '10–12 دقيقة',
    effort: 'خفيف',
    exercises: pick('march-in-place', 'side-step-touch', 'heel-tap', 'wall-push-up', 'shoulder-blade-squeeze', 'calf-raise'),
  },
  {
    id: 'steady',
    name: 'المستوى الثاني — حركة ثابتة',
    shortName: 'حركة ثابتة',
    description: 'إيقاع أسرع قليلًا مع حركات تشغّل الوسط وتشد الجسم كله من غير إرهاق.',
    work: 35,
    rest: 15,
    rounds: 3,
    duration: '18–20 دقيقة',
    effort: 'متوسط مريح',
    exercises: pick('march-in-place', 'low-knee-lift', 'back-toe-tap', 'standing-hamstring-curl', 'wall-push-up', 'palm-press', 'cross-body-reach'),
  },
  {
    id: 'active',
    name: 'المستوى الثالث — نشاط أعلى',
    shortName: 'نشاط أعلى',
    description: 'دائرة أطول بإيقاع نشيط، ما زالت كلها واقفة ومنخفضة الصدمات ومن غير قفز.',
    work: 40,
    rest: 20,
    rounds: 3,
    duration: '24–26 دقيقة',
    effort: 'نشيط ومتحكَّم فيه',
    exercises: pick('arm-march', 'side-step-touch', 'low-knee-lift', 'standing-hip-abduction', 'standing-hip-extension', 'wall-push-up', 'standing-side-crunch', 'abdominal-brace'),
  },
]

const cooldown = library.filter((exercise) => exercise.category === 'stretch')

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function VariantButtons({ exercise, variant, onChange, compact = false }: {
  exercise: LibraryExercise
  variant: Variant
  onChange: (variant: Variant) => void
  compact?: boolean
}) {
  const options: [Variant, string][] = [[0, exercise.name], [1, exercise.alternatives[0]], [2, exercise.alternatives[1]]]
  return (
    <div className={`variant-buttons ${compact ? 'is-compact' : ''}`} role="group" aria-label={`اختاري نسخة ${exercise.name}`}>
      {options.map(([value, text]) => (
        <button type="button" key={value} aria-pressed={variant === value} onClick={() => onChange(value)}>
          <b>{variantLabels[value]}</b>
          {!compact && value > 0 && <span>{text}</span>}
        </button>
      ))}
    </div>
  )
}

function LibraryCard({ exercise, focused }: { exercise: LibraryExercise; focused: boolean }) {
  const [variant, setVariant] = useState<Variant>(0)
  return (
    <article className={`library-card ${focused ? 'is-focused' : ''}`} id={`lib-${exercise.id}`}>
      <figure className="library-video">
        <img src={exerciseGif(exercise.id, variant)} alt={`حركة ${variant ? exercise.alternatives[variant - 1] : exercise.name}`} loading="lazy" />
        <figcaption>{variantLabels[variant]}</figcaption>
      </figure>
      <div className="library-body">
        <span className="library-number">{String(exercise.number).padStart(2, '0')}</span>
        <h4>{exercise.name}</h4>
        <small className="library-subtitle">{exercise.subtitle} · {exercise.focus}</small>
        <p>{exercise.cue}</p>
        <VariantButtons exercise={exercise} variant={variant} onChange={setVariant} />
        <div className="library-links">
          <a href={youtubeWatch(exercise.youtubeId)} target="_blank" rel="noreferrer"><ExternalLink /> فيديو على يوتيوب</a>
          <a href={youtubeSearch(exercise.searchQuery)} target="_blank" rel="noreferrer"><Search /> فيديوهات تانية</a>
        </div>
      </div>
    </article>
  )
}

function CircuitRow({ exercise, index }: { exercise: LibraryExercise; index: number }) {
  const [variant, setVariant] = useState<Variant>(0)
  return (
    <li>
      <span className="exercise-index">{index + 1}</span>
      <a className="exercise-media" href={`#/library/${exercise.id}`} aria-label={`تمرين ${exercise.name} في المكتبة`}>
        <img src={exerciseGif(exercise.id, variant)} alt="" loading="lazy" />
      </a>
      <div className="exercise-copy">
        <strong>{variant ? exercise.alternatives[variant - 1] : exercise.name}</strong>
        <p>{variant ? `بديل أخف لـ ${exercise.name}` : exercise.cue}</p>
        <VariantButtons exercise={exercise} variant={variant} onChange={setVariant} compact />
      </div>
      <span className="focus-tag">{exercise.focus}</span>
    </li>
  )
}

function readHash() {
  const match = window.location.hash.match(/^#\/library(?:\/([\w-]+))?/)
  return match ? { page: 'library' as const, focusId: match[1] ?? null } : { page: 'home' as const, focusId: null }
}

function useHashRoute() {
  const [route, setRoute] = useState(readHash)
  useEffect(() => {
    const onChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

function LibraryPage({ focusId }: { focusId: string | null }) {
  const [category, setCategory] = useState<LibraryCategory | 'all'>('all')
  const groups = libraryCategories.filter((group) => category === 'all' || group.id === category)

  useEffect(() => {
    if (focusId) setCategory('all')
    const target = focusId ? document.getElementById(`lib-${focusId}`) : null
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [focusId])

  return (
    <section className="library-section" id="library">
      <a href="#/" className="library-back"><ArrowRight /> الرجوع للبرنامج</a>
      <div className="section-heading">
        <h1>المكتبة</h1>
        <p>٢٠ تمرين هم أساس البرنامج كله: كلهم واقفين ومن غير معدات، ولكل واحد بديلين أخف لو جسمك محتاج هدوء أكتر.</p>
      </div>

      <div className="library-filter" role="group" aria-label="تصفية المكتبة">
        <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>الكل <small>{library.length}</small></button>
        {libraryCategories.map((group) => (
          <button type="button" key={group.id} aria-pressed={category === group.id} onClick={() => setCategory(group.id)}>
            {group.title} <small>{library.filter((exercise) => exercise.category === group.id).length}</small>
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <div className="library-group" key={group.id}>
          <div className="library-group-heading">
            <h3>{group.title}</h3>
            <p>{group.description}</p>
          </div>
          <div className="library-grid">
            {library.filter((exercise) => exercise.category === group.id).map((exercise) => (
              <LibraryCard exercise={exercise} focused={focusId === exercise.id} key={exercise.id} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function App() {
  const route = useHashRoute()
  const [selectedId, setSelectedId] = useState<Level['id']>('easy')
  const [isRunnerOpen, setRunnerOpen] = useState(false)
  const [isRunning, setRunning] = useState(false)
  const [phase, setPhase] = useState<'work' | 'rest' | 'done'>('work')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [round, setRound] = useState(1)
  const selected = levels.find((level) => level.id === selectedId) ?? levels[0]
  const [secondsLeft, setSecondsLeft] = useState(selected.work)

  const totalSteps = selected.exercises.length * selected.rounds
  const finishedSteps = (round - 1) * selected.exercises.length + exerciseIndex
  const progress = phase === 'done' ? 100 : Math.round((finishedSteps / totalSteps) * 100)

  const nextExercise = useMemo(() => {
    if (exerciseIndex < selected.exercises.length - 1) return selected.exercises[exerciseIndex + 1]
    if (round < selected.rounds) return selected.exercises[0]
    return null
  }, [exerciseIndex, round, selected])
  const runnerExercise = phase === 'rest' && nextExercise ? nextExercise : selected.exercises[exerciseIndex]
  const [runnerVariant, setRunnerVariant] = useState<Variant>(0)
  useEffect(() => setRunnerVariant(0), [runnerExercise.id])

  useEffect(() => {
    if (!isRunnerOpen || !isRunning || phase === 'done') return
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1

        if (phase === 'work') {
          setPhase('rest')
          return selected.rest
        }

        const isLastExercise = exerciseIndex === selected.exercises.length - 1
        const isLastRound = round === selected.rounds
        if (isLastExercise && isLastRound) {
          setPhase('done')
          setRunning(false)
          return 0
        }

        if (isLastExercise) {
          setExerciseIndex(0)
          setRound((value) => value + 1)
        } else {
          setExerciseIndex((value) => value + 1)
        }
        setPhase('work')
        return selected.work
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [exerciseIndex, isRunnerOpen, isRunning, phase, round, selected])

  function resetRunner(level = selected) {
    setRunning(false)
    setPhase('work')
    setExerciseIndex(0)
    setRound(1)
    setSecondsLeft(level.work)
  }

  function chooseLevel(level: Level) {
    setSelectedId(level.id)
    resetRunner(level)
    document.getElementById('circuit')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openRunner() {
    resetRunner()
    setRunnerOpen(true)
  }

  function skipPhase() {
    if (phase === 'done') return
    if (phase === 'work') {
      setPhase('rest')
      setSecondsLeft(selected.rest)
      return
    }
    const isLastExercise = exerciseIndex === selected.exercises.length - 1
    if (isLastExercise && round === selected.rounds) {
      setPhase('done')
      setRunning(false)
      setSecondsLeft(0)
      return
    }
    if (isLastExercise) {
      setExerciseIndex(0)
      setRound((value) => value + 1)
    } else {
      setExerciseIndex((value) => value + 1)
    }
    setPhase('work')
    setSecondsLeft(selected.work)
  }

  if (route.page === 'library') {
    return (
      <main className="home-workout" dir="rtl">
        <header className="topbar">
          <a href="#/" className="brand" aria-label="الرجوع للبرنامج">
            <span className="brand-mark"><HeartPulse /></span>
            <span><strong>Menna Flow</strong><small>حركة خفيفة في البيت</small></span>
          </a>
          <nav className="topbar-links">
            <a href="#/" className="topbar-action">البرنامج <ChevronLeft /></a>
          </nav>
        </header>
        <LibraryPage focusId={route.focusId} />
        <footer><span>Menna Flow</span><small>اختاري الحركة اللي جسمك قادر عليها النهارده.</small></footer>
      </main>
    )
  }

  return (
    <main className="home-workout" dir="rtl">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="العودة لبداية الصفحة">
          <span className="brand-mark"><HeartPulse /></span>
          <span><strong>Menna Flow</strong><small>حركة خفيفة في البيت</small></span>
        </a>
        <nav className="topbar-links">
          <a href="#/library" className="topbar-action"><BookOpen /> المكتبة</a>
          <a href="#levels" className="topbar-action">اختاري مستواكي <ChevronLeft /></a>
        </nav>
      </header>


      <section className="hero" id="top">
        <div className="hero-copy">
          <h1>حرّكي جسمك.<br /><em>من غير ما ترهقيه.</em></h1>
          <p>ثلاث دوائر منزلية منفصلة، كلها على الواقف ومن غير نط. اختاري المستوى المناسب لطاقة النهارده وكرّري الجولة على راحتك.</p>
          <div className="hero-actions">
            <a href="#levels" className="primary-action">شوفي المستويات <ArrowLeft /></a>
            <span><ShieldCheck /> بدون أدوات · بدون تمارين أرضية</span>
          </div>
        </div>
        <div className="hero-panel" aria-label="فكرة البرنامج">
          <div className="pulse-orbit"><Activity /></div>
          <strong>حركة مستمرة<br />وشد للجذع</strong>
          <p>المقياس الصح: تقدري تتكلمي أثناء التمرين، لكن تحسي إن النفس أسرع شوية.</p>
          <div className="hero-facts">
            <span><Footprints /> واقف فقط</span>
            <span><Wind /> منخفض الصدمات</span>
            <span><TimerReset /> جولات مرنة</span>
          </div>
        </div>
      </section>

      <section className="level-section" id="levels">
        <div className="section-heading">
          <h2>اختاري على حسب طاقتك</h2>
          <p>مفيش أيام ثابتة ولا ترتيب إجباري. كل مستوى تمرين كامل لوحده.</p>
        </div>
        <div className="level-list">
          {levels.map((level, index) => (
            <button
              type="button"
              key={level.id}
              className={`level-row ${selectedId === level.id ? 'is-selected' : ''}`}
              onClick={() => chooseLevel(level)}
              aria-pressed={selectedId === level.id}
            >
              <span className="level-number">{index + 1}</span>
              <span className="level-copy"><strong>{level.shortName}</strong><small>{level.description}</small></span>
              <span className="level-meta"><b>{level.duration}</b><small>{level.rounds} جولات · {level.effort}</small></span>
              <span className="level-check">{selectedId === level.id ? <Check /> : <ChevronLeft />}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="circuit-section" id="circuit">
        <div className="circuit-intro">
          <div>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
          </div>
          <button type="button" className="start-action" onClick={openRunner}><CirclePlay /> ابدئي التمرين</button>
        </div>

        <div className="circuit-stats" aria-label="تفاصيل الجولة">
          <span><Clock3 /><b>{selected.work} ثانية</b><small>حركة</small></span>
          <span><CirclePause /><b>{selected.rest} ثانية</b><small>راحة</small></span>
          <span><RotateCcw /><b>{selected.rounds} جولات</b><small>الدائرة كاملة</small></span>
        </div>

        <ol className="exercise-list">
          {selected.exercises.map((exercise, index) => (
            <CircuitRow exercise={exercise} index={index} key={exercise.id} />
          ))}
        </ol>

        <div className="cooldown">
          <strong><Wind /> التهدئة بعد آخر جولة</strong>
          <p>اثبتي في كل إطالة 20–30 ثانية بنفَس هادي، ومن غير أي ألم.</p>
          <div className="cooldown-list">
            {cooldown.map((exercise) => (
              <a key={exercise.id} href={`#/library/${exercise.id}`}>
                <img src={exerciseGif(exercise.id)} alt="" loading="lazy" />
                <span>{exercise.name}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="round-note">
          <RotateCcw />
          <div><strong>بعد آخر تمرين</strong><p>خدي راحة من 45 إلى 60 ثانية، اشربي رشفات مية، وابدئي الجولة من الأول. لو جسمك مكتفي، وقّفي عند الجولة الحالية.</p></div>
        </div>
      </section>

      <section className="library-teaser">
        <BookOpen />
        <div><strong>المكتبة</strong><p>الـ٢٠ تمرين اللي البرنامج مبني عليهم، بالحركة المتحركة، ولكل تمرين بديلين أخف تقدري تشوفي حركتهم.</p></div>
        <a href="#/library" className="primary-action">افتحي المكتبة <ArrowLeft /></a>
      </section>

      <section className="safety-section">
        <div className="section-heading">
          <h2>تتمرني براحة، مش بعند</h2>
          <p>الحركة المنتظمة أهم من السرعة أو إنك تكمّلي كل الجولات.</p>
        </div>
        <div className="safety-grid">
          <article><HeartPulse /><strong>اختبار الكلام</strong><p>خلي الشدة في مستوى تقدري تتكلمي فيه. لو الكلام بقى صعب، هدي السرعة.</p></article>
          <article><Sparkles /><strong>البطن شغالة طول الوقت</strong><p>شدّي البطن بدرجة خفيفة مع ظهر طويل؛ الهدف ثبات الجذع، مش حبس النفس.</p></article>
          <article><ShieldCheck /><strong>إشارة التوقف</strong><p>وقّفي فورًا مع ألم صدر، دوخة، ضيق نفس شديد أو ألم حاد ومفاجئ.</p></article>
        </div>
      </section>

      <footer><span>Menna Flow</span><small>اختاري الحركة اللي جسمك قادر عليها النهارده.</small></footer>

      <AnimatePresence>
        {isRunnerOpen && (
          <motion.div className="runner-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="runner" role="dialog" aria-modal="true" aria-label="مؤقت التمرين" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <button className="runner-close" type="button" onClick={() => { setRunnerOpen(false); setRunning(false) }} aria-label="إغلاق المؤقت"><X /></button>
              {phase === 'done' ? (
                <div className="runner-complete">
                  <span><Check /></span>
                  <h2>كده تمام يا منّة</h2>
                  <p>كمّلتي {selected.rounds} جولات من {selected.shortName}. خدي نفس هادي واشربي مية.</p>
                  <button type="button" onClick={() => resetRunner()}><RotateCcw /> إعادة التمرين</button>
                </div>
              ) : (
                <>
                  <div className="runner-progress"><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
                  <div className="runner-top"><span>الجولة {round} من {selected.rounds}</span><b>{phase === 'work' ? 'وقت الحركة' : 'راحة قصيرة'}</b></div>
                  <div className="runner-stage">
                    <figure className="runner-demo">
                      <img src={exerciseGif(runnerExercise.id, runnerVariant)} alt={`حركة ${runnerExercise.name}`} />
                      <figcaption>{variantLabels[runnerVariant]}</figcaption>
                    </figure>
                    <div className={`timer-face ${phase === 'rest' ? 'is-rest' : ''}`}>
                      <span>{formatTime(secondsLeft)}</span>
                      <small>{phase === 'work' ? runnerExercise.name : `التالي: ${runnerExercise.name}`}</small>
                    </div>
                  </div>
                  <p className="runner-cue">
                    {phase === 'work' ? selected.exercises[exerciseIndex].cue : nextExercise ? `التالي: ${nextExercise.name}` : 'آخر راحة قبل النهاية'}
                    {runnerVariant > 0 && <small>{runnerExercise.alternatives[runnerVariant - 1]}</small>}
                  </p>
                  <VariantButtons exercise={runnerExercise} variant={runnerVariant} onChange={setRunnerVariant} compact />
                  <div className="runner-controls">
                    <button type="button" className="runner-primary" onClick={() => setRunning((value) => !value)}>
                      {isRunning ? <><CirclePause /> إيقاف مؤقت</> : <><CirclePlay /> {secondsLeft === selected.work && exerciseIndex === 0 && round === 1 ? 'ابدئي' : 'كمّلي'}</>}
                    </button>
                    <button type="button" onClick={skipPhase}>تخطي <ChevronLeft /></button>
                    <button type="button" onClick={() => resetRunner()}><RotateCcw /> إعادة</button>
                  </div>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
