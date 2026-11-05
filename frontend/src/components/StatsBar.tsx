import type { Booking } from '../api'
import { useNow } from '../useNow'

type Props = {
  bookings: Booking[]
  vid: string
  date: string
}

function formatCountdown(ms: number) {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `in ${hours}h ${String(minutes % 60).padStart(2, '0')}m`
  return `in ${Math.floor(hours / 24)}d ${hours % 24}h`
}

export function StatsBar({ bookings, vid, date }: Props) {
  const now = useNow(30_000)
  const nowIso = now.toISOString()

  const live = bookings.filter((b) => b.startsAt <= nowIso && b.endsAt > nowIso)
  const positions = new Set(bookings.map((b) => b.callsign)).size
  const hours =
    bookings.reduce(
      (total, b) => total + (Date.parse(b.endsAt) - Date.parse(b.startsAt)),
      0,
    ) / 3_600_000

  // The list is sorted by position, so look for the earliest start ourselves.
  const next = bookings
    .filter((b) => String(b.vid) === vid && b.startsAt > nowIso)
    .reduce<Booking | null>(
      (earliest, b) =>
        !earliest || b.startsAt < earliest.startsAt ? b : earliest,
      null,
    )

  return (
    <div className="stats">
      <div className="card stat stat-live">
        <span className="stat-label">
          <span className="live-dot" aria-hidden="true" /> Live now
        </span>
        <strong>{live.length}</strong>
        <span className="stat-sub">
          {live.length
            ? live.map((b) => b.callsign).join(' · ')
            : 'No one on position'}
        </span>
      </div>

      <div className="card stat stat-bookings">
        <span className="stat-label">{date ? 'On this day' : 'Upcoming'}</span>
        <strong>{bookings.length}</strong>
        <span className="stat-sub">{hours.toFixed(1)} h of ATC coverage</span>
      </div>

      <div className="card stat stat-positions">
        <span className="stat-label">Positions</span>
        <strong>{positions}</strong>
        <span className="stat-sub">distinct callsigns booked</span>
      </div>

      <div className="card stat stat-next">
        <span className="stat-label">Your next session</span>
        {next ? (
          <>
            <strong className="stat-callsign">{next.callsign}</strong>
            <span className="stat-sub">
              {formatCountdown(Date.parse(next.startsAt) - now.getTime())}
            </span>
          </>
        ) : (
          <>
            <strong>—</strong>
            <span className="stat-sub">
              {vid ? 'Nothing booked yet' : 'Sign in to see yours'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
