import type { WorkoutDayId } from './data'

export type RoutineItem = {
  id: string
  name: string
  metric: string
  target: string
  gif?: string
  steps: string[]
  mistakes: string[]
  tip?: string
  breathing: string
  duration?: string
  benefit?: string
}

const warm = {
  walking: { id:'walking', name:'Walking', metric:'60 ثانية', target:'القلب والرجلين', gif:'/exercises/walking.gif', steps:['ابدئي مشي خفيف في المكان أو على المشاية.','خلي كتفك مرتاح وإيدك تتحرك طبيعي.','زودي السرعة سنة بسيطة بس من غير جري.'], mistakes:['متبدئيش بسرعة عالية.','متقفشي جسمك وإنتي ماشية.'], tip:'المطلوب تصحي الجسم بس، مش تتعبي بدري.', breathing:'خدي نفس هادي وطلعيه براحة مع الخطوات.' },
  hipCircles: { id:'hipCircles', name:'Hip Circles', metric:'30 ثانية لكل ناحية', target:'الحوض والمؤخرة', gif:'/exercises/warm-hip-circles.gif', steps:['اقفي ورجلك بعرض الحوض.','حطي إيدك على وسطك ولفي الحوض دايرة صغيرة.','كبري الدايرة سنة لو الحركة مريحة.'], mistakes:['متلفيش بضهرك بدل الحوض.','متسرعيش الحركة.'], tip:'خلي الحركة ناعمة كأنك بتفكي المفصل.', breathing:'خدي نفس عادي ومتحبسيهوش.' },
  legSwings: { id:'legSwings', name:'Leg Swings', metric:'10 عدات لكل رجل', target:'الفخذ الخلفي والحوض', gif:'/exercises/warm-leg-swings.gif', steps:['امسكي في حيطة أو جهاز للتوازن.','مرجحي رجل واحدة لقدام ولورا بمدى مريح.','بدلي الرجل وكرري نفس العدد.'], mistakes:['مترميش الرجل بعنف.','متقوسيش ضهرك عشان ترفعي أعلى.'], tip:'المدى يزيد تدريجي، مش من أول عدة.', breathing:'طلعي النفس مع كل مرجحة لقدام.' },
  bodyweightSquat: { id:'bodyweightSquat', name:'Bodyweight Squat', metric:'10 عدات', target:'الأفخاذ والمؤخرة', gif:'/exercises/warm-bodyweight-squat.gif', steps:['افتحي رجلك بعرض الكتف.','انزلي كأنك قاعدة على كرسي.','اطلعي بهدوء وخلي ركبتك ماشية مع صوابعك.'], mistakes:['متخليش الركبة تدخل لجوه.','متنزليش بسرعة وتطلعي بخبطة.'], tip:'خلي الكعب ثابت في الأرض طول الحركة.', breathing:'خدي نفس وإنتي نازلة، طلعيه وإنتي طالعة.' },
  gluteBridge: { id:'gluteBridge', name:'Glute Bridge', metric:'12 عدة', target:'المؤخرة وأسفل الظهر', gif:'/exercises/warm-glute-bridge.gif', steps:['نامي على ضهرك واثني الركب.','ثبتي الكعب قريب من المؤخرة.','ارفعي الحوض لحد جسمك يبقى خط واحد.'], mistakes:['متطلعيش بضهرك زيادة.','متفتحيش الركب لبره قوي.'], tip:'اعصري المؤخرة ثانية فوق قبل ما تنزلي.', breathing:'طلعي النفس وإنتي بترفعي الحوض.' },
  worldsGreatest: { id:'worldsGreatest', name:"World's Greatest Stretch", metric:'3 مرات لكل ناحية', target:'الحوض والظهر والصدر', gif:'/exercises/warm-worlds-greatest-stretch.gif', steps:['خدي خطوة طويلة لقدام زي اللانج.','حطي إيدك جنب الرجل الأمامية.','لفي صدرك ناحية الرجل اللي قدام بهدوء.'], mistakes:['متدخليش في مدى يوجعك.','متسيبيش الركبة تقع لجوه.'], tip:'اعمليها ببطء، دي تجهيز مش سباق.', breathing:'خدي نفس قبل اللفة وطلعيه وإنتي بتفتحي صدرك.' },
  armCircles: { id:'armCircles', name:'Arm Circles', metric:'30 ثانية', target:'الكتف', gif:'/exercises/warm-arm-circles.gif', steps:['افردي دراعك للجنب.','اعملي دواير صغيرة لقدام.','بعد نص الوقت اعكسي الاتجاه.'], mistakes:['مترفعيش كتفك ناحية ودنك.','متعمليش دواير كبيرة من الأول.'], tip:'خلي الرقبة طويلة والكتف سايب.', breathing:'تنفسي عادي مع الحركة.' },
  shoulderRolls: { id:'shoulderRolls', name:'Shoulder Rolls', metric:'10 لفات لقدام و10 لورا', target:'الرقبة والكتف', gif:'/exercises/warm-shoulder-rolls.gif', steps:['اقفي طويلة وخلي إيدك جنبك.','لفي كتفك لقدام بهدوء.','ارجعي لفيه لورا بنفس الهدوء.'], mistakes:['متشديش رقبتك.','متعمليش اللفة بسرعة وخلاص.'], tip:'حسي إن الكتف بيتفك واحدة واحدة.', breathing:'خدي نفس وإنتي طالعة بالكتف وطلعيه وإنتي منزلاه.' },
  bandPullApart: { id:'bandPullApart', name:'Band Pull Apart', metric:'12 عدة', target:'أعلى الظهر والكتف الخلفي', gif:'/exercises/warm-band-pull-apart.gif', steps:['امسكي الباند قدام صدرك.','افتحي إيدك لبره لحد الباند يقرب من الصدر.','ارجعي ببطء من غير ما الباند يشدك.'], mistakes:['متقربيش كتفك من ودنك.','متكسريش الرسغ.'], tip:'اسحبي بلوح الكتف مش بالإيد بس.', breathing:'طلعي النفس وإنتي بتفتحي الباند.' },
  wallSlides: { id:'wallSlides', name:'Wall Slides', metric:'10 عدات', target:'الكتف ولوح الكتف', gif:'/exercises/warm-wall-slide.gif', steps:['اسندي ضهرك على الحيطة.','حطي دراعك على شكل حرف W.','اطلعي بإيدك لفوق وانزلي تاني بهدوء.'], mistakes:['متقوسيش ضهرك عن الحيطة.','متطلعيش لو الكتف بيقرص.'], tip:'مدى صغير ونضيف أحسن من مدى كبير غلط.', breathing:'خدي نفس وإنتي نازلة، طلعيه وإنتي طالعة.' },
  catCow: { id:'catCow', name:'Cat-Cow', metric:'6 عدات هادية', target:'الضهر والرقبة', gif:'/exercises/warm-cat-cow.gif', steps:['انزلي على إيدك وركبك.','قوسي ضهرك لفوق بهدوء.','افتحي الصدر وانزلي بضهرك لتحت سنة.'], mistakes:['متهزيش رقبتك بسرعة.','متعمليش الحركة من الوسط بس.'], tip:'خلي الحركة ماشية من أول الضهر لآخره.', breathing:'خدي نفس وإنتي بتفتحي الصدر، طلعيه وإنتي بتقوسي.' },
  scapularRetraction: { id:'scapularRetraction', name:'Scapular Retraction', metric:'10 عدات', target:'لوح الكتف', gif:'/exercises/warm-scapular-retraction.gif', steps:['اقعدي أو اقفي طويلة.','اسحبي لوح الكتف لورا كأنك بتقربيهم.','سيبيهم يرجعوا لقدام بهدوء.'], mistakes:['متطلعيش كتفك لفوق.','متدفعيش صدرك جامد.'], tip:'الحركة صغيرة بس بتفرق في تمارين الظهر والصدر.', breathing:'طلعي النفس وإنتي بتسحبي لوح الكتف لورا.' },
  birdDog: { id:'birdDogWarm', name:'Bird Dog', metric:'8 عدات لكل ناحية', target:'البطن وثبات الظهر', gif:'/exercises/bird-dog.gif', steps:['ابدئي على إيدك وركبك.','مدي إيد ورجل عكس بعض.','ارجعي للنص وبدلي الناحية.'], mistakes:['متخليش الحوض يلف.','مترفعيش الرجل أعلى من جسمك.'], tip:'تخيلي ضهرك عليه كوباية مية.', breathing:'طلعي النفس وإنتي بتمدي الإيد والرجل.' },
  deadBug: { id:'deadBugWarm', name:'Dead Bug', metric:'8 عدات', target:'البطن العميقة', gif:'/exercises/dead-bug.gif', steps:['نامي على ضهرك وارفعي إيدك ورجلك.','لزقي أسفل ضهرك في الأرض.','نزلي إيد ورجل عكس بعض ببطء.'], mistakes:['متسيبيش ضهرك يتقوس.','متسرعيش عشان تخلصي.'], tip:'لو ضهرك طلع، قصري مدى الرجل.', breathing:'طلعي النفس وإنتي بتنزيلي الإيد والرجل.' },
  hipRotation: { id:'hipRotation', name:'Hip Rotation', metric:'30 ثانية', target:'الحوض والمؤخرة', gif:'/exercises/warm-hip-circles.gif', steps:['اقفي ثابتة أو انزلي على الركب لو أريح.','حركي الحوض في مدى مريح.','بدلي الاتجاه بعد نص الوقت.'], mistakes:['متجبريش المفصل على مدى كبير.','متنسيش تثبتي بطنك.'], tip:'خليها تفتيح للمفصل مش شد جامد.', breathing:'تنفسي بهدوء طول الحركة.' },
  thoracicRotation: { id:'thoracicRotation', name:'Thoracic Rotation', metric:'6 عدات لكل ناحية', target:'أعلى الظهر والصدر', gif:'/exercises/warm-thoracic-rotation.gif', steps:['انزلي على إيدك وركبك.','حطي إيد ورا راسك.','افتحي الكوع لفوق ولفي صدرك بهدوء.'], mistakes:['متلفيش من الحوض.','متزقيش رقبتك بإيدك.'], tip:'خلي عينك تتابع الكوع عشان اللفة تبقى أنعم.', breathing:'خدي نفس قبل اللفة وطلعيه وإنتي بتفتحي.' },
} satisfies Record<string, RoutineItem>

