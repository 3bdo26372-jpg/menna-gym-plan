import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Apple, BedDouble, Bike, Check, CircleAlert, Clock3, Droplets, Dumbbell, Flame, Heart, HeartPulse, Leaf, Maximize2, MoonStar, Soup, Target, Wheat, X } from 'lucide-react'
import { exercises, workoutDays, type Exercise, type WorkoutDayId } from './data'
import { dayArabic, exerciseArabic, exerciseDetailsArabic, recompositionNutritionGuide as nutritionGuide, ui, type Language } from './i18n'
import { tipForDay, warmupStretchingPlans, type RoutineItem } from './warmupStretching'

type Page = WorkoutDayId | 'warmup' | 'nutrition'
const pages: Page[] = [...workoutDays.map(day=>day.id),'warmup','nutrition']
const reveal = { initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{duration:.4} }
const arabicNumbers=(value:string)=>value.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]).replace(/sets/g,'مجموعات').replace(/sec/g,'ثانية').replace(/each leg/g,'لكل رجل').replace(/calories \/ day/g,'سعرة يومياً').replace(/protein/g,'بروتين')
const enGuideLabels = { trigger:'How to perform', title:'How to perform', steps:'How to perform', mistakes:'Common mistakes', tips:'Tips', breathing:'Breathing', primary:'Primary muscle', secondary:'Secondary muscles', difficulty:'Difficulty' } as const
const arGuideLabels = { trigger:'طريقة الأداء', title:'طريقة الأداء', steps:'طريقة الأداء', mistakes:'الأخطاء الشائعة', tips:'نصايح مهمة', breathing:'النفس', primary:'العضلة الأساسية', secondary:'عضلات مساعدة', difficulty:'المستوى' } as const

