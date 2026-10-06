import { NICKNAMES } from '../workout/cheers'

/**
 * The line at the top of the home page, instead of a fixed "أهلًا يا منّة".
 * It follows what she logged today, in this order:
 * 1. a period-pain rest day (pain above 4): gentle, no pressure; extra praise if she trained anyway
 * 2. a full 100, or the workout and the water both done
 * 3. 7 pm or later with no workout (and no period or pain): a playful nudge
 * 4. the water target reached, or the workout done
 * 5. during a period, or with mild pain: soft
 * 6. otherwise a greeting for the time of day
 * Each kind has a few lines that rotate day by day, so the same day keeps the same line.
 */
export interface GreetingInput {
  dayNumber: number
  /** Cairo hour, 0–23. */
  hour: number
  painRest: boolean
  /** Any period pain logged today, or a period going on. */
  periodDay: boolean
  /** At least half the main workout done. */
  trained: boolean
  waterDone: boolean
  score: number
}

export type GreetingKind =
  | 'pain-trained' | 'pain' | 'perfect' | 'all-done' | 'lazy' | 'water' | 'trained' | 'period' | 'morning' | 'afternoon' | 'evening' | 'night'

/** From 7 pm with no workout, the greeting nudges her. */
export const LAZY_FROM_HOUR = 19

export function greetingKind(input: GreetingInput): GreetingKind {
  if (input.painRest) return input.trained ? 'pain-trained' : 'pain'
  if (input.score >= 100) return 'perfect'
  if (input.trained && input.waterDone) return 'all-done'
  if (!input.trained && !input.periodDay && input.hour >= LAZY_FROM_HOUR) return 'lazy'
  if (input.waterDone) return 'water'
  if (input.trained) return 'trained'
  if (input.periodDay) return 'period'
  if (input.hour < 5) return 'night'
  if (input.hour < 12) return 'morning'
  if (input.hour < 17) return 'afternoon'
  return 'evening'
}

