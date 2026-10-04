import { useEffect, useState } from 'react'

export type Route = 'today' | 'progress' | 'food' | 'measurements' | 'rewards' | 'reports' | 'period' | 'workout'
const ROUTES: Route[] = ['today', 'progress', 'food', 'measurements', 'rewards', 'reports', 'period', 'workout']

/** The section in "#/page/section", if any; it matches an element with id "section-<name>". */
function readSection() {
  return window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[1] ?? ''
}

/** Pages load lazily, so wait a little for the section to appear, then scroll to it. */
function scrollToSection() {
  const section = readSection()
  if (!section) return window.scrollTo({ top: 0, behavior: 'instant' })
  let tries = 0
  const attempt = () => {
    const element = document.getElementById(`section-${section}`)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (++tries < 60) requestAnimationFrame(attempt)
  }
  attempt()
}

function read(): Route {
  const name = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return (ROUTES as string[]).includes(name) ? (name as Route) : 'today'
}

/** Hash routing keeps the Vite build a static site on Vercel (no rewrites needed). */
export function useRoute() {
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      scrollToSection()
    }
    if (readSection()) scrollToSection()
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const navigate = (route: Route) => {
  window.location.hash = `#/${route}`
}