const englishInstructions: Record<string, Exercise['instruction']> = {
  hackSquat:{steps:['Set your back flat against the pad and keep your chest lifted.','Place your feet about shoulder-width on the platform.','Let your knees track in the same direction as your toes.','Lower slowly to a comfortable depth.','Push through your heels and mid-foot without throwing the weight.'],mistakes:['❌ Do not let your knees cave in.','❌ Do not lift your back off the pad.','❌ Do not lock your knees hard at the top.','❌ Do not drop fast into the bottom.'],tips:['Start light while you learn the machine path.','Keep your whole foot planted.','If your knees feel pressure, shorten the depth a little.','Make the lowering phase slower than the push up.'],breathing:['Inhale as you lower.','Exhale as you push the machine up.'],target:{primary:'Quads',secondary:'Glutes, calves, core'},difficulty:'Beginner'},
  hipThrustA:{steps:['Set your upper back on the bench and place your feet under your knees.','Tuck your chin slightly and look forward.','Lower your hips with control.','Drive through your heels until your body forms a straight line.','Squeeze your glutes for a second at the top.'],mistakes:['❌ Do not overarch your lower back.','❌ Do not place your feet too far away.','❌ Do not lift with your chest instead of your hips.','❌ Do not slam the weight down.'],tips:['Think about closing the movement with your glutes.','If you only feel quads, bring your feet a little closer.','Clean reps come before heavier weight.','A short pause at the top makes this work better.'],breathing:['Inhale as you lower.','Exhale as you lift and squeeze your glutes.'],target:{primary:'Glutes',secondary:'Hamstrings, lower-back stability'},difficulty:'Beginner'},
  bulgarianSplitSquat:{steps:['Place one foot behind you on the bench and keep the front foot steady.','Shift most of your weight into the front leg.','Lower straight down, not forward.','Keep the front knee tracking with your toes.','Stand by pushing through the front heel.'],mistakes:['❌ Do not let the front knee cave in.','❌ Do not stand too close to the bench.','❌ Do not push mainly from the back leg.','❌ Do not rush the reps while balancing.'],tips:['Start with bodyweight until balance feels steady.','Lean slightly forward if you want more glute focus.','Give both legs the same reps.','Holding light support is fine at the beginning.'],breathing:['Inhale as you lower.','Exhale as you stand from the front leg.'],target:{primary:'Glutes and quads',secondary:'Hamstrings, core balance'},difficulty:'Beginner'},
  legExtension:{steps:['Sit with your back against the pad.','Set the roller just above your ankles.','Hold the handles and keep your hips down.','Lift until your quads tighten.','Lower slowly without letting the stack drop.'],mistakes:['❌ Do not lift your hips from the seat.','❌ Do not snap your knees hard at the top.','❌ Do not let the weight fall down fast.','❌ Do not turn your toes inward.'],tips:['Move from the knee only.','Pause briefly at the top when the weight is right.','Pick a load that makes the last reps hard but clean.','If your knee hurts, reduce the load and range.'],breathing:['Inhale before the lift at the bottom.','Exhale as you extend your legs.'],target:{primary:'Quads',secondary:'Knee stabilizers'},difficulty:'Beginner'},
  hipAbduction:{steps:['Sit on the machine with your back steady.','Place your legs against the outer pads.','Brace your core and keep your chest up.','Open your knees until you feel the side glutes.','Return slowly without letting the weight hit.'],mistakes:['❌ Do not lean back to force more range.','❌ Do not open fast and return faster.','❌ Do not use a weight that moves your body.','❌ Do not relax completely between reps.'],tips:['Think side glutes opening the legs.','Slow reps will create the burn.','Hold one second at the widest point.','Clean range matters more than the number on the stack.'],breathing:['Inhale as you return to center.','Exhale as you open your legs.'],target:{primary:'Side glutes',secondary:'Outer hip muscles'},difficulty:'Beginner'},
  standingCalfRaise:{steps:['Stand with feet hip-width and hold support if needed.','Keep your knees straight but not aggressively locked.','Rise onto your toes as high as you can.','Pause briefly at the top.','Lower slowly into a gentle calf stretch.'],mistakes:['❌ Do not bounce.','❌ Do not do half reps only.','❌ Do not let your heels roll in or out.','❌ Do not lose control at the bottom.'],tips:['Use a full range even if the weight is lighter.','Rise cleanly and lower slower.','Hold the machine if balance is limiting you.','Calves respond well to calm, high-quality reps.'],breathing:['Inhale as your heels lower.','Exhale as you rise onto your toes.'],target:{primary:'Calves',secondary:'Feet and ankle muscles'},difficulty:'Beginner'},
  latPulldownA:{steps:['Sit down and lock your thighs under the pad.','Hold the bar a little wider than shoulder-width.','Lift your chest and keep shoulders away from your ears.','Pull the bar toward your upper chest using your elbows.','Return up slowly until your back stretches.'],mistakes:['❌ Do not pull behind your neck.','❌ Do not lean far back.','❌ Do not pull only with your hands.','❌ Do not let the weight yank you upward.'],tips:['Imagine your elbows moving toward your pockets.','If your shoulders shrug, lower the weight.','A small pause at the bottom helps you feel your back.','Keep your wrists quiet.'],breathing:['Inhale as the bar rises.','Exhale as you pull down.'],target:{primary:'Lats',secondary:'Upper back, biceps'},difficulty:'Beginner'},
  seatedCableRow:{steps:['Sit with your feet planted on the platform.','Hold the handle and keep your spine tall.','Start by pulling your elbows back.','Bring the handle toward your lower ribs.','Return forward slowly without rounding your back.'],mistakes:['❌ Do not round your back on the return.','❌ Do not rock your whole body back and forth.','❌ Do not shrug your shoulders.','❌ Do not shorten the range because the weight is heavy.'],tips:['Keep your chest open the whole time.','Let the shoulder blades move naturally.','Brace your belly like someone may nudge you.','Pull with elbows, not just hands.'],breathing:['Inhale as the handle moves forward.','Exhale as you pull it toward you.'],target:{primary:'Mid back',secondary:'Lats, biceps, rear delts'},difficulty:'Beginner'},
  chestPressMachine:{steps:['Sit with your full back on the pad.','Set the handles around mid-chest height.','Pull your shoulders down and back.','Press forward until elbows are almost straight.','Return slowly until your chest feels a comfortable stretch.'],mistakes:['❌ Do not let your shoulders roll forward.','❌ Do not lock elbows hard.','❌ Do not let the weight return quickly.','❌ Do not arch your back to press more.'],tips:['Keep wrists stacked over elbows.','Choose a weight you can control on the way back.','Think about bringing the chest in, not only pushing hands.','If your shoulder hurts, shorten the range.'],breathing:['Inhale as the handles come back.','Exhale as you press forward.'],target:{primary:'Chest',secondary:'Triceps, front delts'},difficulty:'Beginner'},
  lateralRaiseA:{steps:['Stand steady with light dumbbells.','Keep a small bend in your elbows.','Raise your arms out to the sides to shoulder height.','Keep shoulders away from ears.','Lower slowly back to your sides.'],mistakes:['❌ Do not shrug up.','❌ Do not swing your body.','❌ Do not raise far above shoulder height.','❌ Do not choose a weight that breaks your form.'],tips:['Lead with your elbows, not your hands.','Light weight is better here.','Brace your core and avoid leaning.','Try to feel the side of the shoulder every rep.'],breathing:['Inhale as you lower the dumbbells.','Exhale as you raise them to the sides.'],target:{primary:'Side delts',secondary:'Upper-back stability'},difficulty:'Beginner'},
  rearDeltFly:{steps:['Sit on the machine or hinge forward with dumbbells.','Keep your chest steady and back long.','Maintain a small elbow bend.','Open your arms back and out with control.','Return without letting the weight hit.'],mistakes:['❌ Do not pull with your neck.','❌ Do not over-straighten your elbows.','❌ Do not swing your torso back.','❌ Do not go too heavy and arch your back.'],tips:['This exercise can feel small; that is normal.','Use a range that feels comfortable for your shoulders.','Think about spreading your hands apart.','A short pause at the back helps you feel rear delts.'],breathing:['Inhale as you return forward.','Exhale as you open your arms.'],target:{primary:'Rear delts',secondary:'Upper back and shoulder blades'},difficulty:'Beginner'},
  cableCurl:{steps:['Stand in front of the cable and hold the bar or rope.','Keep elbows close to your sides.','Curl the handle toward your chest slowly.','Squeeze your biceps briefly at the top.','Lower until arms are almost straight without dropping.'],mistakes:['❌ Do not lean back to lift.','❌ Do not let elbows drift forward.','❌ Do not let the cable pull your arms down.','❌ Do not bend your wrists.'],tips:['Pick a weight that lets elbows stay still.','Lower for about two seconds.','Keep shoulders relaxed down.','If the last reps are hard but clean, the weight fits.'],breathing:['Inhale as you lower.','Exhale as you curl up.'],target:{primary:'Biceps',secondary:'Forearms'},difficulty:'Beginner'},
  pallofPress:{steps:['Stand sideways to the cable with the handle at your chest.','Step away until you feel light tension.','Plant your feet and brace your core.','Press your hands forward slowly.','Bring the handle back without letting your body rotate.'],mistakes:['❌ Do not let the cable twist your waist.','❌ Do not arch your back.','❌ Do not hold your breath.','❌ Do not use so much resistance that you sway.'],tips:['Think of your body as a steady column.','Start with very light resistance.','Give both sides the same reps.','Widen your stance if balance is hard.'],breathing:['Inhale with the handle near your chest.','Exhale as you press forward.'],target:{primary:'Deep core and obliques',secondary:'Shoulders and chest for stability'},difficulty:'Beginner'},
  walkingCardio:{steps:['Start the first 3 minutes easy.','Increase speed or incline gradually.','Keep shoulders relaxed and arms moving naturally.','Walk at a steady pace without jogging.','Cool down for the last 2 minutes.'],mistakes:['❌ Do not start too fast.','❌ Do not use a steep incline if your back or knees complain.','❌ Do not hold the treadmill tightly the whole time.','❌ Do not push until you cannot breathe well.'],tips:['Choose an effort where you can still talk.','Comfortable shoes matter.','If the day feels heavy, keep it to 20 minutes.','Consistency matters more than finishing exhausted.'],breathing:['Breathe through your nose when you can.','Exhale calmly and keep rhythm with your steps.'],target:{primary:'Heart and conditioning',secondary:'Legs and glutes lightly'},difficulty:'Beginner'},
  rdl:{steps:['Stand with the weight in front of your thighs.','Keep a soft bend in your knees.','Push your hips back like closing a door behind you.','Lower the weight close to your legs until hamstrings stretch.','Stand by squeezing glutes and bringing hips forward.'],mistakes:['❌ Do not round your back.','❌ Do not let the weight drift away from your legs.','❌ Do not turn it into a squat.','❌ Do not stare straight down at your feet.'],tips:['Keep your back long and neck in line.','Your range depends on hamstring flexibility.','Start with light dumbbells.','If lower back takes over, reduce the weight.'],breathing:['Inhale as you lower.','Exhale as you stand and squeeze glutes.'],target:{primary:'Hamstrings',secondary:'Glutes, back stability'},difficulty:'Beginner'},
  hipThrustB:{steps:['Set your upper back on the bench and choose a comfortable foot position.','Keep knees roughly over heels at the top.','Lower your hips with control.','Lift until your body is straight.','Squeeze glutes at the top for one count.'],mistakes:['❌ Do not overextend and arch lower back.','❌ Do not let knees move randomly in and out.','❌ Do not push only through your toes.','❌ Do not drop quickly.'],tips:['Keep heels planted.','Use a pad or towel if the bar feels uncomfortable.','If glutes are not working, move feet slightly closer.','Increase weight only after control feels easy.'],breathing:['Inhale as your hips lower.','Exhale as you drive up.'],target:{primary:'Glutes',secondary:'Hamstrings and core stability'},difficulty:'Beginner'},
  seatedLegCurl:{steps:['Sit with your back steady on the machine.','Set the roller behind your ankles.','Lock your thighs under the pad.','Pull your heels down and back until hamstrings contract.','Return slowly without letting the weight hit.'],mistakes:['❌ Do not lift your hips from the seat.','❌ Do not let the weight return fast.','❌ Do not use a tiny range.','❌ Do not pull with toes instead of heels.'],tips:['Think about bringing heels toward the seat.','Make the first rep slow to feel the path.','A short squeeze at the bottom helps.','If you cramp, reduce the weight.'],breathing:['Inhale as your legs return forward.','Exhale as you pull heels back.'],target:{primary:'Hamstrings',secondary:'Calves lightly'},difficulty:'Beginner'},
  walkingLunges:{steps:['Stand tall and step forward.','Lower the back knee toward the floor with control.','Keep the front knee tracking with toes.','Push from the front leg to stand.','Step into the next rep with the same control.'],mistakes:['❌ Do not make the step too short.','❌ Do not bang your knee on the floor.','❌ Do not sway side to side.','❌ Do not push only from the front toes.'],tips:['Start with bodyweight.','Look forward for balance.','If space is tight, do stationary lunges.','Slow clean reps beat fast steps.'],breathing:['Inhale as you lower into the step.','Exhale as you push up.'],target:{primary:'Glutes and quads',secondary:'Hamstrings, calves, balance'},difficulty:'Beginner'},
  cableKickback:{steps:['Attach the cable strap to your ankle.','Hold the machine and lean forward slightly with a flat back.','Keep the standing leg steady.','Drive the working leg back and slightly up.','Return slowly without dropping the weight.'],mistakes:['❌ Do not arch your back to lift higher.','❌ Do not rotate your hips open.','❌ Do not throw the leg back fast.','❌ Do not turn it into a swing.'],tips:['A small clean range is enough.','Squeeze your glute at the end.','Keep toes pointing down or slightly out if comfortable.','If lower back works, reduce the load.'],breathing:['Inhale as the leg returns.','Exhale as you kick back.'],target:{primary:'Glutes',secondary:'Hamstrings and core stability'},difficulty:'Beginner'},
  seatedCalfRaise:{steps:['Sit and place the balls of your feet on the platform.','Keep knees under the pad without too much pressure.','Lower your heels into a comfortable stretch.','Raise your heels as high as possible.','Pause, then lower slowly.'],mistakes:['❌ Do not bounce the weight.','❌ Do not use half range.','❌ Do not place feet in an uncomfortable position.','❌ Do not let heels drop suddenly.'],tips:['Slow reps win here.','Focus on the lower calf.','Use a weight that lets full range happen.','If there is no machine, use a dumbbell on your knees.'],breathing:['Inhale as your heels lower.','Exhale as you raise your heels.'],target:{primary:'Calves',secondary:'Ankles and feet'},difficulty:'Beginner'},
  shoulderPressMachine:{steps:['Sit with your back against the pad.','Hold the handles with elbows under hands.','Brace your core and keep your neck long.','Press up until just before elbow lockout.','Lower to a comfortable level with control.'],mistakes:['❌ Do not arch your back to press.','❌ Do not lock elbows hard.','❌ Do not shrug shoulders toward ears.','❌ Do not cut the range because the weight is heavy.'],tips:['Start with a weight that keeps the path steady.','If shoulders feel irritated, reduce the depth.','Keep elbows slightly in front of the body.','The controlled lowering matters most.'],breathing:['Inhale as you lower the handles.','Exhale as you press up.'],target:{primary:'Shoulders',secondary:'Triceps and upper chest'},difficulty:'Beginner'},
  singleArmCableRow:{steps:['Stand or sit facing the cable with one handle.','Keep your body steady and brace your core.','Let the shoulder stretch forward slightly at the start.','Pull your elbow back toward your side.','Return forward slowly and repeat.'],mistakes:['❌ Do not twist your waist to pull.','❌ Do not shrug your shoulder.','❌ Do not turn it into only a biceps pull.','❌ Do not let the stronger side do extra reps.'],tips:['Start with the weaker side.','Think elbow, not hand.','Keep chest lifted without arching.','A brief pause back helps you feel your back.'],breathing:['Inhale as the handle moves forward.','Exhale as you pull elbow back.'],target:{primary:'Lats and mid back',secondary:'Biceps and rear delts'},difficulty:'Beginner'},
  inclineChestPress:{steps:['Sit on the pec deck with your full back against the pad.','Adjust the seat so your hands line up around chest height.','Keep your chest open and shoulders down.','Bring the handles together in front of you with control.','Open back slowly without letting the machine pull your shoulders.'],mistakes:['❌ Do not shrug your shoulders toward your ears.','❌ Do not lock your elbows completely straight.','❌ Do not let the weight pull you open fast.','❌ Do not squeeze only with your hands while your chest relaxes.'],tips:['Think about your chest bringing your arms together.','Use a moderate weight so the joint does not take over.','Pause briefly when the handles meet.','If your shoulder feels sharp pain, shorten the range and lower the weight.'],breathing:['Inhale as you open your arms back.','Exhale as you bring the handles together.'],target:{primary:'Chest',secondary:'Front delts and shoulder stability'},difficulty:'Beginner'},
  latPulldownB:{steps:['Attach the V-bar to the high pulley and sit tall.','Lock your thighs under the pad so your body stays steady.','Hold the V-bar with relaxed wrists and shoulders down.','Pull the V-bar toward your upper chest using your elbows.','Return slowly until your lats stretch without letting the weight yank you.'],mistakes:['❌ Do not pull the handle toward your stomach.','❌ Do not lean far back to finish the rep.','❌ Do not shrug your shoulders up.','❌ Do not let the weight pull your arms up aggressively.'],tips:['Think elbows down beside your body.','A small pause at the bottom helps you feel your back.','If you only feel arms, lower the weight.','Keep the grip comfortable and wrists quiet.'],breathing:['Inhale as the V-bar rises.','Exhale as you pull it down toward your chest.'],target:{primary:'Lats',secondary:'Upper back and biceps'},difficulty:'Beginner'},
  ropeTricepsPushdown:{steps:['Stand in front of the cable and hold the rope.','Keep elbows close to your sides.','Lean slightly forward if you need balance.','Press the rope down until arms are almost straight.','Open the rope slightly at the bottom and return slowly.'],mistakes:['❌ Do not move elbows forward and back.','❌ Do not shrug shoulders.','❌ Do not lock elbows hard.','❌ Do not let the weight fly up.'],tips:['Squeeze triceps for a second at the bottom.','Medium weight beats moving your whole body.','Keep wrists steady and comfortable.','Press strong, return slow.'],breathing:['Inhale as the rope returns up.','Exhale as you press down.'],target:{primary:'Triceps',secondary:'Forearms and shoulder stability'},difficulty:'Beginner'},
  lateralRaiseB:{steps:['Hold dumbbells at your sides with elbows slightly bent.','Lean forward just a tiny bit if it feels better.','Raise arms to the sides with control.','Stop at shoulder height.','Lower on the same path without dropping.'],mistakes:['❌ Do not raise forward instead of sideways.','❌ Do not use your legs to throw the weight.','❌ Do not shrug toward your ears.','❌ Do not rush just to finish.'],tips:['Count about two seconds on the way down.','Stop when your form changes.','Keep your neck relaxed.','Side delts grow from consistency, not heavy swinging.'],breathing:['Inhale as you lower.','Exhale as you raise to the sides.'],target:{primary:'Side delts',secondary:'Upper traps lightly'},difficulty:'Beginner'},
  plank:{steps:['Place elbows under shoulders on the floor.','Step your feet back and lift your body.','Brace your belly like zipping it up.','Keep hips neither too high nor sagging.','Hold while breathing calmly.'],mistakes:['❌ Do not let your lower back sag.','❌ Do not lift hips too high.','❌ Do not hold your breath.','❌ Do not look too far forward and strain your neck.'],tips:['Start with a clean 30 seconds.','Drop to knees if needed.','Press the floor away with your elbows.','Stop when form breaks, not when you are completely exhausted.'],breathing:['Take short calm breaths while holding.','Exhale slowly and keep your core tight.'],target:{primary:'Deep core',secondary:'Glutes and shoulders'},difficulty:'Beginner'},
  sidePlank:{steps:['Lie on your side with elbow under shoulder.','Stack your feet or place one foot in front.','Lift your hips off the floor.','Brace your core and make a straight line.','Hold, then switch sides.'],mistakes:['❌ Do not let hips drop.','❌ Do not place elbow far from shoulder.','❌ Do not rotate your chest toward the floor.','❌ Do not hold your breath.'],tips:['Bend the bottom knee if it is too hard.','Look forward and relax your neck.','Let the bottom side of your waist hold you up.','Quality matters more than forcing the full time.'],breathing:['Breathe calmly while holding.','Exhale slowly and keep your belly tight.'],target:{primary:'Obliques',secondary:'Side glutes and shoulder'},difficulty:'Beginner'},
  deadBug:{steps:['Lie on your back with arms and legs up.','Press your lower back into the floor.','Lower opposite arm and leg slowly.','Return to center without letting your back lift.','Switch sides and keep the same control.'],mistakes:['❌ Do not let lower back arch.','❌ Do not rush.','❌ Do not lower the leg farther than you can control.','❌ Do not forget to breathe.'],tips:['If your back lifts, shorten the leg range.','The slow movement is the exercise.','Keep your neck relaxed on the floor.','Give both sides the same attention.'],breathing:['Inhale as you return to center.','Exhale as you lower arm and leg.'],target:{primary:'Deep core',secondary:'Hip flexors and pelvic control'},difficulty:'Beginner'},
  birdDog:{steps:['Start on hands and knees.','Place hands under shoulders and knees under hips.','Brace your core and keep your back flat.','Reach opposite arm and leg long.','Return to center and switch without wobbling.'],mistakes:['❌ Do not arch your back as the leg lifts.','❌ Do not rotate your hips open.','❌ Do not lift the leg higher than your body.','❌ Do not rush and lose balance.'],tips:['Imagine a cup of water on your back.','Reach long, not high.','If it is hard, start with legs only.','Keep every rep calm and steady.'],breathing:['Inhale before reaching.','Exhale as you extend arm and leg.'],target:{primary:'Core and back stability',secondary:'Glutes and shoulders'},difficulty:'Beginner'},
  reverseCrunch:{steps:['Lie on your back with knees bent.','Place hands on the floor beside you.','Bring knees toward your chest.','Lift your hips slightly from the floor.','Lower slowly without dropping your legs.'],mistakes:['❌ Do not swing your legs hard.','❌ Do not pull from your neck.','❌ Do not slam your lower back down.','❌ Do not use a range that hurts your back.'],tips:['The movement is small and focused.','Think abs curling the hips up.','If it is hard, reduce the lowering range.','Slow reps help you feel your abs.'],breathing:['Inhale as you lower your hips.','Exhale as you lift knees and hips.'],target:{primary:'Lower abs',secondary:'Deep core and hip flexors'},difficulty:'Beginner'},
  hollowHold:{steps:['Lie on your back and press lower back into the floor.','Lift shoulders slightly.','Raise legs or bend knees for the easier tuck version.','Keep core tight with arms overhead or by your sides.','Hold without letting your back arch.'],mistakes:['❌ Do not let your back arch.','❌ Do not pull your neck with your hands.','❌ Do not choose a version that breaks form.','❌ Do not hold your breath.'],tips:['Start with Hollow Tuck and bent knees.','As you get stronger, straighten legs more.','If your back lifts, stop and choose the easier version.','A clean 20 seconds beats a bad 40 seconds.'],breathing:['Take short breaths while holding.','Exhale slowly while pulling your belly down.'],target:{primary:'Front and deep core',secondary:'Hip flexors and pelvic control'},difficulty:'Beginner'},
}

