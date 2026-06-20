import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Apple, BedDouble, Bike, Check, CircleAlert, Clock3, Droplets, Dumbbell, Flame, Heart, HeartPulse, Leaf, Maximize2, MoonStar, Soup, Target, Wheat, X } from 'lucide-react'
import { exercises, workoutDays, type Exercise } from './data'
import { dayArabic, exerciseArabic, exerciseDetailsArabic, recompositionNutritionGuide as nutritionGuide, ui, type Language } from './i18n'

type Page = 'A' | 'B' | 'C' | 'nutrition'
const pages: Page[] = ['A','B','C','nutrition']
const reveal = { initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{duration:.4} }
const arabicNumbers=(value:string)=>value.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]).replace(/sets/g,'مجموعات').replace(/sec/g,'ثانية').replace(/each leg/g,'لكل رجل').replace(/calories \/ day/g,'سعرة يومياً').replace(/protein/g,'بروتين')

function SectionTitle({ eyebrow,title,copy }: { eyebrow:string; title:string; copy:string }) {
  return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>
}

function ExerciseMedia({ exercise,index,onOpen,language }: { exercise:Exercise; index:number; onOpen:(exercise:Exercise)=>void; language:Language }) {
  const ar=language==='ar',name=ar?exerciseArabic[exercise.id]:exercise.name
  return <button className="exercise-gif interactive" onClick={()=>onOpen(exercise)} aria-label={ar?`فتح عرض ${name}`:`Open ${name} GIF demonstration`}>
    {exercise.gif?<img src={`${import.meta.env.BASE_URL}${exercise.gif.replace(/^\//,'')}`} alt={ar?`عرض حركة ${name}`:`${name} movement demonstration`}/>:<div className="gif-placeholder"><Dumbbell/><span>{ar?'العرض قريباً':'GIF demo coming soon'}</span></div>}
    <span className="exercise-index">{ar?arabicNumbers(String(index+1).padStart(2,'0')):String(index+1).padStart(2,'0')}</span><span className="expand-gif"><Maximize2/></span>
  </button>
}

function ExerciseCard({ exercise,index,language,onOpen }: { exercise:Exercise; index:number; language:Language; onOpen:(exercise:Exercise)=>void }) {
  const t=ui[language], ar=language==='ar'
  const details=exerciseDetailsArabic[exercise.id]
  return <motion.article className="exercise-card detail-card" {...reveal} transition={{duration:.4,delay:index*.04}}>
    <ExerciseMedia exercise={exercise} index={index} onOpen={onOpen} language={language}/>
    <div className="exercise-card-content">
      <div className="exercise-main"><div className="exercise-icon"><Dumbbell/></div><div><span>{ar?details.muscles:exercise.muscles}</span><h3>{ar?exerciseArabic[exercise.id]:exercise.name}</h3></div></div>
      <div className="exercise-stats"><div><Target/><span>{t.sets}<strong>{ar?arabicNumbers(exercise.sets):exercise.sets}</strong></span></div><div><Clock3/><span>{t.rest}<strong>{ar?arabicNumbers(exercise.rest):exercise.rest}</strong></span></div><div><Dumbbell/><span>{t.equipment}<strong>{ar?details.equipment:exercise.equipment}</strong></span></div></div>
      <div className="technique"><span>{t.technique}</span><p>{ar?details.cue:exercise.cue}</p></div>
    </div>
  </motion.article>
}

