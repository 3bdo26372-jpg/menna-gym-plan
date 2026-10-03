export type LibraryCategoryId = 'movement' | 'upper' | 'stretch'

export type LibraryExercise = {
  id: string
  number: number
  name: string
  category: LibraryCategoryId
  cue: string
  focus: string
  alternatives: [string, string]
  /** YouTube video id used for the embedded demo. */
  youtubeId: string
  /** Search phrase used for the "more videos" link if the main video is unavailable. */
  searchQuery: string
}

export const libraryCategories: { id: LibraryCategoryId; name: string; description: string }[] = [
  { id: 'movement', name: 'الحركة وتنشيط الدورة الدموية', description: 'حركات واقفة خفيفة تسخّن الجسم وتحرّك الدورة الدموية.' },
  { id: 'upper', name: 'شد الجزء العلوي والجذع', description: 'تمارين للذراعين والكتف والظهر والبطن من غير أدوات.' },
  { id: 'stretch', name: 'الـStretch الخفيف', description: 'إطالات هادية واقفة تختمي بيها التمرين.' },
]

export const library: LibraryExercise[] = [
  {
    id: 'march', number: 1, name: 'المشي الهادئ في المكان', category: 'movement',
    cue: 'ارفعي القدم بهدوء وحرّكي الذراعين طبيعي مع ظهر طويل.', focus: 'الجسم كله',
    alternatives: ['نقل الوزن يمين وشمال.', 'رفع الكعب بالتبادل مع بقاء الأصابع على الأرض.'],
    youtubeId: '_Ox0N-Ab3Sc', searchQuery: 'marching on the spot low impact',
  },
  {
    id: 'sideStepTouch', number: 2, name: 'Side Step Touch', category: 'movement',
    cue: 'خطوة جانبية ثم قرّبي القدم الثانية ولمسة خفيفة بالأرض.', focus: 'الرجلين والوسط',
    alternatives: ['لمس القدم جانبًا من دون نقل الوزن.', 'ميل بسيط بالوزن يمينًا ويسارًا.'],
    youtubeId: 'wH9hsR7Ck_M', searchQuery: 'step touch exercise',
  },
  {
    id: 'heelTap', number: 3, name: 'Heel Tap أمامي', category: 'movement',
    cue: 'مدّي كعبًا للأمام ولمسة خفيفة بالأرض ثم بدّلي.', focus: 'الرجلين والدورة الدموية',
    alternatives: ['لمس الكعب قريبًا جدًا من الجسم.', 'رفع أصابع القدم فقط بالتبادل.'],
    youtubeId: '3kUKNgOjLhU', searchQuery: 'standing front heel taps exercise',
  },
  {
    id: 'backToeTap', number: 4, name: 'Back Toe Tap', category: 'movement',
    cue: 'ارجعي بقدم للخلف ولمسة بأطراف الأصابع مع ثبات الجذع.', focus: 'المؤخرة والرجلين',
    alternatives: ['خطوة خلفية صغيرة جدًا.', 'تحريك القدم للخلف وهي ملامسة للأرض.'],
    youtubeId: 'N1HkMkHVvkY', searchQuery: 'standing back toe tap exercise',
  },
  {
    id: 'hamstringCurl', number: 5, name: 'Standing Hamstring Curl', category: 'movement',
    cue: 'اثني الركبة وقرّبي الكعب من المؤخرة والفخذين جنب بعض.', focus: 'الفخذ الخلفي',
    alternatives: ['ثني الركبة بمدى صغير.', 'رفع الكعب سنتيمترات بسيطة فقط.'],
    youtubeId: 'LaDKpYN9FDw', searchQuery: 'standing hamstring curl bodyweight',
  },
  {
    id: 'lowKneeLift', number: 6, name: 'Low Knee Lift', category: 'movement',
    cue: 'ارفعي الركبة لارتفاع مريح مع بطن مشدودة خفيف.', focus: 'البطن والفخذ',
    alternatives: ['رفع الركبة ارتفاعًا قليلًا.', 'رفع الكعب مع بقاء مقدمة القدم قريبة من الأرض.'],
    youtubeId: '6EZjdNDHd-I', searchQuery: 'standing knee lift exercise',
  },
  {
    id: 'calfRaise', number: 7, name: 'Calf Raise', category: 'movement',
    cue: 'اطلعي على أطراف القدم ببطء وانزلي أبطأ.', focus: 'السمانة',
    alternatives: ['رفع الكعبين نصف مدى مع الاستناد للحائط.', 'رفع كعب واحد كل مرة.'],
    youtubeId: 'Uyg2QR1WAq8', searchQuery: 'standing bodyweight calf raise',
  },
  {
    id: 'hipAbduction', number: 8, name: 'Standing Hip Abduction', category: 'movement',
    cue: 'افتحي الرجل للجنب من غير ما الجسم يميل.', focus: 'جانب المؤخرة',
    alternatives: ['لمس القدم إلى الجانب.', 'فتح القدم مسافة صغيرة مع الاستناد للحائط.'],
    youtubeId: 'qBqKuEQl9sI', searchQuery: 'standing hip abduction exercise',
  },
  {
    id: 'hipExtension', number: 9, name: 'Standing Hip Extension', category: 'movement',
    cue: 'ارجعي بالرجل للخلف من المؤخرة من غير تقويس الظهر.', focus: 'المؤخرة',
    alternatives: ['لمس أطراف الأصابع خلف الجسم.', 'شد عضلات المؤخرة في مكانها من دون تحريك الرجل.'],
    youtubeId: '6UxbnQZdgC0', searchQuery: 'standing hip extension exercise',
  },
  {
    id: 'armMarch', number: 10, name: 'Low-Impact Arm March', category: 'movement',
    cue: 'مشي في المكان مع حركة ذراعين نشيطة وكتف مرتاح.', focus: 'القلب والذراعين',
    alternatives: ['تحريك الذراعين فقط.', 'تحريك ذراع واحدة في كل مرة.'],
    youtubeId: 'QilgMPG7OaA', searchQuery: 'march in place with arm swings low impact',
  },
  {
    id: 'wallPushUp', number: 11, name: 'Wall Push-Up', category: 'upper',
    cue: 'اليدين على الحائط بعرض الكتف، قرّبي الصدر ثم ادفعي بهدوء.', focus: 'الصدر والذراعين',
    alternatives: ['الوقوف قريبًا جدًا من الحائط.', 'ضغط راحتي اليدين في بعضهما أمام الصدر.'],
    youtubeId: 'YB0egDzsu18', searchQuery: 'wall push up beginners',
  },
  {
    id: 'shoulderBladeSqueeze', number: 12, name: 'Shoulder-Blade Squeeze', category: 'upper',
    cue: 'اسحبي لوحي الكتف للخلف وللأسفل وثبّتي ثانيتين.', focus: 'أعلى الظهر',
    alternatives: ['سحب الكوعين للخلف بمدى صغير.', 'تدوير الكتفين للخلف ببطء.'],
    youtubeId: 'oigUh4f2z0Y', searchQuery: 'standing shoulder blade squeeze',
  },
  {
    id: 'palmPress', number: 13, name: 'Standing Palm Press', category: 'upper',
    cue: 'اضغطي الكفين في بعض أمام الصدر مع تنفس طبيعي.', focus: 'الصدر والذراعين',
    alternatives: ['ضغط خفيف بأطراف الأصابع.', 'ضغط متقطع لمدة ثانيتين ثم الاسترخاء.'],
    youtubeId: 'iXyqsLab9mA', searchQuery: 'standing palm press isometric chest',
  },
  {
    id: 'abdominalBrace', number: 14, name: 'Standing Abdominal Brace', category: 'upper',
    cue: 'زفير هادئ مع شد البطن بدرجة خفيفة، من دون حبس النفس.', focus: 'البطن العميقة',
    alternatives: ['اليدان فوق البطن مع تنفس طبيعي.', 'شد لمدة ثانيتين فقط ثم الاسترخاء.'],
    youtubeId: '7-0IjyAycWA', searchQuery: 'abdominal bracing standing position',
  },
  {
    id: 'crossBodyReach', number: 15, name: 'Cross-Body Reach', category: 'upper',
    cue: 'مدّي الذراع قطريًا للجهة المقابلة مع لفّة خفيفة من الجذع.', focus: 'البطن المائلة والكتف',
    alternatives: ['حركة الذراع من دون دوران الجذع.', 'دوران صغير جدًا مع تثبيت القدمين.'],
    youtubeId: 'H9XgEzAbC58', searchQuery: 'standing cross body reach exercise',
  },
  {
    id: 'sideCrunch', number: 16, name: 'Standing Side Crunch', category: 'upper',
    cue: 'قرّبي الكوع من الركبة في نفس الجانب من غير شد الرقبة.', focus: 'جانبي البطن',
    alternatives: ['ميل جانبي صغير من دون رفع الركبة.', 'رفع الركبة إلى الجانب من دون ميل الجذع.'],
    youtubeId: 'dsK2L5ifOvg', searchQuery: 'standing side crunch',
  },
  {
    id: 'sideStretch', number: 17, name: 'Standing Side Stretch', category: 'stretch',
    cue: 'ارفعي الذراعين وميلي للجنب بهدوء واثبتي مع التنفس.', focus: 'جانبي الجذع',
    alternatives: ['يد واحدة فوق الرأس.', 'اليدان على الخصر مع ميل صغير.'],
    youtubeId: 'nmEoeicoW8w', searchQuery: 'standing side stretch',
  },
  {
    id: 'chestStretch', number: 18, name: 'Standing Chest Stretch', category: 'stretch',
    cue: 'افتحي الذراعين للخلف وارفعي الصدر من غير تقويس.', focus: 'الصدر والكتف',
    alternatives: ['فتح الذراعين بمدى صغير.', 'سحب لوحي الكتف للخلف من دون مد الذراعين.'],
    youtubeId: 'crnw1IKWNZY', searchQuery: 'standing chest opener stretch',
  },
  {
    id: 'calfStretch', number: 19, name: 'Standing Calf Stretch', category: 'stretch',
    cue: 'اليدين على الحائط، رجل للخلف والكعب ثابت على الأرض.', focus: 'السمانة',
    alternatives: ['خطوة خلفية أقصر.', 'رفع وخفض الكعب ببطء بدل الثبات.'],
    youtubeId: 'YTYQo4WvJHA', searchQuery: 'standing calf stretch wall',
  },
  {
    id: 'hamstringHipStretch', number: 20, name: 'Standing Hamstring/Hip Stretch', category: 'stretch',
    cue: 'الكعب أمام الجسم مع Hip Hinge بسيط والظهر مستقيم.', focus: 'الفخذ الخلفي والحوض',
    alternatives: ['مدى ميل صغير جدًا.', 'وضع القدم أمام الأخرى فقط من دون الميل.'],
    youtubeId: '5f5aHVj-f9Q', searchQuery: 'standing hamstring stretch hip hinge',
  },
]

export const libraryById = Object.fromEntries(library.map((exercise) => [exercise.id, exercise])) as Record<string, LibraryExercise>

export function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function youtubeEmbed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
}

export function youtubeWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeSearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}