function guideFor(exercise: Exercise, language: Language) {
  return language==='ar' ? exercise.instruction : (englishInstructions[exercise.id] ?? exercise.instruction)
}

const englishCues: Record<string, string> = {
  hackSquat:'Keep your whole back on the pad, plant your feet, and lower slowly without letting your knees cave in.',
  hipThrustA:'Keep your upper back fixed, tuck your chin slightly, and lift by squeezing your glutes instead of arching your back.',
  bulgarianSplitSquat:'Keep the front foot steady, lower the back knee down, and stand by pushing through the front heel.',
  legExtension:'Keep your back pinned to the seat and lift from the front of your thighs without kicking or dropping the weight.',
  hipAbduction:'Open your legs with control while your torso stays still, without leaning back to force the range.',
  standingCalfRaise:'Rise through a full range, pause at the top, then lower into a gentle stretch without bouncing.',
  latPulldownA:'Pull your elbows down toward your sides, keep your chest lifted, and avoid leaning far back.',
  seatedCableRow:'Sit tall, pull the handle toward your lower ribs, and let your shoulders move without rounding your back.',
  chestPressMachine:'Keep your shoulders down and back, press smoothly, and stop before locking your elbows hard.',
  lateralRaiseA:'Use light dumbbells, raise out to the sides with soft elbows, and keep your shoulders away from your ears.',
  rearDeltFly:'Open from the back of your shoulders with a steady chest, without shrugging or swinging.',
  cableCurl:'Keep your elbows close to your sides and curl the cable without leaning back.',
  pallofPress:'Brace your core and press straight forward without letting the cable twist your waist.',
  rdl:'Push your hips back with the weight close to your legs, then stand when your hamstrings stretch.',
  hipThrustB:'Keep your ribs down, drive through your heels, and finish by squeezing your glutes without overextending.',
  seatedLegCurl:'Keep your thighs pinned down and pull your heels back with control instead of letting the weight snap.',
  walkingLunges:'Step into a stable stance, lower straight down, and stand by pushing through the front foot.',
  cableKickback:'Keep your torso steady and drive the leg back from the glute, not your lower back.',
  seatedCalfRaise:'Lift your heels high, pause briefly, then lower slowly into a controlled calf stretch.',
  shoulderPressMachine:'Keep your back on the pad, press overhead smoothly, and do not shrug your shoulders up.',
  singleArmCableRow:'Pull the elbow back beside your body while your torso stays steady and square.',
  inclineChestPress:'Keep your chest open and bring the handles together smoothly without shrugging your shoulders.',
  latPulldownB:'Use the V-bar to pull toward your upper chest with your elbows, not just your hands.',
  ropeTricepsPushdown:'Keep your elbows fixed beside your ribs and press the rope down without moving your whole body.',
  lateralRaiseB:'Raise the dumbbells smoothly to the sides with light weight and no swinging.',
  plank:'Hold one straight line from head to heels with your core and glutes tight.',
  sidePlank:'Keep your elbow under your shoulder and lift your hips without rolling forward.',
  deadBug:'Press your lower back into the floor and move opposite arm and leg slowly.',
  birdDog:'Reach opposite arm and leg long while keeping your hips square and steady.',
  reverseCrunch:'Curl your hips up from your lower abs instead of swinging your legs.',
  hollowHold:'Press your lower back down and choose the tuck version if your form starts to change.',
}

