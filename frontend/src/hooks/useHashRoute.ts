import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export type Route = 'schedule' | 'mine'

export const ROUTE_HASH: Record<Route, string> = {
  schedule: '#schedule',
  mine: '#my-bookings',
}

const currentRoute = (): Route =>
  window.location.hash === ROUTE_HASH.mine ? 'mine' : 'schedule'

/**
 * Plain #names (no #/paths) so links also survive hosts that only pass
 * simple fragments. Two pages don't need a router library: the route lives in the URL hash,
 * so links, reloads and the back button all work. Page changes go through
 * the View Transitions API when the browser supports it, which animates
 * between the old and new page (see index.css).
 */
export function useHashRoute() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onHashChange = () => {
      const update = () => setRoute(currentRoute())
      if (document.startViewTransition) {
        // flushSync so the new page is in the DOM when the snapshot is taken.
        document.startViewTransition(() => flushSync(update))
      } else {
        update()
      }
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (to: Route) => {
    window.location.hash = ROUTE_HASH[to]
  }

  return [route, navigate] as const
}