/** `{nick}` is replaced with one of her nicknames. */
const LINES: Record<GreetingKind, { titles: string[]; lines: string[] }> = {
  pain: {
    titles: ['سلامتك يا منّة 🤍', 'ألف سلامة يا {nick} 🤍', 'سلامتك يا قلبي 🌸'],
    lines: [
      'عارفين إن البطل بتاعنا تعبان شوية، بس لو حب يتمرن التمرين هيبقى صغير عشان البطل بتاعنا النهارده صغنون.',
      'النهارده راحة ونقط التمرين محسوبة لك. ولو حبيتي تتحركي، فيه تمرين صغنون مستنيكي.',
      'ريّحي نفسك واشربي حاجة دافية ☕، والتمرين النهارده صغنون قوي لو حبيتي.',
      'مفيش تمرين غصب النهارده. خمس دقايق حركة هادية لو قدرتي، ولو لأ ولا يهمك.',
      'البطلة بتاعتنا تعبانة؟ النهارده على قدك خالص، ونقطك محفوظة.',
    ],
  },
  'pain-trained': {
    titles: ['بطلة بجد 💪🤍', 'مفيش زيك يا {nick} 🤍'],
    lines: [
      'اتمرنتي وانتي تعبانة؟ احنا فخورين بيكي قوي.',
      'حتى في الوجع اتحركتي، ده اسمه بطولة.',
      'برافو يا صغنونة، ريّحي بقى باقي اليوم.',
    ],
  },
  perfect: {
    titles: ['100 من 100 🏆', 'يوم كامل يا {nick} 🏆'],
    lines: [
      'تمرين ومية وأكل مظبوط، انتي مفيش زيك!',
      'النهارده يوم كامل، ارفعي راسك 👑',
      'كده اليوم اتقفل على 100، عاش يا بطلة.',
    ],
  },
  'all-done': {
    titles: ['يوم حلو قوي ✨', 'عاش يا {nick} ✨'],
    lines: [
      'التمرين خلص والمية خلصت، فاضل الأكل الحلو بس.',
      'تمرين ومية في يوم واحد؟ أشطر حد بجد.',
      'كده انتي ماشية صح خالص، كمّلي يومك حلو.',
    ],
  },
  lazy: {
    titles: ['يا عروسة! 😤', 'إيه يا بطل؟ 🥺', '{nick}؟ 👀'],
    lines: [
      'العروسة بتاعتنا مينفعش تكسل، الساعة عدّت 7 والتمرين لسه مستنيكي.',
      'البطل إيه؟ مضايق مننا ومش راضي يتمرن؟ 🥺',
      'التمرين زعلان إنك نسيتيه، ده كله عشرين دقيقة بس!',
      'الكسل مش لايق على أميرتي البينك 👑 يلا قومي.',
      'لسه فيه وقت قبل النوم: تمرين صغير وتنامي مبسوطة.',
    ],
  },
  water: {
    titles: ['برافو عليكي 💧', 'يا سلام عليكي 💧'],
    lines: [
      'أشطر حد خلّص التارجت النهارده 💧',
      'المية خلصت والتارجت اتقفل، عاش يا {nick}!',
      'جسمك بيشكرك على كل بُق مية 💦',
    ],
  },
  trained: {
    titles: ['برافو يا بطلة 💪', 'عاش يا {nick} 💪'],
    lines: [
      'تمرين النهارده خلص، فاضل المية والأكل.',
      'اتمرنتي النهارده، كده احنا مبسوطين منك قوي.',
      'خلّصتي التمرين؟ متنسيش تشربي مية كتير 💧',
    ],
  },
  period: {
    titles: ['أهلًا يا {nick} 🌸', 'إزيك النهارده يا منّة؟ 🌸'],
    lines: [
      'خفّي على نفسك النهارده، والتمرين على قد طاقتك.',
      'لو حاسة بوجع قيّميه في كارت البريود، والتمرين هيتظبط على قدك.',
      'النهارده براحتك، أي حركة هادية أحسن من مفيش.',
    ],
  },
  morning: {
    titles: ['صباح الفل يا منّة ☀️', 'صباح الورد يا {nick} 🌸', 'صباح الجمال يا منّة ☀️'],
    lines: [
      'يلا نبدأ اليوم حلو: إحساسك الأول، وبعدها التمرين.',
      'كوباية مية على الريق وبعدها نتمرن؟ 💧',
      'النهارده يوم جديد، وانتي قدّه.',
    ],
  },
  afternoon: {
    titles: ['أهلًا يا منّة 👋', 'إزيك يا {nick}؟ 👋'],
    lines: [
      'لسه اليوم في نصه، والتمرين مستنيكي.',
      'عشرين دقيقة تمرين وترجعي تكمّلي يومك.',
      'متنسيش المية، وبعدها نتمرن سوا.',
    ],
  },
  evening: {
    titles: ['مساء الفل يا منّة 🌙', 'مساء الورد يا {nick} 🌙'],
    lines: [
      'لسه فيه وقت للتمرين قبل الليل.',
      'يلا قبل الساعة 7 نخلّص التمرين 😉',
    ],
  },
  night: {
    titles: ['سهرانة يا {nick}؟ 🌙'],
    lines: ['نامي كويس، بكره يوم حلو.', 'السهر حلو بس النوم أحلى 😴'],
  },
}

const pick = <T>(list: T[], index: number) => list[((index % list.length) + list.length) % list.length]

export function greetingFor(input: GreetingInput) {
  const kind = greetingKind(input)
  const { titles, lines } = LINES[kind]
  const day = input.dayNumber - 1
  const nickname = pick(NICKNAMES, day)
  const fill = (text: string) => text.replaceAll('{nick}', nickname)
  return { kind, title: fill(pick(titles, day)), line: fill(pick(lines, day)) }
}