function cueFor(exercise: Exercise, language: Language) {
  return language==='ar' ? exerciseDetailsArabic[exercise.id].cue : (englishCues[exercise.id] ?? exercise.cue)
}

function SectionTitle({ eyebrow,title,copy }: { eyebrow:string; title:string; copy:string }) {
  return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>
}

type RoutineCopy = Omit<RoutineItem,'id'|'gif'>

const englishRoutineText: Record<string,RoutineCopy> = {
  walking:{name:'Walking',metric:'60 sec',target:'Heart and legs',steps:['Start with an easy walk in place or on the treadmill.','Keep your shoulders relaxed and let your arms move naturally.','Build the pace a little without turning it into a run.'],mistakes:['Do not start too fast.','Do not stiffen your body while walking.'],tip:'The goal is to wake your body up, not tire yourself out early.',breathing:'Breathe calmly and keep an easy rhythm with your steps.'},
  hipCircles:{name:'Hip Circles',metric:'30 sec each way',target:'Hips and glutes',steps:['Stand with your feet about hip-width apart.','Put your hands on your waist and draw small circles with your hips.','Make the circle a little bigger only if it feels comfortable.'],mistakes:['Do not move from your lower back instead of your hips.','Do not rush the circles.'],tip:'Keep the motion smooth, like you are loosening the joint gently.',breathing:'Keep breathing normally and do not hold your breath.'},
  legSwings:{name:'Leg Swings',metric:'10 reps each leg',target:'Hamstrings and hips',steps:['Hold a wall or machine for balance.','Swing one leg forward and back through a comfortable range.','Switch legs and repeat with the same control.'],mistakes:['Do not throw the leg hard.','Do not arch your back just to swing higher.'],tip:'Let the range grow gradually, not from the first rep.',breathing:'Exhale lightly as the leg swings forward.'},
  bodyweightSquat:{name:'Bodyweight Squat',metric:'10 reps',target:'Quads and glutes',steps:['Set your feet about shoulder-width apart.','Sit your hips back like you are reaching for a chair.','Stand up smoothly and keep your knees tracking with your toes.'],mistakes:['Do not let your knees cave inward.','Do not drop fast and bounce up.'],tip:'Keep your heels planted through the whole movement.',breathing:'Inhale as you go down, exhale as you stand.'},
  gluteBridge:{name:'Glute Bridge',metric:'12 reps',target:'Glutes and lower back',steps:['Lie on your back and bend your knees.','Keep your heels close enough to your glutes.','Lift your hips until your body forms one line.'],mistakes:['Do not overarch your lower back.','Do not let your knees flare out too much.'],tip:'Squeeze your glutes for one second at the top.',breathing:'Exhale as you lift your hips.'},
  worldsGreatest:{name:"World's Greatest Stretch",metric:'3 reps each side',target:'Hips, back, and chest',steps:['Take a long step forward into a lunge position.','Place your hand next to the front foot.','Rotate your chest gently toward the front leg.'],mistakes:['Do not force a painful range.','Do not let the front knee collapse inward.'],tip:'Move slowly. This is prep, not a race.',breathing:'Inhale before the rotation, then exhale as you open your chest.'},
  armCircles:{name:'Arm Circles',metric:'30 sec',target:'Shoulders',steps:['Reach your arms out to the sides.','Make small circles forward.','Halfway through, reverse the direction.'],mistakes:['Do not shrug your shoulders toward your ears.','Do not start with huge circles.'],tip:'Keep your neck long and your shoulders soft.',breathing:'Breathe normally while your arms move.'},
  shoulderRolls:{name:'Shoulder Rolls',metric:'10 forward + 10 backward',target:'Neck and shoulders',steps:['Stand tall with your arms relaxed.','Roll your shoulders forward slowly.','Then roll them backward with the same calm pace.'],mistakes:['Do not tense your neck.','Do not rush through the circles.'],tip:'Feel the shoulders loosening one circle at a time.',breathing:'Inhale as the shoulders rise, exhale as they roll down.'},
  bandPullApart:{name:'Band Pull Apart',metric:'12 reps',target:'Upper back and rear shoulders',steps:['Hold the band in front of your chest.','Pull your hands apart until the band comes near your chest.','Return slowly without letting the band snap back.'],mistakes:['Do not shrug up.','Do not bend your wrists hard.'],tip:'Pull from your shoulder blades, not just your hands.',breathing:'Exhale as you open the band.'},
  wallSlides:{name:'Wall Slides',metric:'10 reps',target:'Shoulders and shoulder blades',steps:['Stand with your back against a wall.','Set your arms in a W shape.','Slide your hands up and down with control.'],mistakes:['Do not arch your back away from the wall.','Do not push through shoulder pinching.'],tip:'A clean small range is better than a big messy range.',breathing:'Inhale as you lower, exhale as you slide up.'},
  catCow:{name:'Cat-Cow',metric:'6 slow reps',target:'Back and neck',steps:['Set up on your hands and knees.','Round your back upward slowly.','Open your chest and let your back move gently the other way.'],mistakes:['Do not jerk your neck quickly.','Do not move only from your waist.'],tip:'Let the movement travel through your whole spine.',breathing:'Inhale as you open your chest, exhale as you round your back.'},
  scapularRetraction:{name:'Scapular Retraction',metric:'10 reps',target:'Shoulder blades',steps:['Sit or stand tall.','Pull your shoulder blades back like you are bringing them together.','Let them return forward slowly.'],mistakes:['Do not lift your shoulders up.','Do not push your chest too hard.'],tip:'It is a small move, but it helps your back and chest exercises feel better.',breathing:'Exhale as you pull your shoulder blades back.'},
  birdDogWarm:{name:'Bird Dog',metric:'8 reps each side',target:'Core and back stability',steps:['Start on your hands and knees.','Reach the opposite arm and leg long.','Return to the middle and switch sides.'],mistakes:['Do not let your hips rotate.','Do not lift the leg higher than your body.'],tip:'Imagine there is a cup of water sitting on your back.',breathing:'Exhale as you reach the arm and leg.'},
  deadBugWarm:{name:'Dead Bug',metric:'8 reps',target:'Deep core',steps:['Lie on your back with arms and legs lifted.','Press your lower back gently into the floor.','Lower the opposite arm and leg slowly.'],mistakes:['Do not let your lower back arch.','Do not rush just to finish.'],tip:'If your back lifts, make the leg range shorter.',breathing:'Exhale as you lower the arm and leg.'},
  hipRotation:{name:'Hip Rotation',metric:'30 sec',target:'Hips and glutes',steps:['Stand steady, or kneel if that feels easier.','Move your hip through a comfortable circle.','Switch direction halfway through.'],mistakes:['Do not force the joint into a big range.','Do not forget to brace your core lightly.'],tip:'Think of it as opening the joint, not stretching hard.',breathing:'Breathe calmly through the whole movement.'},
  thoracicRotation:{name:'Thoracic Rotation',metric:'6 reps each side',target:'Upper back and chest',steps:['Start on your hands and knees.','Place one hand behind your head.','Open your elbow upward and rotate your chest gently.'],mistakes:['Do not rotate from your hips.','Do not pull your neck with your hand.'],tip:'Let your eyes follow your elbow so the rotation stays smooth.',breathing:'Inhale before the turn, exhale as you open.'},
  hamstringStretch:{name:'Hamstring Stretch',metric:'20-30 sec',duration:'twice',target:'Hamstrings',steps:['Sit down and extend one leg forward.','Lean from your hips toward the extended leg.','Stop when you feel a comfortable stretch.'],mistakes:['Do not pull aggressively.','Do not bounce while stretching.'],breathing:'Take a calm breath in and let it out slowly.',benefit:'Helps the back of the thigh settle after lower-body work and reduces that tight feeling.'},
  quadStretch:{name:'Quad Stretch',metric:'20-30 sec',duration:'twice each leg',target:'Quads',steps:['Stand and hold one foot behind you.','Bring your heel gently toward your glutes.','Keep your knees close together.'],mistakes:['Do not arch your back.','Do not pull the leg into pain.'],breathing:'Breathe calmly and let the leg relax as you exhale.',benefit:'Helps the front of the thigh relax after squats and lunges.'},
  hipFlexorStretch:{name:'Hip Flexor Stretch',metric:'20-30 sec',duration:'twice each side',target:'Front of the hip',steps:['Kneel with one knee down and the other foot forward.','Shift your hips forward a little.','Keep your chest lifted without arching your back.'],mistakes:['Do not shove your hips forward hard.','Do not let your lower back arch.'],breathing:'Exhale as you let the hips soften forward.',benefit:'Useful after lower-body and core sessions because it eases the front of the hips.'},
  gluteStretch:{name:'Glute Stretch',metric:'20-30 sec',duration:'twice each side',target:'Glutes',steps:['Lie on your back.','Cross one ankle over the other leg like a figure four.','Pull the legs gently toward your chest.'],mistakes:['Do not yank from the knee.','Do not lift your neck off the floor.'],breathing:'Breathe slowly while you hold the position.',benefit:'Helps the glutes calm down after hip thrusts and lunges.'},
  calfStretch:{name:'Calf Stretch',metric:'20-30 sec',duration:'twice each leg',target:'Calves',steps:['Step one foot back or place it against a wall.','Keep the heel down.','Lean forward slightly until you feel the calf stretch.'],mistakes:['Do not lift the heel.','Do not bounce in the stretch.'],breathing:'Keep the breath easy and let each exhale release tension.',benefit:'Helps calf tightness after raises, walking, and lunges.'},
  chestStretch:{name:'Chest Stretch',metric:'20-30 sec',duration:'twice',target:'Chest',steps:['Place one hand on a wall or doorway.','Turn your body gently away from that hand.','Stop at a comfortable chest stretch.'],mistakes:['Do not roll your shoulder forward.','Do not twist quickly.'],breathing:'Inhale to open the chest, then exhale slowly.',benefit:'Helps the chest return to neutral after pressing and pec deck work.'},
  latStretch:{name:'Lat Stretch',metric:'20-30 sec',duration:'twice each side',target:'Side back',steps:['Hold a wall or post with one hand.','Shift your body back a little.','Lean to the side until you feel your lat stretch.'],mistakes:['Do not pull the shoulder aggressively.','Do not hold your breath.'],breathing:'Exhale as you let the side of your back lengthen.',benefit:'Helpful after pulldowns and rows so your back can relax.'},
  shoulderStretch:{name:'Shoulder Stretch',metric:'20-30 sec',duration:'twice each side',target:'Shoulders',steps:['Bring one arm across your chest.','Use the other hand to guide it gently toward your body.','Keep the shoulder down and relaxed.'],mistakes:['Do not shrug toward your ear.','Do not pull hard from the elbow.'],breathing:'Breathe calmly and relax the shoulder as you exhale.',benefit:'Helps the shoulders settle after raises and presses.'},
  tricepsStretch:{name:'Triceps Stretch',metric:'20-30 sec',duration:'twice each arm',target:'Triceps',steps:['Reach one arm overhead and bend the elbow.','Place the hand behind your head.','Guide the elbow gently with the other hand.'],mistakes:['Do not arch your back.','Do not pull the elbow hard.'],breathing:'Breathe easily and keep the shoulder soft.',benefit:'Eases the triceps after rope pushdowns and pressing.'},
  upperTrapStretch:{name:'Upper Trap Stretch',metric:'20 sec',duration:'twice each side',target:'Side neck and upper shoulder',steps:['Sit tall.','Tilt one ear gently toward the same-side shoulder.','Keep the opposite shoulder relaxed down.'],mistakes:['Do not yank your head with your hand.','Do not lift the opposite shoulder.'],breathing:'Inhale calmly and exhale while relaxing your neck.',benefit:'Helps reduce neck and upper-shoulder tension after upper-body work.'},
  cobraStretch:{name:'Cobra Stretch',metric:'20 sec',duration:'twice',target:'Abs and front body',steps:['Lie on your stomach.','Place your hands under your shoulders.','Lift your chest a little without forcing your lower back.'],mistakes:['Do not lift too high if your back feels uncomfortable.','Do not throw your neck backward.'],breathing:'Inhale as the chest opens, then exhale slowly.',benefit:'Helps the abs relax after core training.'},
  childsPose:{name:"Child's Pose",metric:'30 sec',duration:'once or twice',target:'Back and hips',steps:['Kneel on the floor.','Sit your hips back toward your heels.','Reach your arms forward and let your back lengthen.'],mistakes:['Do not press into painful knees.','Do not tense your shoulders up.'],breathing:'Take long calm breaths and relax more with each exhale.',benefit:'Calms the back and breathing after core work.'},
  seatedTwist:{name:'Seated Twist',metric:'20 sec',duration:'twice each side',target:'Back and sides',steps:['Sit tall with your legs comfortable.','Rotate your chest to one side.','Return to the center and switch sides.'],mistakes:['Do not twist aggressively.','Do not round your back.'],breathing:'Inhale in the center, then exhale as you rotate.',benefit:'Helps the back and sides loosen after stability work.'},
  catCowCool:{name:'Slow Cat-Cow',metric:'5 breaths',duration:'once',target:'Back and neck',steps:['Start on your hands and knees.','Move very slowly through the cat-cow pattern.','Pause for a second in each position and let your breath lead.'],mistakes:['Do not rush.','Do not move into a painful range.'],breathing:'Inhale as you open your chest, exhale as you round your back.',benefit:'Lets your back calm down after core without adding pressure.'},
}