function NutritionPage({ language }: { language:Language }) {
  const ar=language==='ar',g=nutritionGuide[language]
  const foodIcons=[Dumbbell,Wheat,Leaf,Soup]
  const mealIcons=[Apple,Wheat,Soup,Flame,HeartPulse,MoonStar]
  const lifestyleIcons=[Droplets,BedDouble,MoonStar]
  return <section className="section focused-page nutrition-page-view">
    <SectionTitle eyebrow={g.eyebrow} title={g.title} copy={g.intro}/>

    <div className="nutrition-summary progression-grid">
      {g.progression.map((step,index)=><article className="guide-target-card" key={step.label}><div className={`guide-card-icon ${index===1?'protein':''}`}>{index===0?<Leaf/>:index===1?<Flame/>:<Dumbbell/>}</div><div><span>{step.label}</span><strong dir="ltr">{step.calories}</strong><p>{step.macros}</p><p>{step.meals} · {step.note}</p></div></article>)}
    </div>

    <div className="nutrition-content-section">
      <SectionTitle eyebrow="01" title={g.mealsTitle} copy={g.mealsIntro}/>
      <div className="food-guide-grid meal-options-grid">{g.meals.map((meal,i)=>{const Icon=mealIcons[i];return <article key={meal.title}><div className="food-card-icon"><Icon/></div><span className="meal-time">{meal.time}</span><h3>{meal.title}</h3><strong className="meal-choice-note">{g.chooseOne}</strong><ul>{meal.options.map(option=><li key={option}><Check/>{option}</li>)}</ul></article>})}</div>
    </div>

    <div className="nutrition-content-section">
      <SectionTitle eyebrow="02" title={g.foodsTitle} copy={g.foodsIntro}/>
      <div className="food-guide-grid">{g.foodGroups.map((group,i)=>{const Icon=foodIcons[i];return <article key={group.title}><div className="food-card-icon"><Icon/></div><h3>{group.title}</h3><ul>{group.items.map(item=><li key={item}><Check/>{item}</li>)}</ul></article>})}</div>
    </div>

    <div className="nutrition-content-section digestive-section">
      <div className="digestive-panel"><div className="digestive-heading"><div className="digestive-icon"><HeartPulse/></div><div><span>03</span><h2>{g.tipsTitle}</h2><p>{g.tipsIntro}</p></div></div><div className="digestive-tips">{g.practicalTips.map(tip=><div key={tip}><Check/><span>{tip}</span></div>)}</div></div>
      <aside className="limit-panel"><div><CircleAlert/><span>{g.dailyNotesTitle}</span></div><p>{g.dailyNotesIntro}</p><ul>{g.dailyNotes.map(item=><li key={item}>{item}</li>)}</ul></aside>
    </div>

    <div className="nutrition-content-section">
      <SectionTitle eyebrow="04" title={g.hydrationTitle} copy={g.hydrationIntro}/>
      <div className="hydration-layout"><article className="hydration-feature"><Droplets/><span>{g.hydrationTarget}</span><ul>{g.hydrationTips.map(tip=><li key={tip}><Check/>{tip}</li>)}</ul></article><div className="lifestyle-guide"><h3>{g.lifestyleTitle}</h3><div>{g.lifestyle.map((item,i)=>{const Icon=lifestyleIcons[i];return <article key={item.title}><Icon/><div><span>{item.title}</span><strong>{item.value}</strong><p>{item.text}</p></div></article>})}</div></div></div>
    </div>

    <div className="cardio-callout"><div className="cardio-icon"><Bike/></div><div className="cardio-copy"><span>{ar?'توصية لياقة':'FITNESS RECOMMENDATION'}</span><h2>{g.cardioTitle}</h2><p>{g.cardioLead}</p><div className="cardio-chips">{g.cardioExamples.map(item=><span key={item}>{item}</span>)}</div><div className="cardio-benefits">{g.cardioBenefits.map(item=><div key={item}><Activity/><span>{item}</span></div>)}</div><small>{g.cardioNote}</small></div></div>
  </section>
}

