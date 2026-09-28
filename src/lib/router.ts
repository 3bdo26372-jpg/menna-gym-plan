import { useEffect, useState } from 'react'

export type Route = 'today' | 'progress' | 'measurements' | 'rewards' | 'reports' | 'workout'
const ROUTES: Route[] = ['today', 'progress', 'measurements', 'rewards', 'reports', 'workout']

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
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const navigate = (route: Route) => {
  window.location.hash = `#/${route}`
}
