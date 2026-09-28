import { HeartPulse } from 'lucide-react'
import { Notice } from './ui'

/** Calm, non-alarming guidance shown when pain or warning signs come up. */
export function SafetyNote({ compact = false }: { compact?: boolean }) {
  return (
    <Notice tone="care" icon={<HeartPulse />} title="جسمك أولًا">
      {compact
        ? 'لو حسيتي بدوخة أو ألم في الصدر أو نَفَس مقطوع بشكل غير معتاد، وقّفي وارتاحي.'
        : 'لو حسيتي بدوخة، أو ألم في الصدر، أو ضيق نَفَس غير معتاد، وقّفي التمرين فورًا وارتاحي، واطلبي مساعدة طبية لو الإحساس ما راحش. لو الألم في مفصل أو عضلة، ريّحي الجزء ده وما تزوديش الشدة.'}
    </Notice>
  )
}