function App() {
  const route=(window.location.hash.replace('#/','')||'A') as Page
  const [page,setPage]=useState<Page>(pages.includes(route)?route:'A')
  const [language,setLanguage]=useState<Language>(()=>localStorage.getItem('menna-language')==='ar'?'ar':'en')
  const [preview,setPreview]=useState<Exercise|null>(null)
  const t=ui[language], ar=language==='ar'

  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=ar?'rtl':'ltr';localStorage.setItem('menna-language',language)},[language,ar])
  useEffect(()=>{if(!pages.includes(route))window.history.replaceState(null,'','#/A')},[])
  useEffect(()=>{const sync=()=>{const next=window.location.hash.replace('#/','') as Page;if(pages.includes(next))setPage(next)};window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[])
  useEffect(()=>{if(!preview)return;const close=(e:KeyboardEvent)=>e.key==='Escape'&&setPreview(null);document.body.style.overflow='hidden';window.addEventListener('keydown',close);return()=>{document.body.style.overflow='';window.removeEventListener('keydown',close)}},[preview])

  const navigate=(next:Page)=>{setPage(next);window.history.replaceState(null,'',`#/${next}`);window.scrollTo({top:0,behavior:'smooth'})}
  const day=workoutDays.find(d=>d.id===page)
  const nav:[Page,string][]=[['A',`${t.day} A`],['B',`${t.day} B`],['C',`${t.day} C`],['nutrition',t.nutrition]]

  return <div className="app-shell routed-app simplified-app" dir={ar?'rtl':'ltr'}>
    <header className="site-header product-header">
      <button className="brand" onClick={()=>navigate('A')} aria-label={ar?'الانتقال إلى اليوم A':'Go to Day A'}><span className="brand-mark"><Heart/></span><span><strong>{ar?'مِنّة':'MENNA'}</strong><small>{ar?'قوة وازدهار':'FIT & FLOURISH'}</small></span></button>
      <nav className="desktop-nav" aria-label={ar?'التنقل الرئيسي':'Primary navigation'}>{nav.map(([id,label])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}>{id==='nutrition'&&<Apple/>}{label}</button>)}</nav>
      <div className="header-actions"><button className="language-toggle" onClick={()=>setLanguage(ar?'en':'ar')} aria-label={ar?'Switch to English':'Switch to Arabic'} aria-live="polite"><span>{ar?'EN':'AR'}</span></button></div>
    </header>

    <AnimatePresence mode="wait"><motion.main key={`${page}-${language}`} className="page-stage" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.26}}>
      {day&&<section className="section focused-page workout-section"><div className="focused-heading"><SectionTitle eyebrow={`${t.day} ${day.id}`} title={ar?dayArabic[day.id].label:day.label} copy={ar?dayArabic[day.id].focus:day.focus}/><div className="workout-count"><strong>{ar?arabicNumbers(String(day.exerciseIds.length)):day.exerciseIds.length}</strong><span>{t.exercises}</span></div></div><div className="exercise-grid">{day.exerciseIds.map((id,i)=><ExerciseCard key={`${day.id}-${id}`} exercise={exercises[id]} index={i} language={language} onOpen={setPreview}/>)}</div><div className="training-note"><Dumbbell/><div><strong>{ar?'اتركي بعض الطاقة في الاحتياط.':'Leave a little in the tank.'}</strong><p>{ar?'اختاري وزناً يسمح لك بإكمال كل التكرارات المحددة بأداء صحيح.':'Choose a weight that lets you finish every prescribed rep with clean form.'}</p></div></div></section>}

      {page==='nutrition'&&<NutritionPage language={language}/>}
    </motion.main></AnimatePresence>

    <AnimatePresence>{preview&&<motion.div className="image-lightbox" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setPreview(null)}><motion.div className="lightbox-dialog" initial={{scale:.96,y:15}} animate={{scale:1,y:0}} exit={{scale:.97}} role="dialog" aria-modal="true" aria-label={ar?exerciseArabic[preview.id]:preview.name} onClick={e=>e.stopPropagation()}><button className="lightbox-close" onClick={()=>setPreview(null)} aria-label={t.closeDemo}><X/></button>{preview.gif?<img src={`${import.meta.env.BASE_URL}${preview.gif.replace(/^\//,'')}`} alt={ar?`عرض حركة ${exerciseArabic[preview.id]}`:`${preview.name} movement demonstration`}/>:<div className="gif-placeholder"><Dumbbell/><span>{ar?'العرض قريباً':'GIF demo coming soon'}</span></div>}<div className="lightbox-caption"><div><span>{ar?exerciseDetailsArabic[preview.id].muscles:preview.muscles}</span><strong>{ar?exerciseArabic[preview.id]:preview.name}</strong></div><div><span>{t.sets}</span><strong>{ar?arabicNumbers(preview.sets):preview.sets}</strong></div><div><span>{t.rest}</span><strong>{ar?arabicNumbers(preview.rest):preview.rest}</strong></div></div></motion.div></motion.div>}</AnimatePresence>
  </div>
}

export default App
