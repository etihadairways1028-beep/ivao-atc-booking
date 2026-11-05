import { useEffect, useState } from 'react'
import { api, ApiError, type Booking, type BookingInput } from './api'
import { BookingForm } from './components/BookingForm'
import { BookingsTable } from './components/BookingsTable'
import { ThemeToggle } from './components/ThemeToggle'
import { VidLogin } from './components/VidLogin'
import { useVid } from './useVid'

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong, try again.'

export default function App() {
  const [vid, setVid] = useVid()
  const [date, setDate] = useState('') // empty = upcoming bookings
  const [refreshKey, setRefreshKey] = useState(0)
  // Remembers which request the list belongs to, so "loading" is derived
  // instead of being toggled by hand. `fetchedAt` is the reference time used
  // to decide which bookings are still editable.
  const [list, setList] = useState<{
    key: string
    bookings: Booking[]
    fetchedAt: string
  } | null>(null)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const requestKey = `${date}|${refreshKey}`
  const loading = list?.key !== requestKey

  useEffect(() => {
    // Aborting avoids showing a stale list when the date changes quickly.
    const controller = new AbortController()

    api
      .list(date || undefined, controller.signal)
      .then((bookings) =>
        setList({
          key: requestKey,
          bookings,
          fetchedAt: new Date().toISOString(),
        }),
      )
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(err))
      })

    return () => controller.abort()
  }, [date, requestKey])

  const done = (message: string) => {
    setError('')
    setNotice(message)
    setEditing(null)
    setRefreshKey((key) => key + 1)
  }

  const handleSubmit = async (input: BookingInput) => {
    try {
      if (editing) {
        await api.update(vid, editing.id, input)
        done(`Booking on ${input.callsign} updated.`)
      } else {
        await api.create(vid, input)
        done(`${input.callsign} booked.`)
      }
      return true
    } catch (err) {
      setNotice('')
      setError(errorMessage(err))
      return false
    }
  }

  const handleDelete = async (booking: Booking) => {
    if (!confirm(`Delete your booking on ${booking.callsign}?`)) return
    try {
      await api.remove(vid, booking.id)
      done(`Booking on ${booking.callsign} deleted.`)
    } catch (err) {
      setNotice('')
      setError(errorMessage(err))
    }
  }

  const startEditing = (booking: Booking) => {
    setNotice('')
    setError('')
    setEditing(booking)
  }

  const handleVidChange = (value: string) => {
    setVid(value)
    setEditing(null)
  }

  return (
    <>
      <div className="backdrop" aria-hidden="true" />

      <header className="glass topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <div>
            <h1>ATC Booking</h1>
            <p>Reserve a position on the network</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <VidLogin vid={vid} onChange={handleVidChange} />
        </div>
      </header>

      <main>
        <aside>
          {vid ? (
            <BookingForm
              // Remount on change so the form picks up the booking's values.
              key={editing?.id ?? 'new'}
              editing={editing}
              onSubmit={handleSubmit}
              onCancel={() => setEditing(null)}
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
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="alert success" role="status">
              {notice}
            </p>
          )}
        </aside>

        <section className="glass card">
          <div className="toolbar">
            <div>
              <h2>{date ? `Bookings on ${date}` : 'Upcoming bookings'}</h2>
              <p className="muted small">
                {list && !loading
                  ? `${list.bookings.length} booking${list.bookings.length === 1 ? '' : 's'} · times in UTC`
                  : 'Times in UTC'}
              </p>
            </div>
            <div className="toolbar-controls">
              {date && (
                <button type="button" onClick={() => setDate('')}>
                  Upcoming
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

          {loading || !list ? (
            <p className="muted empty">Loading…</p>
          ) : (
            <BookingsTable
              bookings={list.bookings}
              now={list.fetchedAt}
              vid={vid}
              onEdit={startEditing}
              onDelete={handleDelete}
            />
          )}
        </section>
      </main>
    </>
  )
}
