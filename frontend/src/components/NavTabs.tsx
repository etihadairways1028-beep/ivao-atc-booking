import type { CSSProperties } from 'react'
import { ROUTE_HASH, type Route } from '../hooks/useHashRoute'

const TABS: { route: Route; label: string }[] = [
  { route: 'schedule', label: 'Schedule' },
  { route: 'mine', label: 'My bookings' },
]

export function NavTabs({ route }: { route: Route }) {
  const active = TABS.findIndex((tab) => tab.route === route)

  return (
    // --active drives the sliding indicator behind the current tab.
    <nav className="tabs" style={{ '--active': active } as CSSProperties}>
      {TABS.map((tab) => (
        <a
          key={tab.route}
          href={ROUTE_HASH[tab.route]}
          aria-current={tab.route === route ? 'page' : undefined}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}
