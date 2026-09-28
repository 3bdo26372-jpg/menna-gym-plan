/**
 * The single source of truth for every movement in the program.
 *
 * Rules every entry follows: standing only, bodyweight only, no floor, wall,
 * chair, bench or equipment. Every high-impact (jumping) movement names a
 * low-impact alternative that the player can switch to mid-workout.
 *
 * Media lives in public/exercises/<id>.webp. All demos except
 * `standing-quad-stretch` are Gym visual animations (see
 * scripts/exercise-media-sources.json); they must be shown with the credit in
 * MEDIA_CREDIT.
 */
export type ExerciseCategory = 'cardio' | 'strength' | 'core' | 'mobility' | 'stretch'
export type Impact = 'high' | 'low'
export type ExerciseRole = 'warmup' | 'jump' | 'lowCardio' | 'strength' | 'core' | 'light' | 'cooldown'

export interface Exercise {
  id: string
  name: string
  nameAr: string
  category: ExerciseCategory
  impact: Impact
  roles: ExerciseRole[]
  /** Short cue shown on the exercise card. */
  instruction: string
  focus: string
  /** Easier, low-impact version the player can switch to. */
  alternativeId?: string
  /** Hidden from generated workouts until the adaptive level reaches this value. */
  minLevel?: number
  /** Stretches and one-sided moves that should be split between both sides. */
  bothSides?: boolean
  media: string
  mediaSource: 'gymvisual' | 'drawn'
}

export const MEDIA_CREDIT = '© Gym visual — gymvisual.com'

type ExerciseInput = Omit<Exercise, 'media' | 'mediaSource'> & { mediaSource?: Exercise['mediaSource'] }

const define = (input: ExerciseInput): Exercise => ({
  mediaSource: 'gymvisual',
  ...input,
  media: `/exercises/${input.id}.webp`,
})