const stretch = {
  hamstring: { id:'hamstringStretch', name:'Hamstring Stretch', metric:'20-30 ثانية', duration:'مرتين', target:'الفخذ الخلفي', gif:'/exercises/stretch-hamstring.gif', steps:['اقعدي وافردي رجل واحدة لقدام.','ميلي من الحوض ناحية الرجل.','وقفي عند أول شد مريح.'], mistakes:['متشديهاش بعنف.','متنطيش وإنتي بتشدي.'], breathing:'خدي نفس بهدوء وطلعيه براحة.', benefit:'بيساعد الفخذ الخلفي يهدى بعد تمارين الرجل ويقلل الإحساس بالشد.' },
  quad: { id:'quadStretch', name:'Quad Stretch', metric:'20-30 ثانية', duration:'مرتين لكل رجل', target:'الفخذ الأمامي', gif:'/exercises/stretch-quad.gif', steps:['اقفي وامسكي رجل من ورا.','قربي الكعب ناحية المؤخرة براحة.','خلي الركبتين جنب بعض.'], mistakes:['متقوسيش ضهرك.','متشديش الرجل لحد الوجع.'], breathing:'خدي نفس هادي وسيبي الرجل ترتاح مع الزفير.', benefit:'بيفك الفخذ الأمامي بعد السكوات واللانجز.' },
  hipFlexor: { id:'hipFlexorStretch', name:'Hip Flexor Stretch', metric:'20-30 ثانية', duration:'مرتين لكل ناحية', target:'مقدمة الحوض', gif:'/exercises/stretch-hip-flexor.gif', steps:['انزلي ركبة على الأرض ورجل قدام.','ادفعي الحوض لقدام سنة بسيطة.','خلي صدرك مرفوع من غير قوس في الضهر.'], mistakes:['متزقيش الحوض جامد.','متسيبيش ضهرك يتقوس.'], breathing:'طلعي النفس وإنتي بترخي الحوض لقدام.', benefit:'مفيد بعد تمارين الرجل والكور عشان يفك مقدمة الحوض.' },
  glute: { id:'gluteStretch', name:'Glute Stretch', metric:'20-30 ثانية', duration:'مرتين لكل ناحية', target:'المؤخرة', gif:'/exercises/stretch-glute.gif', steps:['نامي على ضهرك.','حطي رجل فوق التانية زي رقم 4.','اسحبي الرجل ناحية صدرك بهدوء.'], mistakes:['متشديش من الركبة بعنف.','مترفعيش رقبتك من الأرض.'], breathing:'خدي نفس وطلعيه براحة وإنتي ماسكة الوضع.', benefit:'بيساعد المؤخرة تهدى بعد الهيب ثرست واللانجز.' },
  calf: { id:'calfStretch', name:'Calf Stretch', metric:'20-30 ثانية', duration:'مرتين لكل رجل', target:'السمانة', gif:'/exercises/stretch-calf.gif', steps:['افردي رجل لقدام أو اسندي على حيطة.','خلي الكعب ثابت.','ميلي سنة لحد ما تحسي شد في السمانة.'], mistakes:['مترفيش الكعب.','متنطيش في الشد.'], breathing:'تنفس هادي، والزفير يخلي الجسم يسيب الشد.', benefit:'بيخفف شد السمانة بعد الرفع والمشي واللانجز.' },
  chest: { id:'chestStretch', name:'Chest Stretch', metric:'20-30 ثانية', duration:'مرتين', target:'الصدر', gif:'/exercises/stretch-chest.gif', steps:['حطي إيدك على حيطة أو باب.','لفي جسمك بعيد سنة عن الإيد.','وقفي عند شد مريح في الصدر.'], mistakes:['مترميش كتفك لقدام.','متلفيش بسرعة.'], breathing:'خدي نفس ووسعي الصدر، وطلعيه براحة.', benefit:'بيرجع الصدر لطبيعته بعد الضغط والفراشة.' },
  lat: { id:'latStretch', name:'Lat Stretch', metric:'20-30 ثانية', duration:'مرتين لكل ناحية', target:'الظهر الجانبي', gif:'/exercises/stretch-lat.gif', steps:['امسكي حيطة أو عمود بإيد واحدة.','ارجعي بجسمك لورا سنة.','ميلي بالجنب لحد ما تحسي الظهر الجانبي.'], mistakes:['متشديش كتفك بعنف.','متقفليش النفس.'], breathing:'طلعي النفس وإنتي سايبة الظهر يطول.', benefit:'مفيد بعد السحب والرو عشان الظهر يفك.' },
  shoulder: { id:'shoulderStretch', name:'Shoulder Stretch', metric:'20-30 ثانية', duration:'مرتين لكل ناحية', target:'الكتف', gif:'/exercises/stretch-shoulder.gif', steps:['عدي دراعك قدام صدرك.','اسحبيه بإيدك التانية ناحية جسمك.','خلي الكتف نازل ومريح.'], mistakes:['متقربيش كتفك من ودنك.','متشديش الكوع جامد.'], breathing:'خدي نفس هادي وطلعيه وإنتي مرخية الكتف.', benefit:'بيساعد الكتف يهدى بعد الرفرفة والضغط.' },
  triceps: { id:'tricepsStretch', name:'Triceps Stretch', metric:'20-30 ثانية', duration:'مرتين لكل دراع', target:'الترايسبس', gif:'/exercises/stretch-triceps.gif', steps:['ارفعي دراعك لفوق واثني الكوع.','حطي الإيد ورا الرأس.','اسحبي الكوع سنة بإيدك التانية.'], mistakes:['متقوسيش ضهرك.','متشديش الكوع بعنف.'], breathing:'تنفسي براحة وخلي الكتف سايب.', benefit:'بيفك الترايسبس بعد الدفع بالحبل والضغط.' },
  upperTrap: { id:'upperTrapStretch', name:'Upper Trap Stretch', metric:'20 ثانية', duration:'مرتين لكل ناحية', target:'جنب الرقبة وأعلى الكتف', gif:'/exercises/stretch-upper-trap.gif', steps:['اقعدي طويلة.','ميلي ودنك ناحية كتفك بهدوء.','سيبي الكتف التاني نازل.'], mistakes:['متزقيش راسك بإيدك.','مترفعيش الكتف الناحية التانية.'], breathing:'خدي نفس وطلعيه براحة وإنتي مرخية الرقبة.', benefit:'بيخفف الشد اللي بييجي من تمارين الكتف والظهر.' },
  cobra: { id:'cobraStretch', name:'Cobra Stretch', metric:'20 ثانية', duration:'مرتين', target:'البطن ومقدمة الجسم', gif:'/exercises/stretch-cobra.gif', steps:['نامي على بطنك.','حطي إيدك تحت كتفك.','ارفعي صدرك سنة من غير ما تضغطي على أسفل الضهر.'], mistakes:['متطلعيش عالي لو ضهرك بيضايقك.','متقفليش رقبتك لورا.'], breathing:'خدي نفس وإنتي فاتحة الصدر وطلعيه براحة.', benefit:'بيفك البطن بعد تمارين الكور.' },
  childsPose: { id:'childsPose', name:"Child's Pose", metric:'30 ثانية', duration:'مرة أو مرتين', target:'الضهر والحوض', gif:'/exercises/stretch-childs-pose.gif', steps:['انزلي على الركب.','ارجعي بالمؤخرة ناحية الكعب.','مدي إيدك لقدام وسيبي ضهرك يطول.'], mistakes:['متكبسيش على ركبتك لو مش مريحة.','متشديش كتفك لفوق.'], breathing:'نفس هادي وطويل، كل زفير ريحي جسمك أكتر.', benefit:'بيهدّي الضهر والتنفس بعد الكور.' },
  seatedTwist: { id:'seatedTwist', name:'Seated Twist', metric:'20 ثانية', duration:'مرتين لكل ناحية', target:'الضهر والجوانب', gif:'/exercises/stretch-seated-twist.gif', steps:['اقعدي طويلة ورجلك مريحة.','لفي صدرك لناحية واحدة.','ارجعي للنص وبدلي الناحية.'], mistakes:['متلفيش بعنف.','متخليش الضهر يتكور.'], breathing:'خدي نفس في النص وطلعيه وإنتي بتلفي.', benefit:'بيساعد الضهر والجوانب يفكوا بعد الثبات.' },
  catCowCool: { id:'catCowCool', name:'Cat-Cow هادي', metric:'5 أنفاس', duration:'مرة', target:'الضهر والرقبة', gif:'/exercises/warm-cat-cow.gif', steps:['انزلي على إيدك وركبك.','اعملي الحركة ببطء قوي.','وقفي ثانية في كل وضع وخلي النفس يقود الحركة.'], mistakes:['متسرعيش.','متدخليش في مدى يوجع.'], breathing:'خدي نفس وإنتي بتفتحي الصدر، طلعيه وإنتي بتقوسي.', benefit:'بيخلي الضهر يهدى بعد الكور من غير ضغط.' },
} satisfies Record<string, RoutineItem>