const routineLabels = {
  ar:{open:'اعرف الطريقة',close:'اقفلي الطريقة',method:'طريقة الأداء',duration:'المدة',breathing:'النفس',mistakes:'أخطاء شائعة',tip:'نصيحة',benefit:'فايدته',today:'نصيحة النهارده',demo:'العرض قريباً',alt:'عرض'},
  en:{open:'Learn how',close:'Close guide',method:'How to do it',duration:'Duration',breathing:'Breathing',mistakes:'Common mistakes',tip:'Tip',benefit:'Benefit',today:"Today's tip",demo:'Demo coming soon',alt:'Demo for'},
} as const

const englishStretchingTips = [
  'Stretching should never feel painful.',
  'Breathing matters as much as the movement.',
  'Quality is more important than speed.',
  'Your body needs warm-up before training and a calm cooldown after.',
  'If you feel joint pain, stop right away.',
]

function routineFor(item:RoutineItem, language:Language): RoutineItem {
  return language==='ar' ? item : {...item,...(englishRoutineText[item.id] ?? {})}
}

function dailyRoutineTip(dayId:WorkoutDayId, language:Language) {
  if(language==='ar') return tipForDay(dayId)
  const seed=Math.floor(new Date().getTime()/86400000)+Number(dayId)
  return englishStretchingTips[seed%englishStretchingTips.length]
}

