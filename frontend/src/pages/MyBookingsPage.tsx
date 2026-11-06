import { useCallback } from 'react'
import { api, type Booking } from '../api'
import {
  HoursByPosition,
  NextUpCard,
  WeekStrip,
} from '../components/MyOverview'
import { Skeleton } from '../components/Skeleton'
import { facilityClass } from '../facility'
import { useApiData } from '../hooks/useApiData'
import { useNow } from '../hooks/useNow'
import { formatDate, formatTime } from '../time'

type Props = {
  vid: string
  refreshKey: number
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

const HOUR_MS = 3_600_000

const durationOf = (b: Booking) =>
  (Date.parse(b.endsAt) - Date.parse(b.startsAt)) / HOUR_MS

function startsIn(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `Starts in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Starts in ${hours}h ${minutes % 60}m`
  return `Starts in ${Math.floor(hours / 24)}d ${hours % 24}h`
}

// The position a user books most often, for the summary tile.
function favouritePosition(bookings: Booking[]) {
  const counts = new Map<string, number>()
  for (const { callsign } of bookings) {
    counts.set(callsign, (counts.get(callsign) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function MyBookingsPage({ vid, refreshKey, onEdit, onDelete }: Props) {
  const now = useNow(30_000)
  const load = useCallback(
    (signal: AbortSignal) => api.mine(vid, signal),
    [vid],
  )
  const { data, error, loading } = useApiData(
    vid ? `${vid}|${refreshKey}` : null,
    load,
  )

  if (!vid) {
    return (
      <div className="page narrow">
        <div className="glass card welcome">
          <h2>My bookings</h2>
          <p className="muted">
            Sign in with your VID at the top to see your sessions.
          </p>
        </div>
      </div>
    )
  }

  const nowIso = now.toISOString()
  const bookings = data ?? []
  // The API returns newest first; upcoming ones read better soonest first.
  const upcoming = bookings.filter((b) => b.endsAt > nowIso).reverse()
  const past = bookings.filter((b) => b.endsAt <= nowIso)
  const totalHours = bookings.reduce((sum, b) => sum + durationOf(b), 0)

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h2 className="page-title">My bookings</h2>
          <p className="muted small">Sessions booked with VID {vid}.</p>
        </div>
      </div>

      <div className="stats">
        <div className="glass card stat">
          <span className="stat-label">Upcoming</span>
          <strong>{upcoming.length}</strong>
          <span className="stat-sub">sessions not ended yet</span>
        </div>
        <div className="glass card stat">
          <span className="stat-label">Completed</span>
          <strong>{past.length}</strong>
          <span className="stat-sub">sessions in your history</span>
        </div>
        <div className="glass card stat">
          <span className="stat-label">Hours booked</span>
          <strong>{totalHours.toFixed(1)}</strong>
          <span className="stat-sub">across all sessions</span>
        </div>
        <div className="glass card stat">
          <span className="stat-label">Most booked</span>
          <strong className="stat-callsign">
            {favouritePosition(bookings) ?? '—'}
          </strong>
          <span className="stat-sub">your usual position</span>
        </div>
      </div>

      <div className="stack">
        {error && <p className="alert error">{error}</p>}

        {!loading && (
          <div className="overview">
            <NextUpCard booking={upcoming[0]} now={now} onEdit={onEdit} />
            <WeekStrip bookings={upcoming} />
          </div>
        )}

        <section className="glass card">
          <div className="toolbar">
            <h2>All upcoming</h2>
          </div>

          {loading ? (
            <Skeleton rows={3} />
          ) : upcoming.length === 0 ? (
            <div className="empty-guide">
              <p>You have nothing booked yet.</p>
              <ol className="steps">
                <li>
                  Open <a href="#positions">Positions</a> to see what is free.
                </li>
                <li>Press “Book” on a position, pick a slot in UTC.</li>
                <li>Your sessions show up here, with a countdown.</li>
              </ol>
            </div>
          ) : (
            <div className="session-grid">
              {upcoming.map((booking) => {
                const live = booking.startsAt <= nowIso
                return (
                  <article
                    key={booking.id}
                    className={`session ${facilityClass(booking.callsign)}`}
                  >
                    <div className="session-head">
                      <span className="session-callsign">
                        {booking.callsign}
                      </span>
                      {live ? (
                        <span className="pill live">
                          <span className="live-dot" aria-hidden="true" /> Live
                        </span>
                      ) : (
                        <span className="pill">
                          {startsIn(
                            Date.parse(booking.startsAt) - now.getTime(),
                          )}
                        </span>
                      )}
                    </div>
                    <p className="session-time">
                      {formatDate(booking.startsAt)} ·{' '}
                      {formatTime(booking.startsAt)} –{' '}
                      {formatTime(booking.endsAt)}
                    </p>
                    <p className="muted small">
                      {durationOf(booking).toFixed(1)} h session
                    </p>
                    {!live && (
                      <div className="session-actions">
                        <button type="button" onClick={() => onEdit(booking)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => onDelete(booking)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <div className="split">
          {past.length > 0 ? (
            <section className="glass card">
              <div className="toolbar">
                <h2>History</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Date</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <span className="callsign">{booking.callsign}</span>
                        </td>
                        <td>{formatDate(booking.startsAt)}</td>
                        <td>{formatTime(booking.startsAt)}</td>
                        <td>{formatTime(booking.endsAt)}</td>
                        <td>{durationOf(booking).toFixed(1)} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="glass card">
              <div className="toolbar">
                <h2>History</h2>
              </div>
              <p className="muted empty">Finished sessions are listed here.</p>
            </section>
          )}
          <HoursByPosition bookings={bookings} />
        </div>
      </div>
    </div>
  )
}
