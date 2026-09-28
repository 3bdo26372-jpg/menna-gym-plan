import type { BodyFeeling, Energy, Mood, Overall, Sweating } from '../../shared/types'
import type { ChoiceOption } from '../components/ui'

export const ENERGY_OPTIONS: ChoiceOption<Energy>[] = [
  { value: 'low', label: 'منخفضة', emoji: '🪫' },
  { value: 'normal', label: 'عادية', emoji: '🙂' },
  { value: 'high', label: 'عالية', emoji: '⚡' },
]
export const MOOD_OPTIONS: ChoiceOption<Mood>[] = [
  { value: 'bad', label: 'مش أحسن حاجة', emoji: '🌧️' },
  { value: 'okay', label: 'تمام', emoji: '⛅' },
  { value: 'good', label: 'حلو', emoji: '☀️' },
]
export const BODY_OPTIONS: ChoiceOption<BodyFeeling>[] = [
  { value: 'fresh', label: 'فريش', emoji: '🌱' },
  { value: 'normal', label: 'عادي', emoji: '🙂' },
  { value: 'tired', label: 'تعبانة', emoji: '😮‍💨' },
]
export const SWEAT_OPTIONS: ChoiceOption<Sweating>[] = [
  { value: 'low', label: 'قليل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'high', label: 'كتير' },
]
export const OVERALL_OPTIONS: ChoiceOption<Overall>[] = [
  { value: 'easy', label: 'سهل', emoji: '🍃' },
  { value: 'perfect', label: 'مظبوط', emoji: '👌' },
  { value: 'hard', label: 'صعب', emoji: '🔥' },
]

export const labelOf = <T extends string | number>(options: ChoiceOption<T>[], value: T | null | undefined) =>
  options.find((option) => option.value === value)?.label ?? '—'