function RoutineMedia({ item,language,onOpen }: { item:RoutineItem; language:Language; onOpen:(item:RoutineItem)=>void }) {
  const labels=routineLabels[language]
  return <button className="routine-gif interactive" onClick={()=>onOpen(item)} aria-label={`${labels.alt} ${item.name}`}>
    {item.gif?<img src={`${import.meta.env.BASE_URL}${item.gif.replace(/^\//,'')}`} alt={`${labels.alt} ${item.name}`}/>:<div className="gif-placeholder"><Activity/><span>{labels.demo}</span></div>}
    <span className="expand-gif"><Maximize2/></span>
  </button>
}

function RoutineCard({ item,kind,index,language,onOpen }: { item:RoutineItem; kind:'warmup'|'stretch'; index:number; language:Language; onOpen:(item:RoutineItem)=>void }) {
  const [open,setOpen]=useState(false)
  const copy=routineFor(item,language)
  const labels=routineLabels[language]
  return <motion.article className="routine-card" {...reveal} transition={{duration:.35,delay:index*.03}}>
    <RoutineMedia item={copy} language={language} onOpen={onOpen}/>
    <div className="routine-card-body">
      <div className="routine-card-head">
        <span>{copy.target}</span>
        <h3>{copy.name}</h3>
      </div>
      <div className="routine-meta">
        <div><Clock3/><strong>{copy.metric}</strong></div>
        <div><Target/><strong>{copy.target}</strong></div>
      </div>
      <button className="instruction-trigger routine-trigger" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?labels.close:labels.open}</button>
      <AnimatePresence initial={false}>{open&&<motion.div className="routine-details" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.22}}>
        <section><h4>{labels.method}</h4><ul>{copy.steps.map(step=><li key={step}><Check/><span>{step}</span></li>)}</ul></section>
        {kind==='stretch'&&copy.duration&&<section><h4>{labels.duration}</h4><p>{copy.metric}, {copy.duration}.</p></section>}
        <section><h4>{labels.breathing}</h4><p>{copy.breathing}</p></section>
        <section><h4>{labels.mistakes}</h4><ul>{copy.mistakes.map(mistake=><li key={mistake}><span>{mistake}</span></li>)}</ul></section>
        {kind==='warmup'?<section><h4>{labels.tip}</h4><p>{copy.tip}</p></section>:<section><h4>{labels.benefit}</h4><p>{copy.benefit}</p></section>}
      </motion.div>}</AnimatePresence>
    </div>
  </motion.article>
}

function WarmupMobility({ dayId,language,onOpenRoutine }: { dayId:WorkoutDayId; language:Language; onOpenRoutine:(item:RoutineItem)=>void }) {
  const plan=warmupStretchingPlans[dayId]
  const ar=language==='ar'
  return <div className={`warm-system warm-before ${ar?'':'english'}`} dir={ar?'rtl':'ltr'}>
    <SectionTitle eyebrow={ar?'تسخين واسترتش · 🔥 قبل التمرين':'Warm-up & Stretching · 🔥 Before Workout'} title={ar?'تسخين وحركة':'Warm-up & Mobility'} copy={ar?'٥-٨ دقايق بس قبل التمرين. حركة خفيفة تجهز جسمك من غير ما تستهلك طاقتك.':'5-8 minutes before training. Light movement that prepares your body without draining your energy.'}/>
    <div className="warm-info-grid">
      <article><span>{ar?'ليه بنعمل Warm-up؟':'Why warm up?'}</span><p>{ar?'قبل التمرين جسمك بيكون لسه بارد، فمحتاجين نصحي العضلات ونجهز المفاصل للحركة عشان الأداء يبقى أحسن ونقلل فرص الإصابة.':'Before training, your body is still cold. We wake up the muscles and prepare the joints so performance feels better and injury risk goes down.'}</p></article>
      <article><span>{ar?'القاعدة المهمة':'Important rule'}</span><p>{ar?'قبل التمرين محتاجين حركة، مش شد ثابت. الحركة بتخلي العضلات جاهزة وتشغل الدورة الدموية.':'Before training we need movement, not long static holds. Movement gets the muscles ready and increases blood flow.'}</p><strong>✅ Dynamic Mobility · ❌ Static Stretching</strong></article>
    </div>
    <div className="routine-grid">{plan.warmup.map((item,index)=><RoutineCard key={item.id} item={item} kind="warmup" index={index} language={language} onOpen={onOpenRoutine}/>)}</div>
  </div>
}

