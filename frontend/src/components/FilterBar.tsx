import { useEffect, useRef } from 'react'
import { FACILITIES, type Facility } from '../filters'

type Props = {
  query: string
  facility: Facility
  shown: number
  total: number
  onQueryChange: (query: string) => void
  onFacilityChange: (facility: Facility) => void
}

export function FilterBar({
  query,
  facility,
  shown,
  total,
  onQueryChange,
  onFacilityChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" jumps to the search box, as on most sites with one.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).closest('input, textarea')
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="glass card filter-bar">
      <div className="search">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle
            cx="11"
            cy="11"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="m20 20-4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Filter by position or VID"
          aria-label="Filter by position or VID"
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <kbd aria-hidden="true">/</kbd>
      </div>

      <div className="chips" role="group" aria-label="Facility">
        {FACILITIES.map((fac) => (
          <button
            key={fac}
            type="button"
            className={`chip fac-${fac.toLowerCase()}`}
            aria-pressed={facility === fac}
            onClick={() => onFacilityChange(fac)}
          >
            {fac === 'ALL' ? 'All' : fac}
          </button>
        ))}
      </div>

      <span className="muted small filter-count">
        {shown === total ? `${total} bookings` : `${shown} of ${total}`}
      </span>
    </div>
  )
}
