import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronLeft,
  CirclePause,
  CirclePlay,
  Clock3,
  ExternalLink,
  Feather,
  Footprints,
  HeartPulse,
  Library,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wind,
  X,
} from 'lucide-react'
import {
  library,
  libraryById,
  libraryCategories,
  youtubeEmbed,
  youtubeSearch,
  youtubeThumbnail,
  youtubeWatch,
  type LibraryCategoryId,
  type LibraryExercise,
} from './library'

type Exercise = LibraryExercise

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
  exercises: Exercise[]
}

function fromLibrary(ids: string[]): Exercise[] {
  return ids.map((id) => libraryById[id])
}

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
    exercises: fromLibrary(['march', 'sideStepTouch', 'heelTap', 'calfRaise', 'shoulderBladeSqueeze', 'abdominalBrace']),
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
    exercises: fromLibrary(['march', 'backToeTap', 'hamstringCurl', 'hipAbduction', 'wallPushUp', 'crossBodyReach', 'sideCrunch']),
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
    exercises: fromLibrary(['armMarch', 'lowKneeLift', 'sideStepTouch', 'hipExtension', 'wallPushUp', 'palmPress', 'sideCrunch', 'crossBodyReach']),
  },
]

const cooldown = library.filter((exercise) => exercise.category === 'stretch')

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function LiteVideo({ exercise, autoPlay = false }: { exercise: Exercise; autoPlay?: boolean }) {
  const [isPlaying, setPlaying] = useState(autoPlay)
  if (isPlaying) {
    return (
      <iframe
        className="lite-video"
        src={youtubeEmbed(exercise.youtubeId)}
        title={`فيديو تمرين ${exercise.name}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    )
  }
  return (
    <button type="button" className="lite-video lite-video-poster" onClick={() => setPlaying(true)} aria-label={`تشغيل فيديو ${exercise.name}`}>
      <img src={youtubeThumbnail(exercise.youtubeId)} alt="" loading="lazy" />
      <span className="lite-video-play"><Play /></span>
    </button>
  )
}

function VideoLinks({ exercise }: { exercise: Exercise }) {
  return (
    <span className="video-links">
      <a href={youtubeWatch(exercise.youtubeId)} target="_blank" rel="noreferrer">افتحي على يوتيوب <ExternalLink /></a>
      <a href={youtubeSearch(exercise.searchQuery)} target="_blank" rel="noreferrer">فيديوهات تانية</a>
    </span>
  )
}

function Alternatives({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  return (
    <ul className={`alternatives ${compact ? 'is-compact' : ''}`} aria-label="بدائل أخف">
      {exercise.alternatives.map((alternative, index) => (
        <li key={alternative}><b><Feather /> أخف {index + 1}</b><span>{alternative}</span></li>
      ))}
    </ul>
  )
}

function ExerciseRow({ exercise, index, onPlay }: { exercise: Exercise; index: number; onPlay: (exercise: Exercise) => void }) {
  return (
    <li>
      <span className="exercise-index">{index + 1}</span>
      <button type="button" className="exercise-media" onClick={() => onPlay(exercise)} aria-label={`شوفي فيديو ${exercise.name}`}>
        <img src={youtubeThumbnail(exercise.youtubeId)} alt="" loading="lazy" />
        <span className="lite-video-play is-small"><Play /></span>
      </button>
      <div className="exercise-copy">
        <strong>{exercise.name}</strong>
        <p>{exercise.cue}</p>
        <Alternatives exercise={exercise} compact />
      </div>
      <span className="focus-tag">{exercise.focus}</span>
    </li>
  )
}

function App() {
  const [selectedId, setSelectedId] = useState<Level['id']>('easy')
  const [isRunnerOpen, setRunnerOpen] = useState(false)
  const [isRunning, setRunning] = useState(false)
  const [phase, setPhase] = useState<'work' | 'rest' | 'done'>('work')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [libraryFilter, setLibraryFilter] = useState<LibraryCategoryId | 'all'>('all')
  const [videoExercise, setVideoExercise] = useState<Exercise | null>(null)
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

  const visibleCategories = libraryFilter === 'all' ? libraryCategories : libraryCategories.filter((category) => category.id === libraryFilter)

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

  return (
    <main className="home-workout" dir="rtl">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="العودة لبداية الصفحة">
          <span className="brand-mark"><HeartPulse /></span>
          <span><strong>Menna Flow</strong><small>حركة خفيفة في البيت</small></span>
        </a>
        <nav className="topbar-links">
          <a href="#library" className="topbar-action">مكتبة الفيديوهات <Library /></a>
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

      <section className="library-section" id="library">
        <div className="section-heading">
          <h2>مكتبة الفيديوهات</h2>
          <p>{library.length} تمرين هم أساس البرنامج كله. كلهم واقفين ومن غير أدوات، ولكل تمرين بديلين أخف لو محتاجة تهدي.</p>
        </div>
        <div className="library-filters" role="tablist" aria-label="تصنيف التمارين">
          <button type="button" role="tab" aria-selected={libraryFilter === 'all'} className={libraryFilter === 'all' ? 'is-active' : ''} onClick={() => setLibraryFilter('all')}>الكل</button>
          {libraryCategories.map((category) => (
            <button type="button" role="tab" key={category.id} aria-selected={libraryFilter === category.id} className={libraryFilter === category.id ? 'is-active' : ''} onClick={() => setLibraryFilter(category.id)}>{category.name}</button>
          ))}
        </div>
        {visibleCategories.map((category) => (
          <div className="library-group" key={category.id}>
            <div className="library-group-heading"><h3>{category.name}</h3><p>{category.description}</p></div>
            <div className="library-grid">
              {library.filter((exercise) => exercise.category === category.id).map((exercise) => (
                <article className="library-card" key={exercise.id}>
                  <div className="library-video"><LiteVideo exercise={exercise} /></div>
                  <div className="library-card-body">
                    <div className="library-card-title"><span>{exercise.number}</span><strong>{exercise.name}</strong></div>
                    <p>{exercise.cue}</p>
                    <Alternatives exercise={exercise} />
                    <VideoLinks exercise={exercise} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="level-section" id="levels">
        <div className="section-heading">
          <h2>اختاري على حسب طاقتك</h2>
          <p>مفيش أيام ثابتة ولا ترتيب إجباري. كل مستوى تمرين كامل لوحده، ومبني من تمارين المكتبة.</p>
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
            <ExerciseRow key={exercise.id} exercise={exercise} index={index} onPlay={setVideoExercise} />
          ))}
        </ol>

        <div className="round-note">
          <RotateCcw />
          <div><strong>بعد آخر تمرين</strong><p>خدي راحة من 45 إلى 60 ثانية، اشربي رشفات مية، وابدئي الجولة من الأول. لو جسمك مكتفي، وقّفي عند الجولة الحالية.</p></div>
        </div>

        <div className="cooldown">
          <div className="library-group-heading"><h3>اختمي بالـStretch الخفيف</h3><p>بعد آخر جولة، اثبتي في كل إطالة 20–30 ثانية مع تنفس هادي.</p></div>
          <ol className="exercise-list">
            {cooldown.map((exercise, index) => (
              <ExerciseRow key={exercise.id} exercise={exercise} index={index} onPlay={setVideoExercise} />
            ))}
          </ol>
        </div>
      </section>

      <section className="safety-section">
        <div className="section-heading">
          <h2>تتمرني براحة، مش بعند</h2>
          <p>الحركة المنتظمة أهم من السرعة أو إنك تكمّلي كل الجولات.</p>
        </div>
        <div className="safety-grid">
          <article><HeartPulse /><strong>اختبار الكلام</strong><p>خلي الشدة في مستوى تقدري تتكلمي فيه. لو الكلام بقى صعب، هدي السرعة أو اختاري بديل أخف.</p></article>
          <article><Sparkles /><strong>البطن شغالة طول الوقت</strong><p>شدّي البطن بدرجة خفيفة مع ظهر طويل؛ الهدف ثبات الجذع، مش حبس النفس.</p></article>
          <article><ShieldCheck /><strong>إشارة التوقف</strong><p>وقّفي فورًا مع ألم صدر، دوخة، ضيق نفس شديد أو ألم حاد ومفاجئ.</p></article>
        </div>
      </section>

      <footer><span>Menna Flow</span><small>اختاري الحركة اللي جسمك قادر عليها النهارده.</small></footer>

      <AnimatePresence>
        {videoExercise && (
          <motion.div className="runner-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVideoExercise(null)}>
            <motion.section className="video-dialog" role="dialog" aria-modal="true" aria-label={`فيديو ${videoExercise.name}`} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={(event) => event.stopPropagation()}>
              <button className="runner-close" type="button" onClick={() => setVideoExercise(null)} aria-label="إغلاق الفيديو"><X /></button>
              <h3>{videoExercise.name}</h3>
              <div className="library-video"><LiteVideo key={videoExercise.id} exercise={videoExercise} autoPlay /></div>
              <p>{videoExercise.cue}</p>
              <Alternatives exercise={videoExercise} />
              <VideoLinks exercise={videoExercise} />
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRunnerOpen && (
          <motion.div className="runner-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="runner" role="dialog" aria-modal="true" aria-label="مؤقت التمرين" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <button className="runner-close" type="button" onClick={() => { setRunnerOpen(false); setRunning(false) }} aria-label="إغلاق المؤقت"><X /></button>
              {phase === 'done' ? (
                <div className="runner-complete">
                  <span><Check /></span>
                  <h2>كده تمام يا منّة</h2>
                  <p>كمّلتي {selected.rounds} جولات من {selected.shortName}. اختمي بالإطالة الخفيفة، خدي نفس هادي واشربي مية.</p>
                  <button type="button" onClick={() => resetRunner()}><RotateCcw /> إعادة التمرين</button>
                </div>
              ) : (
                <>
                  <div className="runner-progress"><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
                  <div className="runner-top"><span>الجولة {round} من {selected.rounds}</span><b>{phase === 'work' ? 'وقت الحركة' : 'راحة قصيرة'}</b></div>
                  <div className="runner-stage">
                    <div className="runner-demo"><LiteVideo key={runnerExercise.id} exercise={runnerExercise} /></div>
                    <div className={`timer-face ${phase === 'rest' ? 'is-rest' : ''}`}>
                      <span>{formatTime(secondsLeft)}</span>
                      <small>{phase === 'work' ? runnerExercise.name : `التالي: ${runnerExercise.name}`}</small>
                    </div>
                  </div>
                  <p className="runner-cue">{phase === 'work' ? runnerExercise.cue : nextExercise ? `التالي: ${nextExercise.name}` : 'آخر راحة قبل النهاية'}</p>
                  {phase === 'work' && <Alternatives exercise={runnerExercise} compact />}
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
