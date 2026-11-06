import { useCallback, useState } from 'react'
import { api, type Booking, type BookingInput } from '../api'
import { BookingForm } from '../components/BookingForm'
import { BookingsTable } from '../components/BookingsTable'
import { FilterBar } from '../components/FilterBar'
import { Skeleton } from '../components/Skeleton'
import { StatsBar } from '../components/StatsBar'
import { Timeline } from '../components/Timeline'
import { matchesFilter, type Facility } from '../filters'
import { useApiData } from '../hooks/useApiData'
import { shiftDate, todayUtc } from '../time'

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
  const [query, setQuery] = useState('')
  const [facility, setFacility] = useState<Facility>('ALL')

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

  const filtered = bookings?.filter((b) => matchesFilter(b, query, facility))
  const moveDay = (days: number) => setDate(shiftDate(date || todayUtc(), days))

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
        <div className="toolbar-controls day-nav">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous day"
            onClick={() => moveDay(-1)}
          >
            ‹
          </button>
          <input
            type="date"
            aria-label="Show bookings for a date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Next day"
            onClick={() => moveDay(1)}
          >
            ›
          </button>
          {date && (
            <button type="button" onClick={() => setDate('')}>
              Upcoming
            </button>
          )}
        </div>
      </div>

      <StatsBar bookings={bookings ?? []} vid={vid} date={date} />

      <main>
        <aside>
          {vid ? (
            <BookingForm
              // Remount on change so the form picks up the booking's values.
              key={editing?.id ?? 'new'}
              vid={vid}
              editing={editing}
              refreshKey={refreshKey}
              knownCallsigns={[
                ...new Set((bookings ?? []).map((b) => b.callsign)),
              ]}
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

          <FilterBar
            query={query}
            facility={facility}
            shown={filtered?.length ?? 0}
            total={bookings?.length ?? 0}
            onQueryChange={setQuery}
            onFacilityChange={setFacility}
          />

          {filtered && !loading ? (
            <Timeline
              bookings={filtered}
              vid={vid}
              date={date}
              onEdit={onEdit}
            />
          ) : (
            <section className="glass card">
              <Skeleton rows={7} />
            </section>
          )}

          <section className="glass card">
            <div className="toolbar">
              <div>
                <h2>{date ? 'All bookings that day' : 'Upcoming bookings'}</h2>
                <p className="muted small">Sorted by position · times in UTC</p>
              </div>
            </div>

            {loading || !filtered ? (
              <Skeleton rows={6} />
            ) : (
              <BookingsTable
                bookings={filtered}
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