function RecoveryStretch({ dayId,language,onOpenRoutine }: { dayId:WorkoutDayId; language:Language; onOpenRoutine:(item:RoutineItem)=>void }) {
  const plan=warmupStretchingPlans[dayId]
  const ar=language==='ar'
  const labels=routineLabels[language]
  return <div className={`warm-system recovery-stretch ${ar?'':'english'}`} dir={ar?'rtl':'ltr'}>
    <SectionTitle eyebrow={ar?'تسخين واسترتش · 🧘 بعد التمرين':'Warm-up & Stretching · 🧘 After Workout'} title={ar?'استرتش وتهدئة':'Recovery Stretch'} copy={ar?'٣-٦ دقايق بعد ما تخلصي. هنا بنهدي الجسم ونساعد العضلات ترجع لطبيعتها.':'3-6 minutes after training. This helps your body calm down and lets the muscles return to normal.'}/>
    <div className="warm-info-grid">
      <article><span>{ar?'ليه بنعمل Stretch بعد التمرين؟':'Why stretch after training?'}</span><p>{ar?'بعد التمرين العضلات بتكون سخنة، وده أفضل وقت نعمل شد ثابت يساعد الجسم يهدى ويحافظ على المرونة.':'After training, the muscles are warm. This is the best time for steady holds that help the body calm down and maintain flexibility.'}</p></article>
      <article><span>{ar?'القاعدة المهمة':'Important rule'}</span><p>{ar?'بعد التمرين مش محتاجين نصحي العضلات، إحنا دلوقتي بنساعدها تهدى وترجع لطبيعتها.':'After training we are not trying to wake the muscles up. Now we are helping them relax and return to normal.'}</p><strong>✅ Static Stretching · ❌ Dynamic Mobility</strong></article>
    </div>
    <div className="routine-grid stretch-grid">{plan.stretch.map((item,index)=><RoutineCard key={item.id} item={item} kind="stretch" index={index} language={language} onOpen={onOpenRoutine}/>)}</div>
    <aside className={`training-note stretch-tip ${ar?'':'english'}`}><HeartPulse/><div><strong>{labels.today}</strong><p>{dailyRoutineTip(dayId,language)}</p></div></aside>
  </div>
}

const warmupDayOptions: { id:WorkoutDayId; label:string; group:string; arCopy:string; enCopy:string }[] = [
  { id:'1', label:'Lower A', group:'Lower', arCopy:'ده يوم Lower. التسخين هنا بيجهز الحوض والمؤخرة والركب قبل الرجل، والاسترتش بعده بيفك الفخذ والورك براحة.', enCopy:'Lower-day prep for hips, glutes, and knees before training, then easy lower-body recovery stretching after.' },
  { id:'2', label:'Upper A', group:'Upper', arCopy:'ده يوم Upper. نجهز الكتف ولوح الكتف والضهر قبل السحب والدفع، وبعد التمرين نفك الصدر واللاتس والكتف.', enCopy:'Upper-day prep for shoulders, shoulder blades, and back before pulling and pressing, then chest, lat, and shoulder recovery.' },
  { id:'4', label:'Lower B', group:'Lower', arCopy:'ده يوم Lower. التركيز هنا أكتر على المؤخرة والهامسترنج، فالتسخين يفتح الحوض والاسترتش يهدي الرجل بعد الشغل.', enCopy:'Lower-day prep with more glute and hamstring focus, followed by calm lower-body stretching.' },
  { id:'5', label:'Upper B', group:'Upper', arCopy:'ده يوم Upper. هنصحى الكتف والضهر والصدر قبل التمرين، وبعده نفك الترايسبس والرقبة والصدر بهدوء.', enCopy:'Upper-day prep for shoulders, back, and chest, followed by triceps, neck, and chest recovery.' },
  { id:'6', label:'Core Home', group:'Core', arCopy:'ده يوم Core. التسخين بسيط عشان الظهر والبطن يثبتوا، والاسترتش بعده يساعد الجسم يهدى من غير ضغط.', enCopy:'Core-day prep for back and trunk control, followed by gentle recovery stretching.' },
]

function WarmupStretchingPage({ language,onOpenRoutine }: { language:Language; onOpenRoutine:(item:RoutineItem)=>void }) {
  const [selected,setSelected]=useState<WorkoutDayId>('1')
  const ar=language==='ar'
  const option=warmupDayOptions.find(item=>item.id===selected) ?? warmupDayOptions[0]
  return <section className="section focused-page warm-page">
    <div className="focused-heading warm-page-heading">
      <SectionTitle eyebrow={ar?'تسخين واسترتش':'Warm-up & Stretching'} title={ar?'تسخين واسترتش':'Warm-up & Stretching'} copy={ar?'اختاري نوع اليوم من هنا: Upper أو Lower أو Core، وخدي التسخين قبل التمرين والاسترتش بعده.':'Choose the workout type here: Upper, Lower, or Core. Use the warm-up before training and the stretch after.'}/>
    </div>
    <div className="warm-day-tabs" role="tablist" aria-label={ar?'اختيار نوع اليوم':'Choose workout type'}>
      {warmupDayOptions.map(item=><button key={item.id} type="button" className={selected===item.id?'active':''} aria-selected={selected===item.id} onClick={()=>setSelected(item.id)}>
        <span>{item.group}</span>
        <strong>{item.label}</strong>
      </button>)}
    </div>
    <aside className={`training-note warm-day-note ${ar?'':'english'}`}><HeartPulse/><div><strong>{ar?`ده تجهيز يوم ${option.group}`:`${option.label} prep`}</strong><p>{ar?option.arCopy:option.enCopy}</p></div></aside>
    <WarmupMobility dayId={selected} language={language} onOpenRoutine={onOpenRoutine}/>
    <RecoveryStretch dayId={selected} language={language} onOpenRoutine={onOpenRoutine}/>
  </section>
}

function ExerciseMedia({ exercise,index,onOpen,language }: { exercise:Exercise; index:number; onOpen:(exercise:Exercise)=>void; language:Language }) {
  const ar=language==='ar',name=ar?exerciseArabic[exercise.id]:exercise.name
  return <button className="exercise-gif interactive" onClick={()=>onOpen(exercise)} aria-label={ar?`فتح عرض ${name}`:`Open ${name} GIF demonstration`}>
    {exercise.gif?<img src={`${import.meta.env.BASE_URL}${exercise.gif.replace(/^\//,'')}`} alt={ar?`عرض حركة ${name}`:`${name} movement demonstration`}/>:<div className="gif-placeholder"><Dumbbell/><span>{ar?'العرض قريباً':'GIF demo coming soon'}</span></div>}
    <span className="exercise-index">{ar?arabicNumbers(String(index+1).padStart(2,'0')):String(index+1).padStart(2,'0')}</span><span className="expand-gif"><Maximize2/></span>
  </button>
}

function ExerciseCard({ exercise,index,language,onOpen,onGuide }: { exercise:Exercise; index:number; language:Language; onOpen:(exercise:Exercise)=>void; onGuide:(exercise:Exercise)=>void }) {
  const t=ui[language], ar=language==='ar'
  const details=exerciseDetailsArabic[exercise.id]
  return <motion.article className="exercise-card detail-card" {...reveal} transition={{duration:.4,delay:index*.04}}>
    <ExerciseMedia exercise={exercise} index={index} onOpen={onOpen} language={language}/>
    <div className="exercise-card-content">
      <div className="exercise-main"><div className="exercise-icon"><Dumbbell/></div><div><span>{ar?details.muscles:exercise.muscles}</span><h3>{ar?exerciseArabic[exercise.id]:exercise.name}</h3></div></div>
      <div className="exercise-stats"><div><Target/><span>{t.sets}<strong>{ar?arabicNumbers(exercise.sets):exercise.sets}</strong></span></div><div><Clock3/><span>{t.rest}<strong>{ar?arabicNumbers(exercise.rest):exercise.rest}</strong></span></div><div><Dumbbell/><span>{t.equipment}<strong>{ar?details.equipment:exercise.equipment}</strong></span></div></div>
      <div className="technique"><span>{t.technique}</span><p>{cueFor(exercise,language)}</p></div>
      <button className="instruction-trigger" onClick={()=>onGuide(exercise)}>{ar?arGuideLabels.trigger:enGuideLabels.trigger}</button>
    </div>
  </motion.article>
}

