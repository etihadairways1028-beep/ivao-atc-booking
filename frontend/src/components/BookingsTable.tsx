import type { Booking } from '../api'
import { formatDate, formatTime, isSameUtcDay } from '../time'

type Props = {
  bookings: Booking[]
  now: string
  vid: string
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

export function BookingsTable({ bookings, now, vid, onEdit, onDelete }: Props) {
  if (bookings.length === 0) {
    return <p className="muted">No bookings.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Position</th>
          <th>Date</th>
          <th>From</th>
          <th>To</th>
          <th>VID</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {bookings.map((booking) => {
          // Same rule as the backend: own bookings that haven't started yet.
          const editable = String(booking.vid) === vid && booking.startsAt > now

          return (
            <tr key={booking.id} className={editable ? 'own' : undefined}>
              <td>
                <strong>{booking.callsign}</strong>
              </td>
              <td>{formatDate(booking.startsAt)}</td>
              <td>{formatTime(booking.startsAt)}</td>
              <td>
                {formatTime(booking.endsAt)}
                {!isSameUtcDay(booking.startsAt, booking.endsAt) && (
                  <span className="muted"> +1</span>
                )}
              </td>
              <td>{booking.vid}</td>
              <td>
                {editable && (
                  <div className="actions">
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
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
