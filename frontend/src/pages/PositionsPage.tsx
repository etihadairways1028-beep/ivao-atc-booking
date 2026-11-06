import { useCallback, useState } from 'react'
import { api, type Booking } from '../api'
import { FilterBar } from '../components/FilterBar'
import { Skeleton } from '../components/Skeleton'
import { facilityClass, facilityOf } from '../facility'
import { matchesFilter, type Facility } from '../filters'
import { useApiData } from '../hooks/useApiData'
import { useNow } from '../hooks/useNow'
import { formatDuration, formatTime, isSameUtcDay } from '../time'

type Props = {
  vid: string
  refreshKey: number
  onBook: (callsign: string) => void
}

const HOUR = 3_600_000
const WINDOW = 24 * HOUR
// Ground up to en-route, the order controllers read a field in.
const FACILITY_ORDER = ['DEL', 'GND', 'TWR', 'DEP', 'APP', 'CTR', 'FSS']

type Position = {
  callsign: string
  live?: Booking
  next?: Booking
  upcoming: Booking[]
}

function toPositions(bookings: Booking[], now: string): Position[] {
  const byCallsign = new Map<string, Booking[]>()
  for (const b of bookings) {
    byCallsign.set(b.callsign, [...(byCallsign.get(b.callsign) ?? []), b])
  }
  return [...byCallsign].map(([callsign, list]) => {
    const sorted = list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    return {
      callsign,
      live: sorted.find((b) => b.startsAt <= now && b.endsAt > now),
      next: sorted.find((b) => b.startsAt > now),
      upcoming: sorted,
    }
  })
}

// LFPG_N_APP -> LFPG: positions are grouped by airport or FIR.
const icaoOf = (callsign: string) => callsign.slice(0, 4)

function startsIn(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours < 24
    ? `in ${hours}h ${minutes % 60}m`
    : `in ${Math.floor(hours / 24)}d`
}

