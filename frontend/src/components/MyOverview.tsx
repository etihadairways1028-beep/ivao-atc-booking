import type { Booking } from '../api'
import { facilityClass } from '../facility'
import { formatDuration, formatTime, shiftDate, todayUtc } from '../time'

const HOUR = 3_600_000
const durationMs = (b: Booking) => Date.parse(b.endsAt) - Date.parse(b.startsAt)

function countdown(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(minutes / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${String(minutes % 60).padStart(2, '0')}m`
  return `${minutes} min`
}

/** The session that matters most: the live one, or the soonest. */
export function NextUpCard({
  booking,
  now,
  onEdit,
}: {
  booking: Booking | undefined
  now: Date
  onEdit: (booking: Booking) => void
}) {
  if (!booking) {
    return (
      <section className="glass card next-up empty-next">
        <span className="stat-label">Next up</span>
        <p className="muted">No session booked.</p>
        <a className="button-link" href="#positions">
          Find a position to book
        </a>
      </section>
    )
  }

  const live = Date.parse(booking.startsAt) <= now.getTime()
  const target = live ? booking.endsAt : booking.startsAt
  const total = durationMs(booking)
  const elapsed = Math.min(
    Math.max(now.getTime() - Date.parse(booking.startsAt), 0),
    total,
  )

  return (
    <section
      className={`glass card next-up ${facilityClass(booking.callsign)}`}
    >
      <span className="stat-label">
        {live && <span className="live-dot" aria-hidden="true" />}
        {live ? 'On position now' : 'Next up'}
      </span>
      <strong className="next-callsign">{booking.callsign}</strong>
      <p className="next-when">
        {booking.startsAt.slice(0, 10)} · {formatTime(booking.startsAt)}–
        {formatTime(booking.endsAt)} · {formatDuration(total)}
      </p>
      <p className="next-countdown">
        {live ? 'Ends in ' : 'Starts in '}
        <strong>{countdown(Date.parse(target) - now.getTime())}</strong>
      </p>
      {live ? (
        <div className="progress" aria-label="Session progress">
          <span style={{ width: `${(elapsed / total) * 100}%` }} />
        </div>
      ) : (
        <button type="button" onClick={() => onEdit(booking)}>
          Edit this booking
        </button>
      )}
    </section>
  )
}

/** The next seven UTC days, with your sessions on each. */
export function WeekStrip({ bookings }: { bookings: Booking[] }) {
  const today = todayUtc()
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(today, i))

  return (
    <section className="glass card week">
      <div className="toolbar">
        <h2>Your week</h2>
        <span className="muted small">UTC days</span>
      </div>
      <div className="week-grid">
        {days.map((day, i) => {
          const sessions = bookings.filter(
            (b) => b.startsAt.slice(0, 10) === day,
          )
          const label = new Date(`${day}T00:00:00Z`).toLocaleDateString(
            'en-GB',
            {
              weekday: 'short',
              timeZone: 'UTC',
            },
          )
          return (
            <div key={day} className={`week-day${i === 0 ? ' today' : ''}`}>
              <span className="week-label">{i === 0 ? 'Today' : label}</span>
              <span className="week-date">{day.slice(8)}</span>
              {sessions.length === 0 ? (
                <span className="week-empty">—</span>
              ) : (
                sessions.map((b) => (
                  <span
                    key={b.id}
                    className={`week-chip ${facilityClass(b.callsign)}`}
                  >
                    {b.callsign}
                    <small>{formatTime(b.startsAt)}</small>
                  </span>
                ))
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Where your hours go, across every session (past and upcoming). */
export function HoursByPosition({ bookings }: { bookings: Booking[] }) {
  const totals = new Map<string, number>()
  for (const b of bookings) {
    totals.set(b.callsign, (totals.get(b.callsign) ?? 0) + durationMs(b))
  }
  const rows = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const max = rows[0]?.[1] ?? 1

  return (
    <section className="glass card">
      <div className="toolbar">
        <h2>Hours by position</h2>
      </div>
      {rows.length === 0 ? (
        <p className="muted empty">Your hours will show up here.</p>
      ) : (
        <ul className="bars">
          {rows.map(([callsign, ms]) => (
            <li key={callsign} className={facilityClass(callsign)}>
              <span className="callsign">{callsign}</span>
              <span className="bar">
                <span style={{ width: `${(ms / max) * 100}%` }} />
              </span>
              <span className="bar-value">{(ms / HOUR).toFixed(1)} h</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
