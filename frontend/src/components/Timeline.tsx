import {
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from 'react'
import type { Booking } from '../api'
import { facilityClass } from '../facility'
import { formatDate, formatDuration, formatTime } from '../time'
import { useNow } from '../hooks/useNow'

type Props = {
  bookings: Booking[]
  vid: string
  // Selected UTC day, or empty for a rolling 24h window starting now.
  date: string
  onEdit: (booking: Booking) => void
}

const HOUR_MS = 3_600_000
const SPAN_MS = 24 * HOUR_MS

/**
 * One row per position, one bar per booking, laid out on a 24h axis.
 * Positions are expressed in % of the window so the chart stays responsive
 * without measuring anything.
 */
export function Timeline({ bookings, vid, date, onEdit }: Props) {
  const now = useNow(60_000)
  const containerRef = useRef<HTMLDivElement>(null)
  // Booking under the pointer (or keyboard focus), and where to draw its card.
  const [hover, setHover] = useState<{
    booking: Booking
    x: number
    y: number
    below: boolean
  } | null>(null)

  const showTooltip = (booking: Booking) => (event: SyntheticEvent) => {
    const container = containerRef.current
    if (!container) return
    const bar = event.currentTarget.getBoundingClientRect()
    const box = container.getBoundingClientRect()
    // The timeline scrolls sideways, which also clips anything above it:
    // near the top the card goes under the bar, and it never leaves the sides.
    const below = bar.top - box.top < 110
    const x = bar.left + bar.width / 2 - box.left + container.scrollLeft
    setHover({
      booking,
      x: Math.min(Math.max(x, 110), container.scrollWidth - 110),
      y: below ? bar.bottom - box.top : bar.top - box.top,
      below,
    })
  }
  const hideTooltip = () => setHover(null)

  const windowStart = date
    ? Date.parse(`${date}T00:00:00Z`)
    : Math.floor(now.getTime() / HOUR_MS) * HOUR_MS - 2 * HOUR_MS
  const windowEnd = windowStart + SPAN_MS

  const percent = (time: number) =>
    ((Math.min(Math.max(time, windowStart), windowEnd) - windowStart) /
      SPAN_MS) *
    100

  const visible = bookings.filter(
    (b) =>
      Date.parse(b.startsAt) < windowEnd && Date.parse(b.endsAt) > windowStart,
  )
  const callsigns = [...new Set(visible.map((b) => b.callsign))].sort()

  const hours = Array.from({ length: 25 }, (_, i) => windowStart + i * HOUR_MS)
  const nowPercent =
    now.getTime() >= windowStart && now.getTime() <= windowEnd
      ? percent(now.getTime())
      : null

  return (
    <section className="glass card">
      <div className="toolbar">
        <div>
          <h2>Timeline</h2>
          <p className="muted small">
            {date ? `${date}, 00z to 24z` : 'Next 24 hours'} · click one of your
            bookings to edit it
          </p>
        </div>
      </div>

      {callsigns.length === 0 ? (
        <p className="muted empty">Nothing booked in this window.</p>
      ) : (
        <div className="timeline" ref={containerRef}>
          <div className="timeline-axis">
            <span />
            <div className="timeline-track">
              {hours.map((time, i) =>
                i % 3 === 0 ? (
                  <span
                    key={time}
                    className="timeline-hour"
                    style={{ left: `${(i / 24) * 100}%` }}
                  >
                    {new Date(time).toISOString().slice(11, 13)}z
                  </span>
                ) : null,
              )}
            </div>
          </div>

          {callsigns.map((callsign) => (
            <div key={callsign} className="timeline-row">
              <span className={`timeline-label ${facilityClass(callsign)}`}>
                {callsign}
              </span>
              <div className="timeline-track timeline-grid">
                {visible
                  .filter((b) => b.callsign === callsign)
                  .map((booking) => {
                    const start = Date.parse(booking.startsAt)
                    const mine = String(booking.vid) === vid
                    const editable = mine && start > now.getTime()
                    const style: CSSProperties = {
                      left: `${percent(start)}%`,
                      width: `${percent(Date.parse(booking.endsAt)) - percent(start)}%`,
                    }
                    const label = `${booking.callsign} · ${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)} · VID ${booking.vid}`

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        className={`timeline-bar ${facilityClass(callsign)}${mine ? ' mine' : ''}`}
                        style={style}
                        aria-label={label}
                        onPointerEnter={showTooltip(booking)}
                        onPointerLeave={hideTooltip}
                        onFocus={showTooltip(booking)}
                        onBlur={hideTooltip}
                        disabled={!editable}
                        onClick={() => onEdit(booking)}
                      >
                        <span>{booking.vid}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}

          {hover && (
            <div
              className={`glass tooltip${hover.below ? ' below' : ''}`}
              style={{ left: hover.x, top: hover.y }}
              role="tooltip"
            >
              <strong className={facilityClass(hover.booking.callsign)}>
                {hover.booking.callsign}
              </strong>
              <span>
                {formatDate(hover.booking.startsAt)} ·{' '}
                {formatTime(hover.booking.startsAt)}–
                {formatTime(hover.booking.endsAt)}
              </span>
              <span className="muted">
                {formatDuration(
                  Date.parse(hover.booking.endsAt) -
                    Date.parse(hover.booking.startsAt),
                )}{' '}
                · VID {hover.booking.vid}
                {String(hover.booking.vid) === vid && ' (you)'}
              </span>
              {String(hover.booking.vid) === vid &&
                Date.parse(hover.booking.startsAt) > now.getTime() && (
                  <span className="tooltip-action">Click to edit</span>
                )}
            </div>
          )}

          {nowPercent !== null && (
            <div className="timeline-now-layer" aria-hidden="true">
              <span />
              <div className="timeline-track">
                <div
                  className="timeline-now"
                  style={{ left: `${nowPercent}%` }}
                >
                  <span>now</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
