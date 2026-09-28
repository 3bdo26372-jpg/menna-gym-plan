export type LibraryCategory = 'circulation' | 'upper-core' | 'stretch'

export type LibraryExercise = {
  id: string
  number: number
  name: string
  subtitle: string
  category: LibraryCategory
  focus: string
  cue: string
  alternatives: [string, string]
  youtubeId: string
  searchQuery: string
}

export const libraryCategories: { id: LibraryCategory; title: string; description: string }[] = [
  { id: 'circulation', title: 'الحركة وتنشيط الدورة الدموية', description: 'حركات واقفة منخفضة الصدمات تدفّي الجسم وتحرّك الدورة الدموية.' },
  { id: 'upper-core', title: 'شد الجزء العلوي والجذع', description: 'تمارين تشد الصدر والظهر والكتف والبطن من غير أدوات.' },
  { id: 'stretch', title: 'الـStretch الخفيف', description: 'إطالة هادية واقفة للتهدئة في آخر التمرين.' },
]

export const library: LibraryExercise[] = [
  {
    id: 'march-in-place', number: 1, name: 'المشي الهادئ في المكان', subtitle: 'March in Place', category: 'circulation',
    focus: 'الجسم كله', cue: 'ارفعي القدم بهدوء وحرّكي الذراعين طبيعي مع ظهر طويل.',
    alternatives: ['نقل الوزن يمين وشمال.', 'رفع الكعب بالتبادل مع بقاء الأصابع على الأرض.'],
    youtubeId: 'QilgMPG7OaA', searchQuery: 'march in place low impact exercise',
  },
  {
    id: 'side-step-touch', number: 2, name: 'Side Step Touch', subtitle: 'خطوة جانبية ولمسة', category: 'circulation',
    focus: 'الرجلين والوسط', cue: 'خطوة للجنب ثم قرّبي القدم الثانية ولمسة خفيفة، وبدّلي الاتجاه.',
    alternatives: ['لمس القدم جانبًا من دون نقل الوزن.', 'ميل بسيط بالوزن يمينًا ويسارًا.'],
    youtubeId: 'mSX_hByjKFc', searchQuery: 'side step touch low impact exercise',
  },
  {
    id: 'heel-tap', number: 3, name: 'Heel Tap أمامي', subtitle: 'لمسة كعب أمامية', category: 'circulation',
    focus: 'الرجلين والدورة الدموية', cue: 'مدّي كعب قدام ولمسي الأرض بخفة، ثم رجّعيها وبدّلي.',
    alternatives: ['لمس الكعب قريبًا جدًا من الجسم.', 'رفع أصابع القدم فقط بالتبادل.'],
    youtubeId: 'eL6HXx0nHiM', searchQuery: 'standing heel tap front low impact exercise',
  },
  {
    id: 'back-toe-tap', number: 4, name: 'Back Toe Tap', subtitle: 'لمسة أصابع خلفية', category: 'circulation',
    focus: 'المؤخرة والتوازن', cue: 'رجّعي رجل لورا ولمسي الأرض بأطراف الأصابع مع ركبة الرجل الثابتة مرنة.',
    alternatives: ['خطوة خلفية صغيرة جدًا.', 'تحريك القدم للخلف وهي ملامسة للأرض.'],
    youtubeId: 't0dgz5Uxfqo', searchQuery: 'standing back toe tap exercise',
  },
  {
    id: 'standing-hamstring-curl', number: 5, name: 'Standing Hamstring Curl', subtitle: 'ثني الركبة للخلف واقف', category: 'circulation',
    focus: 'الفخذ الخلفي', cue: 'اسحبي الكعب ناحية المؤخرة بهدوء والركبتين جنب بعض.',
    alternatives: ['ثني الركبة بمدى صغير.', 'رفع الكعب سنتيمترات بسيطة فقط.'],
    youtubeId: 'oWu8RxtWdGE', searchQuery: 'standing hamstring curl bodyweight',
  },
  {
    id: 'low-knee-lift', number: 6, name: 'Low Knee Lift', subtitle: 'رفع ركبة منخفض', category: 'circulation',
    focus: 'البطن والفخذ', cue: 'ارفعي الركبة لحد مستوى مريح مع بطن مشدودة خفيف وظهر مستقيم.',
    alternatives: ['رفع الركبة ارتفاعًا قليلًا.', 'رفع الكعب مع بقاء مقدمة القدم قريبة من الأرض.'],
    youtubeId: '6EZjdNDHd-I', searchQuery: 'standing knee lift low impact exercise',
  },
  {
    id: 'calf-raise', number: 7, name: 'Calf Raise', subtitle: 'رفع الكعبين', category: 'circulation',
    focus: 'السمانة', cue: 'اطلعي على أطراف القدم ببطء، ثانية فوق، وانزلي بهدوء.',
    alternatives: ['رفع الكعبين نصف مدى مع الاستناد للحائط.', 'رفع كعب واحد كل مرة.'],
    youtubeId: 'Uyg2QR1WAq8', searchQuery: 'standing bodyweight calf raise',
  },
  {
    id: 'standing-hip-abduction', number: 8, name: 'Standing Hip Abduction', subtitle: 'فتح الرجل للجنب واقف', category: 'circulation',
    focus: 'المؤخرة الجانبية والحوض', cue: 'افتحي الرجل للجنب من غير ما الجسم يميل، وارجعي ببطء.',
    alternatives: ['لمس القدم إلى الجانب.', 'فتح القدم مسافة صغيرة مع الاستناد للحائط.'],
    youtubeId: 'qBqKuEQl9sI', searchQuery: 'standing hip abduction bodyweight',
  },
  {
    id: 'standing-hip-extension', number: 9, name: 'Standing Hip Extension', subtitle: 'مدّ الرجل للخلف واقف', category: 'circulation',
    focus: 'المؤخرة', cue: 'رجّعي الرجل لورا من المؤخرة من غير ما تقوّسي أسفل الضهر.',
    alternatives: ['لمس أطراف الأصابع خلف الجسم.', 'شد عضلات المؤخرة في مكانها من دون تحريك الرجل.'],
    youtubeId: 'i4rmRxPBmkY', searchQuery: 'standing hip extension bodyweight exercise',
  },
  {
    id: 'arm-march', number: 10, name: 'Low-Impact Arm March', subtitle: 'مشي مع حركة الذراعين', category: 'circulation',
    focus: 'الكتف والدورة الدموية', cue: 'امشي في المكان وحرّكي الذراعين لقدام ولفوق بالتبادل من غير شد للرقبة.',
    alternatives: ['تحريك الذراعين فقط.', 'تحريك ذراع واحدة في كل مرة.'],
    youtubeId: '9jsUJPgUw6I', searchQuery: 'standing march with arm swing low impact',
  },
  {
    id: 'wall-push-up', number: 11, name: 'Wall Push-Up', subtitle: 'ضغط على الحائط', category: 'upper-core',
    focus: 'الصدر والذراعين', cue: 'إيديكي على الحيطة بعرض الكتف، قرّبي صدرك ببطء وجسمك خط واحد.',
    alternatives: ['الوقوف قريبًا جدًا من الحائط.', 'ضغط راحتي اليدين في بعضهما أمام الصدر.'],
    youtubeId: 'YB0egDzsu18', searchQuery: 'wall push up beginner',
  },
  {
    id: 'shoulder-blade-squeeze', number: 12, name: 'Shoulder-Blade Squeeze', subtitle: 'ضم لوحي الكتف', category: 'upper-core',
    focus: 'أعلى الظهر', cue: 'اسحبي لوحي الكتف لورا ولتحت كأنك بتقرّبيهم، من غير رفع الكتف.',
    alternatives: ['سحب الكوعين للخلف بمدى صغير.', 'تدوير الكتفين للخلف ببطء.'],
    youtubeId: 'ouRhQE2iOI8', searchQuery: 'standing shoulder blade squeeze exercise',
  },
  {
    id: 'palm-press', number: 13, name: 'Standing Palm Press', subtitle: 'ضغط الكفين', category: 'upper-core',
    focus: 'الصدر', cue: 'اضغطي الكفين في بعض قدام الصدر والكوعين للجنب، مع نفَس طبيعي.',
    alternatives: ['ضغط خفيف بأطراف الأصابع.', 'ضغط متقطع لمدة ثانيتين ثم الاسترخاء.'],
    youtubeId: 'iXyqsLab9mA', searchQuery: 'standing palm press isometric chest',
  },
  {
    id: 'abdominal-brace', number: 14, name: 'Standing Abdominal Brace', subtitle: 'شد البطن واقف', category: 'upper-core',
    focus: 'البطن العميقة', cue: 'زفير هادئ مع شد البطن بدرجة خفيفة، من دون حبس النفس.',
    alternatives: ['اليدان فوق البطن مع تنفس طبيعي.', 'شد لمدة ثانيتين فقط ثم الاسترخاء.'],
    youtubeId: '7-0IjyAycWA', searchQuery: 'standing abdominal bracing exercise',
  },
  {
    id: 'cross-body-reach', number: 15, name: 'Cross-Body Reach', subtitle: 'مدّ الذراع بالعرض', category: 'upper-core',
    focus: 'البطن المائلة والكتف', cue: 'مدّي إيد ناحية الجنب العكسي مع لفّة صغيرة من أعلى الجذع وبدّلي.',
    alternatives: ['حركة الذراع من دون دوران الجذع.', 'دوران صغير جدًا مع تثبيت القدمين.'],
    youtubeId: '3Ni91zFz0yw', searchQuery: 'standing cross body reach exercise',
  },
  {
    id: 'standing-side-crunch', number: 16, name: 'Standing Side Crunch', subtitle: 'كرنش جانبي واقف', category: 'upper-core',
    focus: 'جانبي البطن', cue: 'قرّبي الكوع من الركبة في نفس الجانب من غير ما تميلي لقدام.',
    alternatives: ['ميل جانبي صغير من دون رفع الركبة.', 'رفع الركبة إلى الجانب من دون ميل الجذع.'],
    youtubeId: 'dsK2L5ifOvg', searchQuery: 'standing side crunch exercise',
  },
  {
    id: 'side-stretch', number: 17, name: 'Standing Side Stretch', subtitle: 'إطالة جانبية واقف', category: 'stretch',
    focus: 'جوانب الجذع', cue: 'ارفعي الذراعين فوق وميلي للجنب براحة، ثبات 20–30 ثانية لكل ناحية.',
    alternatives: ['يد واحدة فوق الرأس.', 'اليدان على الخصر مع ميل صغير.'],
    youtubeId: 'nmEoeicoW8w', searchQuery: 'standing side stretch overhead reach',
  },
  {
    id: 'chest-stretch', number: 18, name: 'Standing Chest Stretch', subtitle: 'إطالة الصدر واقف', category: 'stretch',
    focus: 'الصدر والكتف', cue: 'اشبكي الإيدين ورا ضهرك وافتحي الصدر بهدوء من غير ما تقوّسي.',
    alternatives: ['فتح الذراعين بمدى صغير.', 'سحب لوحي الكتف للخلف من دون مد الذراعين.'],
    youtubeId: 'UdU4XnU855Q', searchQuery: 'standing chest stretch hands behind back',
  },
  {
    id: 'calf-stretch', number: 19, name: 'Standing Calf Stretch', subtitle: 'إطالة السمانة واقف', category: 'stretch',
    focus: 'السمانة', cue: 'اسندي على الحيطة، رجل ورا والكعب ثابت في الأرض، وميلي لقدام براحة.',
    alternatives: ['خطوة خلفية أقصر.', 'رفع وخفض الكعب ببطء بدل الثبات.'],
    youtubeId: 'YTYQo4WvJHA', searchQuery: 'standing wall calf stretch',
  },
  {
    id: 'hamstring-hip-stretch', number: 20, name: 'Standing Hamstring/Hip Stretch', subtitle: 'إطالة الفخذ الخلفي والحوض', category: 'stretch',
    focus: 'الفخذ الخلفي والحوض', cue: 'الكعب أمام الجسم مع Hip Hinge بسيط والظهر مستقيم.',
    alternatives: ['مدى ميل صغير جدًا.', 'وضع القدم أمام الأخرى فقط من دون الميل.'],
    youtubeId: '5f5aHVj-f9Q', searchQuery: 'standing hamstring stretch heel forward hip hinge',
  },
]

export const libraryById = Object.fromEntries(library.map((exercise) => [exercise.id, exercise])) as Record<string, LibraryExercise>

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function youtubeEmbed(id: string, { autoplay = false, loop = false } = {}) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  if (autoplay) { params.set('autoplay', '1'); params.set('mute', '1') }
  if (loop) { params.set('loop', '1'); params.set('playlist', id) }
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`
}

export function youtubeWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeSearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}
