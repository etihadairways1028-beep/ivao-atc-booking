import { useCallback, useState } from 'react'
import { api, type Booking, type BookingInput } from '../api'
import { BookingForm } from '../components/BookingForm'
import { BookingsTable } from '../components/BookingsTable'
import { StatsBar } from '../components/StatsBar'
import { Timeline } from '../components/Timeline'
import { useApiData } from '../hooks/useApiData'

type Props = {
  vid: string
  refreshKey: number
  editing: Booking | null
  onEdit: (booking: Booking) => void
  onCancelEdit: () => void
  onSubmit: (input: BookingInput) => Promise<boolean>
  onDelete: (booking: Booking) => void
}

export function SchedulePage({
  vid,
  refreshKey,
  editing,
  onEdit,
  onCancelEdit,
  onSubmit,
  onDelete,
}: Props) {
  const [date, setDate] = useState('') // empty = upcoming bookings

  const load = useCallback(
    (signal: AbortSignal) => api.list(date || undefined, signal),
    [date],
  )
  const {
    data: bookings,
    error,
    fetchedAt,
    loading,
  } = useApiData(`${date}|${refreshKey}`, load)

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h2 className="page-title">
            {date ? `Schedule for ${date}` : 'Schedule'}
          </h2>
          <p className="muted small">
            {date
              ? 'All bookings overlapping this UTC day.'
              : 'Bookings that have not ended yet.'}
          </p>
        </div>
        <div className="toolbar-controls">
          {date && (
            <button type="button" onClick={() => setDate('')}>
              Show upcoming
            </button>
          )}
          <input
            type="date"
            aria-label="Show bookings for a date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <StatsBar bookings={bookings ?? []} vid={vid} date={date} />

      <main>
        <aside>
          {vid ? (
            <BookingForm
              // Remount on change so the form picks up the booking's values.
              key={editing?.id ?? 'new'}
              editing={editing}
              onSubmit={onSubmit}
              onCancel={onCancelEdit}
            />
          ) : (
            <div className="glass card welcome">
              <h2>Book a position</h2>
              <p className="muted">
                Sign in with your VID at the top to book, edit or delete your
                sessions.
              </p>
            </div>
          )}
        </aside>

        <div className="content">
          {error && <p className="alert error">{error}</p>}

          {bookings && !loading && (
            <Timeline
              bookings={bookings}
              vid={vid}
              date={date}
              onEdit={onEdit}
            />
          )}

          <section className="glass card">
            <div className="toolbar">
              <div>
                <h2>{date ? 'All bookings that day' : 'Upcoming bookings'}</h2>
                <p className="muted small">Sorted by position · times in UTC</p>
              </div>
            </div>

            {loading || !bookings ? (
              <p className="muted empty">Loading…</p>
            ) : (
              <BookingsTable
                bookings={bookings}
                now={fetchedAt}
                vid={vid}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