export const warmupStretchingPlans: Record<WorkoutDayId, { warmup: RoutineItem[]; stretch: RoutineItem[] }> = {
  '1': { warmup:[warm.walking,warm.hipCircles,warm.legSwings,warm.bodyweightSquat,warm.gluteBridge,warm.worldsGreatest], stretch:[stretch.hamstring,stretch.quad,stretch.hipFlexor] },
  '2': { warmup:[warm.armCircles,warm.shoulderRolls,warm.bandPullApart,warm.wallSlides,warm.catCow,warm.scapularRetraction], stretch:[stretch.chest,stretch.lat,stretch.shoulder] },
  '4': { warmup:[warm.walking,warm.hipCircles,warm.legSwings,warm.bodyweightSquat,warm.gluteBridge,warm.worldsGreatest], stretch:[stretch.glute,stretch.calf,stretch.hipFlexor] },
  '5': { warmup:[warm.armCircles,warm.shoulderRolls,warm.bandPullApart,warm.wallSlides,warm.catCow,warm.scapularRetraction], stretch:[stretch.triceps,stretch.upperTrap,stretch.chest] },
  '6': { warmup:[warm.catCow,warm.birdDog,warm.deadBug,warm.hipRotation,warm.thoracicRotation], stretch:[stretch.cobra,stretch.childsPose,stretch.seatedTwist,stretch.hipFlexor,stretch.catCowCool] },
}

export const stretchingTips = [
  'الاسترتش عمره ما يكون مؤلم.',
  'النفس مهم زي الحركة.',
  'الجودة أهم من السرعة.',
  'جسمك محتاج تسخين قبل التمرين، وتهدئة بعده.',
  'لو حسيتي بألم في المفصل، وقفي فورًا.',
]

export function tipForDay(dayId: WorkoutDayId) {
  const today = new Date()
  const seed = Math.floor(today.getTime() / 86400000) + Number(dayId)
  return stretchingTips[seed % stretchingTips.length]
}
