import { useRef, useState, useSyncExternalStore, type ComponentType, type PointerEvent, type MouseEvent } from 'react'

export interface NavItem {
  route: string
  label: string
  icon: ComponentType<{ 'aria-hidden'?: boolean | 'true' }>
}

/** Pixels between two tabs' centres on the wheel. */
const STEP = 66
/** A finger has to move this far before a tap becomes a drag. */
const DRAG_SLOP = 6
/** A flick carries on for about this long before it settles. */
const FLING_MS = 180

const DESKTOP = '(min-width: 900px)'
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false)

/** `index` moved by whole turns to the copy closest to `position`, so the wheel turns the short way. */
const nearest = (index: number, position: number, count: number) => index + Math.round((position - index) / count) * count
/** How far tab `index` is from the middle, in tabs, between -count/2 and count/2. */
const offset = (index: number, position: number, count: number) => {
  const raw = (((index - position) % count) + count) % count
  return raw > count / 2 ? raw - count : raw
}

/**
 * The bottom bar on a phone: the tabs sit on a wheel that turns with her
 * finger, loops round with no end, and settles on the nearest tab. The page
 * she opens turns to the middle. It moves with transforms rather than
 * scrolling, because a scrolled fixed bar on iPhone could stop drawing its
 * tabs. On a wide screen it is a plain row in the top bar.
 */
export function NavWheel({ items, current }: { items: NavItem[]; current: string }) {
  const desktop = useDesktop()
  const count = items.length
  const active = items.findIndex((item) => item.route === current)
  const [position, setPosition] = useState(() => Math.max(0, active))
  const [dragging, setDragging] = useState(false)
  // Turn to a page opened from anywhere (a link, the back button).
  const [shown, setShown] = useState(active)
  if (shown !== active) {
    setShown(active)
    if (active >= 0) setPosition(nearest(active, position, count))
  }
  const drag = useRef<{ x: number; from: number; moved: boolean; samples: { x: number; t: number }[] } | null>(null)
  const swallowClick = useRef(false)

  if (desktop) {
    return (
      <nav className="nav" aria-label="الأقسام">
        {items.map(({ route, label, icon: Icon }) => (
          <a key={route} href={`#/${route}`} className="nav-link" aria-current={route === current ? 'page' : undefined}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </a>
        ))}
      </nav>
    )
  }

  function down(event: PointerEvent<HTMLElement>) {
    drag.current = { x: event.clientX, from: position, moved: false, samples: [{ x: event.clientX, t: event.timeStamp }] }
  }
  function move(event: PointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state) return
    const dx = event.clientX - state.x
    if (!state.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return
      state.moved = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    state.samples = [...state.samples.slice(-4), { x: event.clientX, t: event.timeStamp }]
    setPosition(state.from + dx / STEP)
  }
  function up() {
    const state = drag.current
    drag.current = null
    if (!state?.moved) return
    swallowClick.current = true
    setDragging(false)
    const first = state.samples[0]
    const last = state.samples[state.samples.length - 1]
    const speed = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0
    setPosition((value) => Math.round(value + (speed * FLING_MS) / STEP))
  }
  function click(event: MouseEvent<HTMLElement>) {
    // The tap that ends a drag shouldn't open a page.
    if (!swallowClick.current) return
    swallowClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <nav
      className={`nav nav-wheel${dragging ? ' is-dragging' : ''}`}
      aria-label="الأقسام"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={click}
    >
      {items.map(({ route, label, icon: Icon }, index) => {
        const away = offset(index, position, count)
        const distance = Math.abs(away)
        // A wheel's rim: the tabs drop and tilt as they turn away from the middle, and fade out at the sides.
        const x = -away * STEP
        const drop = 1.2 * away * away
        const tilt = (Math.atan((-2.4 * away) / STEP) * 180) / Math.PI
        const scale = Math.max(0.78, 1.08 - 0.1 * distance)
        const opacity = Math.min(1, Math.max(0, 1 - (distance - 1.5) * 0.45))
        return (
          <a
            key={route}
            href={`#/${route}`}
            className="nav-link"
            aria-current={route === current ? 'page' : undefined}
            style={{ transform: `translateX(calc(-50% + ${x}px)) translateY(${drop}px) rotate(${tilt}deg) scale(${scale})`, opacity, pointerEvents: opacity < 0.3 ? 'none' : undefined }}
            onFocus={() => setPosition((value) => nearest(index, value, count))}
            draggable={false}
          >
            <Icon aria-hidden="true" /><span>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
