import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { MEDIA_CREDIT, type Exercise } from '../../shared/exercises'

/** Exercise demo animation with the required credit and a graceful fallback. */
export function ExerciseMedia({ exercise, size = 'md', eager = false, credit = true }: {
  exercise: Exercise
  size?: 'sm' | 'md' | 'lg'
  eager?: boolean
  credit?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <figure className={`exercise-media media-${size}`}>
      {failed ? (
        <span className="media-fallback"><ImageOff aria-hidden="true" /> {exercise.nameAr}</span>
      ) : (
        <img
          src={exercise.media} alt={`عرض حركة ${exercise.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async"
          width={180} height={180} onError={() => setFailed(true)}
        />
      )}
      {credit && size !== 'sm' && (
        <figcaption>{exercise.mediaSource === 'gymvisual' ? MEDIA_CREDIT : 'رسم توضيحي'}</figcaption>
      )}
    </figure>
  )
}