function InstructionSheet({ exercise,language,onClose }: { exercise:Exercise; language:Language; onClose:()=>void }) {
  const ar=language==='ar', labels=ar?arGuideLabels:enGuideLabels, name=ar?exerciseArabic[exercise.id]:exercise.name, instruction=guideFor(exercise,language)
  const sections=[
    [labels.steps, instruction.steps],
    [labels.mistakes, instruction.mistakes],
    [labels.tips, instruction.tips],
    [labels.breathing, instruction.breathing],
  ] as const
  return <motion.div className="image-lightbox instruction-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
    <motion.div className={`instruction-dialog ${ar?'':'english'}`} initial={{y:35,opacity:.98}} animate={{y:0,opacity:1}} exit={{y:25,opacity:0}} role="dialog" aria-modal="true" aria-label={`${labels.title} ${name}`} onClick={e=>e.stopPropagation()}>
      <button className="lightbox-close" onClick={onClose} aria-label={ui[language].close}><X/></button>
      <div className="instruction-head"><span>{labels.title}</span><h2>{name}</h2><p>{cueFor(exercise,language)}</p></div>
      <div className="instruction-meta">
        <div><span>{labels.primary}</span><strong>{instruction.target.primary}</strong></div>
        <div><span>{labels.secondary}</span><strong>{instruction.target.secondary}</strong></div>
        <div><span>{labels.difficulty}</span><strong>{instruction.difficulty}</strong></div>
      </div>
      <div className="instruction-sections">{sections.map(([title,items])=><section key={title}><h3>{title}</h3><ul>{items.map(item=><li key={item}>{title===labels.mistakes?null:<Check/>}<span>{item}</span></li>)}</ul></section>)}</div>
    </motion.div>
  </motion.div>
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
  const route=(window.location.hash.replace('#/','')||'1') as Page
  const [page,setPage]=useState<Page>(pages.includes(route)?route:'1')
  const [language,setLanguage]=useState<Language>(()=>localStorage.getItem('menna-language')==='ar'?'ar':'en')
  const [preview,setPreview]=useState<Exercise|null>(null)
  const [routinePreview,setRoutinePreview]=useState<RoutineItem|null>(null)
  const [guide,setGuide]=useState<Exercise|null>(null)
  const t=ui[language], ar=language==='ar'

  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=ar?'rtl':'ltr';localStorage.setItem('menna-language',language)},[language,ar])
  useEffect(()=>{if(!pages.includes(route))window.history.replaceState(null,'','#/1')},[])
  useEffect(()=>{const sync=()=>{const next=window.location.hash.replace('#/','') as Page;if(pages.includes(next))setPage(next)};window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[])
  useEffect(()=>{if(!preview&&!routinePreview&&!guide)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPreview(null);setRoutinePreview(null);setGuide(null)}};document.body.style.overflow='hidden';window.addEventListener('keydown',close);return()=>{document.body.style.overflow='';window.removeEventListener('keydown',close)}},[preview,routinePreview,guide])

  const navigate=(next:Page)=>{setPage(next);window.history.replaceState(null,'',`#/${next}`);window.scrollTo({top:0,behavior:'smooth'})}
  const day=workoutDays.find(d=>d.id===page)
  const nav:[Page,string][]=[...workoutDays.map(day=>[day.id,ar?dayArabic[day.id].label:day.label] as [Page,string]),['warmup',ar?'تسخين':'Warm-up'],['nutrition',t.nutrition]]

  return <div className="app-shell routed-app simplified-app" dir={ar?'rtl':'ltr'}>
    <header className="site-header product-header">
      <button className="brand" onClick={()=>navigate('1')} aria-label={ar?'الانتقال إلى اليوم 1':'Go to Day 1'}><span className="brand-mark"><Heart/></span><span><strong>{ar?'مِنّة':'MENNA'}</strong><small>{ar?'قوة وازدهار':'FIT & FLOURISH'}</small></span></button>
      <nav className="desktop-nav" aria-label={ar?'التنقل الرئيسي':'Primary navigation'}>{nav.map(([id,label])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}>{id==='nutrition'&&<Apple/>}{label}</button>)}</nav>
      <div className="header-actions"><button className="language-toggle" onClick={()=>setLanguage(ar?'en':'ar')} aria-label={ar?'Switch to English':'Switch to Arabic'} aria-live="polite"><span>{ar?'EN':'AR'}</span></button></div>
    </header>

    <AnimatePresence mode="wait"><motion.main key={`${page}-${language}`} className="page-stage" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.26}}>
      {day&&<section className="section focused-page workout-section"><div className="focused-heading"><SectionTitle eyebrow={ar?'تمرين':'Workout'} title={ar?dayArabic[day.id].label:day.label} copy={ar?dayArabic[day.id].focus:day.focus}/><div className="workout-count"><strong>{ar?arabicNumbers(String(day.exerciseIds.length)):day.exerciseIds.length}</strong><span>{t.exercises}</span></div></div><div className="exercise-grid">{day.exerciseIds.map((id,i)=><ExerciseCard key={`${day.id}-${id}`} exercise={exercises[id]} index={i} language={language} onOpen={setPreview} onGuide={setGuide}/>)}</div><div className="training-note"><Dumbbell/><div><strong>{ar?'اتركي بعض الطاقة في الاحتياط.':'Leave a little in the tank.'}</strong><p>{ar?'اختاري وزناً يسمح لك بإكمال كل التكرارات المحددة بأداء صحيح.':'Choose a weight that lets you finish every prescribed rep with clean form.'}</p></div></div></section>}

      {page==='warmup'&&<WarmupStretchingPage language={language} onOpenRoutine={setRoutinePreview}/>}
      {page==='nutrition'&&<NutritionPage language={language}/>}
    </motion.main></AnimatePresence>

    <AnimatePresence>{preview&&<motion.div className="image-lightbox" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setPreview(null)}><motion.div className="lightbox-dialog" initial={{scale:.96,y:15}} animate={{scale:1,y:0}} exit={{scale:.97}} role="dialog" aria-modal="true" aria-label={ar?exerciseArabic[preview.id]:preview.name} onClick={e=>e.stopPropagation()}><button className="lightbox-close" onClick={()=>setPreview(null)} aria-label={t.closeDemo}><X/></button>{preview.gif?<img src={`${import.meta.env.BASE_URL}${preview.gif.replace(/^\//,'')}`} alt={ar?`عرض حركة ${exerciseArabic[preview.id]}`:`${preview.name} movement demonstration`}/>:<div className="gif-placeholder"><Dumbbell/><span>{ar?'العرض قريباً':'GIF demo coming soon'}</span></div>}<div className="lightbox-caption"><div><span>{ar?exerciseDetailsArabic[preview.id].muscles:preview.muscles}</span><strong>{ar?exerciseArabic[preview.id]:preview.name}</strong></div><div><span>{t.sets}</span><strong>{ar?arabicNumbers(preview.sets):preview.sets}</strong></div><div><span>{t.rest}</span><strong>{ar?arabicNumbers(preview.rest):preview.rest}</strong></div></div></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{routinePreview&&<motion.div className="image-lightbox" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setRoutinePreview(null)}><motion.div className="lightbox-dialog" initial={{scale:.96,y:15}} animate={{scale:1,y:0}} exit={{scale:.97}} role="dialog" aria-modal="true" aria-label={routineFor(routinePreview,language).name} onClick={e=>e.stopPropagation()}><button className="lightbox-close" onClick={()=>setRoutinePreview(null)} aria-label={t.closeDemo}><X/></button>{routinePreview.gif?<img src={`${import.meta.env.BASE_URL}${routinePreview.gif.replace(/^\//,'')}`} alt={`${routineLabels[language].alt} ${routineFor(routinePreview,language).name}`}/>:<div className="gif-placeholder"><Activity/><span>{routineLabels[language].demo}</span></div>}<div className="lightbox-caption"><div><span>{routineFor(routinePreview,language).target}</span><strong>{routineFor(routinePreview,language).name}</strong></div><div><span>{language==='ar'?'المدة':'Time'}</span><strong>{routineFor(routinePreview,language).metric}</strong></div></div></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{guide&&<InstructionSheet exercise={guide} language={language} onClose={()=>setGuide(null)}/>}</AnimatePresence>
  </div>
}

export default App