export function PositionsPage({ vid, refreshKey, onBook }: Props) {
  const now = useNow(30_000)
  const [query, setQuery] = useState('')
  const [facility, setFacility] = useState<Facility>('ALL')

  const load = useCallback(
    (signal: AbortSignal) => api.list(undefined, signal),
    [],
  )
  const { data, error, loading } = useApiData(`positions|${refreshKey}`, load)

  const nowIso = now.toISOString()
  const all = toPositions(data ?? [], nowIso)
  const shown = all.filter((p) =>
    p.upcoming.some((b) => matchesFilter(b, query, facility)),
  )
  const groups = new Map<string, Position[]>()
  for (const p of shown.sort((a, b) => a.callsign.localeCompare(b.callsign))) {
    groups.set(icaoOf(p.callsign), [
      ...(groups.get(icaoOf(p.callsign)) ?? []),
      p,
    ])
  }
  for (const list of groups.values()) {
    list.sort(
      (a, b) =>
        FACILITY_ORDER.indexOf(facilityOf(a.callsign)) -
        FACILITY_ORDER.indexOf(facilityOf(b.callsign)),
    )
  }

  const staffed = all.filter((p) => p.live)
  const nextToOpen = all
    .filter((p) => !p.live && p.next)
    .sort((a, b) => a.next!.startsAt.localeCompare(b.next!.startsAt))[0]
  const busiest = [...groups.entries()].sort(
    (a, b) =>
      b[1].reduce((n, p) => n + p.upcoming.length, 0) -
      a[1].reduce((n, p) => n + p.upcoming.length, 0),
  )[0]

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h2 className="page-title">Positions</h2>
          <p className="muted small">
            Every position on the schedule: who is on it now, and who is next.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="glass card stat">
          <span className="stat-label">
            <span className="live-dot" aria-hidden="true" /> Staffed now
          </span>
          <strong>
            {staffed.length}
            <span className="stat-of"> / {all.length}</span>
          </strong>
          <span className="stat-sub">positions with a controller</span>
        </div>
        <div className="glass card stat">
          <span className="stat-label">Free right now</span>
          <strong>{all.length - staffed.length}</strong>
          <span className="stat-sub">booked later, open now</span>
        </div>
        <div className="glass card stat">
          <span className="stat-label">Next to open</span>
          <strong className="stat-callsign">
            {nextToOpen?.callsign ?? '—'}
          </strong>
          <span className="stat-sub">
            {nextToOpen
              ? `${formatTime(nextToOpen.next!.startsAt)}, ${startsIn(Date.parse(nextToOpen.next!.startsAt) - now.getTime())}`
              : 'nothing scheduled'}
          </span>
        </div>
        <div className="glass card stat">
          <span className="stat-label">Busiest field</span>
          <strong className="stat-callsign">{busiest?.[0] ?? '—'}</strong>
          <span className="stat-sub">
            {busiest
              ? `${busiest[1].length} position${busiest[1].length === 1 ? '' : 's'} booked`
              : 'no bookings yet'}
          </span>
        </div>
      </div>

      <div className="stack">
        {error && <p className="alert error">{error}</p>}

        <FilterBar
          query={query}
          facility={facility}
          shown={shown.length}
          total={all.length}
          noun="positions"
          onQueryChange={setQuery}
          onFacilityChange={setFacility}
        />

        {loading ? (
          <section className="glass card">
            <Skeleton rows={6} />
          </section>
        ) : groups.size === 0 ? (
          <section className="glass card">
            <p className="muted empty">No position matches this filter.</p>
          </section>
        ) : (
          <div className="group-grid">
            {[...groups].map(([icao, positions]) => (
              <section key={icao} className="glass card">
                <div className="toolbar">
                  <h2 className="group-title">{icao}</h2>
                  <span className="muted small">
                    {positions.filter((p) => p.live).length} of{' '}
                    {positions.length} staffed
                  </span>
                </div>
                <div className="position-grid">
                  {positions.map((p) => (
                    <PositionCard
                      key={p.callsign}
                      position={p}
                      now={now.getTime()}
                      vid={vid}
                      onBook={onBook}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PositionCard({
  position,
  now,
  vid,
  onBook,
}: {
  position: Position
  now: number
  vid: string
  onBook: (callsign: string) => void
}) {
  const { callsign, live, next, upcoming } = position
  const percent = (t: number) =>
    (Math.min(Math.max(t - now, 0), WINDOW) / WINDOW) * 100
  const mine = (b: Booking) => String(b.vid) === vid

  return (
    <article
      className={`position ${facilityClass(callsign)}${live ? ' is-live' : ''}`}
    >
      <div className="session-head">
        <span className="session-callsign">{callsign}</span>
        {live ? (
          <span className="pill live">
            <span className="live-dot" aria-hidden="true" /> Live
          </span>
        ) : (
          <span className="pill muted-pill">Open</span>
        )}
      </div>

      <dl className="position-facts">
        <div>
          <dt>Now</dt>
          <dd>
            {live
              ? `${mine(live) ? 'You' : `VID ${live.vid}`} until ${formatTime(live.endsAt)}`
              : 'No controller'}
          </dd>
        </div>
        <div>
          <dt>Next</dt>
          <dd>
            {next
              ? `${formatTime(next.startsAt)}–${formatTime(next.endsAt)}${isSameUtcDay(next.startsAt, new Date(now).toISOString()) ? '' : ' (+1)'} · ${mine(next) ? 'you' : next.vid}`
              : 'Nothing booked'}
          </dd>
        </div>
      </dl>

      {/* Coverage over the next 24 hours, starting now. */}
      <div className="coverage" aria-hidden="true">
        {upcoming.map((b) => (
          <span
            key={b.id}
            className={mine(b) ? 'mine' : undefined}
            style={{
              left: `${percent(Date.parse(b.startsAt))}%`,
              width: `${percent(Date.parse(b.endsAt)) - percent(Date.parse(b.startsAt))}%`,
            }}
          />
        ))}
      </div>
      <div className="coverage-scale muted">
        <span>now</span>
        <span>
          {formatDuration(
            upcoming.reduce(
              (sum, b) =>
                sum +
                Math.max(
                  0,
                  Math.min(Date.parse(b.endsAt), now + WINDOW) -
                    Math.max(Date.parse(b.startsAt), now),
                ),
              0,
            ),
          )}{' '}
          covered
        </span>
        <span>+24h</span>
      </div>

      <button
        type="button"
        className="position-book"
        onClick={() => onBook(callsign)}
      >
        Book {callsign}
      </button>
    </article>
  )
}