export const EXERCISES: Exercise[] = [
  // ---- jumping cardio (each has a low-impact alternative)
  define({
    id: 'jumping-jacks', name: 'Jumping Jacks', nameAr: 'جامبينج جاكس', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'الجسم كله', alternativeId: 'step-back-reach',
    instruction: 'اقفزي وافتحي رجليكي مع رفع الدراعين للجنب، وارجعي ضمّي بنفس الإيقاع. انزلي على مقدمة القدم بنعومة.',
  }),
  define({
    id: 'high-knees', name: 'High Knees', nameAr: 'رفع الركبة السريع', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'القلب والبطن والرجلين', alternativeId: 'short-stride-jog',
    instruction: 'جري في المكان مع رفع الركبة لمستوى الوسط، والدراعين بيتحركوا بقوة مع الرجلين.',
  }),
  define({
    id: 'butt-kick-jog', name: 'Butt Kicks', nameAr: 'جري مع رفع الكعب للخلف', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'الفخذ الخلفي والقلب', alternativeId: 'hamstring-curl',
    instruction: 'جري خفيف في المكان والكعب يطلع ناحية المؤخرة مع كل خطوة، والجذع مفرود.',
  }),
  define({
    id: 'skater-hops', name: 'Skater Hops', nameAr: 'قفزة المتزلجة', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'المؤخرة الجانبية والتوازن', alternativeId: 'skater-steps',
    instruction: 'اقفزي للجنب على رجل واحدة والرجل التانية تعدّي وراها، والإيد العكسية تنزل ناحية القدم.',
  }),
  define({
    id: 'star-jumps', name: 'Star Jumps', nameAr: 'قفزة النجمة', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'الجسم كله', alternativeId: 'squat-reach',
    instruction: 'انزلي نص سكوات، واقفزي لفوق وافتحي الدراعين والرجلين على شكل نجمة، وانزلي بركب مرنة.',
  }),
  define({
    id: 'scissor-jumps', name: 'Scissor Jumps', nameAr: 'قفزة المقص', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'الرجلين والقلب', alternativeId: 'ski-steps',
    instruction: 'اقفزي وبدّلي رجل قدام ورجل ورا، والدراعين بيتحركوا عكس الرجلين.',
  }),
  define({
    id: 'squat-jumps', name: 'Squat Jumps', nameAr: 'سكوات مع قفزة', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'المؤخرة والفخذ', alternativeId: 'bodyweight-squat', minLevel: 2,
    instruction: 'انزلي سكوات ثم اقفزي لفوق، وانزلي بهدوء على مقدمة القدم وبعدها الكعب.',
  }),
  define({
    id: 'sprint-knees', name: 'Sprint Knees', nameAr: 'جري سريع بركب عالية', category: 'cardio', impact: 'high', roles: ['jump'],
    focus: 'القلب والجسم كله', alternativeId: 'short-stride-jog', minLevel: 4,
    instruction: 'جري قوي في المكان بركب عالية ودراعين سريعة. ثابتي على نَفَس منتظم.',
  }),

  // ---- low-impact cardio and strength
  define({
    id: 'fast-feet', name: 'Fast Feet', nameAr: 'خطوات سريعة', category: 'cardio', impact: 'low', roles: ['lowCardio'],
    focus: 'القلب والسرعة',
    instruction: 'انحناءة خفيفة والركب مرنة، وحرّكي القدمين بخطوات صغيرة وسريعة جدًا في المكان.',
  }),
  define({
    id: 'short-stride-jog', name: 'Easy Jog', nameAr: 'جري خفيف بخطوات قصيرة', category: 'cardio', impact: 'low', roles: ['warmup', 'lowCardio', 'light'],
    focus: 'القلب',
    instruction: 'جري خفيف في المكان بخطوات قصيرة ودراعين مرتاحة. سرعة تقدري تتكلمي فيها.',
  }),
  define({
    id: 'knee-drive-kick', name: 'Knee Drive + Front Kick', nameAr: 'رفع الركبة + ركلة أمامية', category: 'cardio', impact: 'low', roles: ['lowCardio'],
    focus: 'البطن والرجلين والتوازن', bothSides: true,
    instruction: 'ارفعي الركبة وادفعي الدراعين لقدام، وبعدها افردي الرجل بركلة قصيرة. بدّلي الرجل في نص الوقت.',
  }),
  define({
    id: 'boxing-hooks', name: 'Boxing Hooks', nameAr: 'لكمات هوك', category: 'cardio', impact: 'low', roles: ['lowCardio'],
    focus: 'الكتف والخصر',
    instruction: 'وقفة ملاكمة والركب مرنة، لفّي الجذع وادفعي لكمة جانبية والكوع مرفوع، وبدّلي الإيدين بسرعة.',
  }),
  define({
    id: 'skater-steps', name: 'Skater Steps', nameAr: 'خطوة المتزلجة', category: 'cardio', impact: 'low', roles: ['lowCardio', 'light'],
    focus: 'المؤخرة الجانبية',
    instruction: 'خطوة واسعة للجنب مع ميل خفيف ومدّ الإيد ناحية القدم، وبدّلي الجهة من غير قفز.',
  }),
  define({
    id: 'ski-steps', name: 'Ski Steps', nameAr: 'خطوة التزلج', category: 'cardio', impact: 'low', roles: ['lowCardio', 'warmup', 'light'],
    focus: 'الرجلين والقلب',
    instruction: 'بدّلي رجل قدام ورجل ورا بخطوات سريعة من غير قفز، والإيدين على الوسط.',
  }),
  define({
    id: 'step-back-reach', name: 'Step Back + Reach', nameAr: 'خطوة للخلف مع مدّ الذراعين', category: 'core', impact: 'low', roles: ['warmup', 'core', 'light'],
    focus: 'البطن والكتف',
    instruction: 'خطوة للخلف وارفعي الدراعين فوق راسك وافردي جسمك، وارجعي وبدّلي الرجل.',
  }),
  define({
    id: 'squat-reach', name: 'Squat + Reach', nameAr: 'سكوات مع مدّ لفوق', category: 'strength', impact: 'low', roles: ['strength', 'light'],
    focus: 'المؤخرة والفخذ والكتف',
    instruction: 'انزلي سكوات والصدر مرفوع، واطلعي وافردي الدراعين لفوق على أطراف صوابعك.',
  }),
  define({
    id: 'bodyweight-squat', name: 'Bodyweight Squat', nameAr: 'سكوات', category: 'strength', impact: 'low', roles: ['strength', 'light'],
    focus: 'المؤخرة والفخذ',
    instruction: 'ارجعي بالحوض لورا والدراعين قدامك، وانزلي لحد ما تقدري بظهر مستقيم، واطلعي بالضغط على الكعب.',
  }),
  define({
    id: 'curtsey-squat', name: 'Curtsey Squat', nameAr: 'سكوات كيرتسي', category: 'strength', impact: 'low', roles: ['strength'],
    focus: 'المؤخرة الجانبية والفخذ', alternativeId: 'bodyweight-squat',
    instruction: 'رجّعي رجل ورا بشكل مايل خلف الرجل التانية وانزلي، واطلعي وبدّلي الجهة.',
  }),
  define({
    id: 'forward-lunge', name: 'Forward Lunge', nameAr: 'لانج أمامي', category: 'strength', impact: 'low', roles: ['strength'],
    focus: 'المؤخرة والفخذ', alternativeId: 'step-back-reach',
    instruction: 'خطوة لقدام وانزلي لحد الركبتين ما يبقوا تقريبًا ٩٠ درجة، وادفعي بالرجل اللي قدام وارجعي.',
  }),
  define({
    id: 'hamstring-curl', name: 'Standing Hamstring Curl', nameAr: 'ثني الركبة للخلف', category: 'strength', impact: 'low', roles: ['warmup', 'light'],
    focus: 'الفخذ الخلفي',
    instruction: 'الإيدين على الوسط، واسحبي الكعب ناحية المؤخرة بالتبادل بإيقاع ثابت.',
  }),
  define({
    id: 'calf-raises', name: 'Calf Raises', nameAr: 'رفع الكعبين', category: 'strength', impact: 'low', roles: ['light'],
    focus: 'السمانة والتوازن',
    instruction: 'اطلعي على أطراف صوابعك، ثانية فوق، وانزلي ببطء.',
  }),

  // ---- standing core / body control
  define({
    id: 'lunge-twist', name: 'Lunge + Twist', nameAr: 'لانج مع لفّة', category: 'core', impact: 'low', roles: ['core'],
    focus: 'الخصر والمؤخرة', alternativeId: 'step-back-reach',
    instruction: 'انزلي لانج ولفّي الجذع ناحية الرجل اللي قدام، ارجعي للوقوف وبدّلي.',
  }),
  define({
    id: 'squat-reach-twist', name: 'Squat + Twist Reach', nameAr: 'سكوات مع لفّة ومدّ', category: 'core', impact: 'low', roles: ['core'],
    focus: 'الخصر والرجلين', alternativeId: 'squat-reach',
    instruction: 'انزلي سكوات، واطلعي ومدّي الدراعين لفوق مع لفّة للجنب، وبدّلي الجهة كل مرة.',
  }),
  define({
    id: 'side-toe-touch', name: 'Side-to-Side Toe Touch', nameAr: 'لمس القدم بالتبادل', category: 'core', impact: 'low', roles: ['core'],
    focus: 'البطن الجانبية والفخذ الخلفي',
    instruction: 'ارفعي الدراعين فوق، انزلي من الحوض ولمسي القدم اليمين ثم الشمال، واطلعي بظهر مفرود.',
  }),
  define({
    id: 'toe-touch-reach', name: 'Reach + Toe Touch', nameAr: 'مدّ لفوق ولمس القدم', category: 'core', impact: 'low', roles: ['core', 'warmup'],
    focus: 'البطن والفخذ الخلفي',
    instruction: 'افردي الدراعين لفوق، وبعدها انزلي بهدوء والمسي صوابع رجليكي أو السمانة، واطلعي فقرة فقرة.',
  }),

  // ---- warm-up mobility
  define({
    id: 'knee-circles', name: 'Knee Circles', nameAr: 'دوائر الركبة', category: 'mobility', impact: 'low', roles: ['warmup'],
    focus: 'الركبة والكاحل',
    instruction: 'الإيدين على الوسط والركبتين جنب بعض، لفّي الركبتين دواير صغيرة وبدّلي الاتجاه في نص الوقت.',
  }),
  define({
    id: 'chest-opener', name: 'Chest Opener', nameAr: 'فتح الصدر', category: 'stretch', impact: 'low', roles: ['warmup', 'cooldown'],
    focus: 'الصدر والكتف',
    instruction: 'افتحي الدراعين للجنب لحد ما تحسي بفتح في الصدر، وارجعي بهم قدامك بإيقاع هادي.',
  }),

  // ---- standing stretches
  define({
    id: 'side-stretch', name: 'Standing Side Stretch', nameAr: 'إطالة جانبية', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'جوانب الجذع', bothSides: true,
    instruction: 'إيد ورا راسك وميلي للجنب التاني براحة من غير ما تلفّي. بدّلي الجهة في نص الوقت.',
  }),
  define({
    id: 'shoulder-cross-stretch', name: 'Cross-Body Shoulder Stretch', nameAr: 'إطالة الكتف', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'الكتف الخلفي', bothSides: true,
    instruction: 'اسحبي دراعك قدام صدرك بالإيد التانية والكتف نازل. بدّلي الجهة في نص الوقت.',
  }),
  define({
    id: 'overhead-triceps-stretch', name: 'Overhead Triceps Stretch', nameAr: 'إطالة الترايسبس', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'الذراع الخلفية', bothSides: true,
    instruction: 'ارفعي دراعك واثني الكوع ورا راسك، واسحبيه بخفة بالإيد التانية. بدّلي في نص الوقت.',
  }),
  define({
    id: 'upper-back-stretch', name: 'Upper Back Stretch', nameAr: 'إطالة أعلى الظهر', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'أعلى الظهر',
    instruction: 'مدّي الدراعين قدامك، زقّي لقدام ودوّري أعلى ضهرك وخلي راسك مرتاحة.',
  }),
  define({
    id: 'neck-side-stretch', name: 'Neck Side Stretch', nameAr: 'إطالة جانب الرقبة', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'الرقبة', bothSides: true,
    instruction: 'ميلي ودنك ناحية كتفك بهدوء وسيبي الكتف التاني نازل. بدّلي في نص الوقت.',
  }),
  define({
    id: 'standing-quad-stretch', name: 'Standing Quad Stretch', nameAr: 'إطالة الفخذ الأمامي', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'الفخذ الأمامي ومقدمة الحوض', bothSides: true, mediaSource: 'drawn',
    instruction: 'امسكي كاحلك ورا وقرّبي الكعب من المؤخرة والركبتين جنب بعض، والإيد التانية قدامك للتوازن. بدّلي في نص الوقت.',
  }),
  define({
    id: 'runners-stretch', name: "Runner's Stretch", nameAr: 'إطالة الفخذ الخلفي والسمانة', category: 'stretch', impact: 'low', roles: ['cooldown'],
    focus: 'الفخذ الخلفي والسمانة', bothSides: true,
    instruction: 'رجل قدام والكعب على الأرض، ميلي من الحوض بظهر مفرود وقرّبي إيديكي من القدم. بدّلي في نص الوقت.',
  }),
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((exercise) => [exercise.id, exercise]))

export function getExercise(id: string): Exercise {
  const exercise = EXERCISE_BY_ID[id]
  if (!exercise) throw new Error(`Unknown exercise: ${id}`)
  return exercise
}

export function exercisesWithRole(role: ExerciseRole, level = Number.POSITIVE_INFINITY) {
  return EXERCISES.filter((exercise) => exercise.roles.includes(role) && (exercise.minLevel ?? 0) <= level)
}

export function alternativeFor(id: string): Exercise | undefined {
  const alternativeId = EXERCISE_BY_ID[id]?.alternativeId
  return alternativeId ? EXERCISE_BY_ID[alternativeId] : undefined
}
