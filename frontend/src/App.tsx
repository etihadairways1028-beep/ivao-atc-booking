import { useState } from 'react'
import {
  api,
  errorMessage,
  IS_DEMO,
  type Booking,
  type BookingInput,
} from './api'
import { resetDemo } from './demoApi'
import { NavTabs } from './components/NavTabs'
import { ThemeToggle } from './components/ThemeToggle'
import { Toasts } from './components/Toasts'
import { UtcClock } from './components/UtcClock'
import { VidLogin } from './components/VidLogin'
import { useConfirm } from './hooks/useConfirm'
import { useGlassPointer } from './hooks/useGlassPointer'
import { useHashRoute } from './hooks/useHashRoute'
import { useToasts } from './hooks/useToasts'
import { useVid } from './hooks/useVid'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { SchedulePage } from './pages/SchedulePage'

export default function App() {
  const [vid, setVid] = useVid()
  const [route, navigate] = useHashRoute()
  const { toasts, push, dismiss } = useToasts()
  const [editing, setEditing] = useState<Booking | null>(null)
  // Bumped after every change so both pages reload their data.
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirm, confirmDialog] = useConfirm()

  useGlassPointer()

  const done = (message: string) => {
    push('success', message)
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
      push('error', errorMessage(err))
      return false
    }
  }

  const handleDelete = async (booking: Booking) => {
    const ok = await confirm(
      'Delete this booking?',
      `Your session on ${booking.callsign} will be removed from the schedule.`,
      'Delete',
    )
    if (!ok) return
    try {
      await api.remove(vid, booking.id)
      done(`Booking on ${booking.callsign} deleted.`)
    } catch (err) {
      push('error', errorMessage(err))
    }
  }

  // The edit form lives on the schedule page, so editing from
  // "My bookings" takes the user there.
  const startEditing = (booking: Booking) => {
    setEditing(booking)
    if (route !== 'schedule') navigate('schedule')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetDemo = () => {
    resetDemo()
    done('Demo data reset.')
  }

  const handleVidChange = (value: string) => {
    setVid(value)
    setEditing(null)
  }

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="topbar glass">
        <div className="brand">
          <h1>ATC Booking</h1>
          {IS_DEMO && (
            <button
              type="button"
              className="demo-badge"
              title="This demo runs in your browser. Click to reset its data."
              onClick={handleResetDemo}
            >
              Demo · reset
            </button>
          )}
        </div>
        <NavTabs route={route} />
        <UtcClock />
        <div className="topbar-actions">
          <ThemeToggle />
          <VidLogin vid={vid} onChange={handleVidChange} />
        </div>
      </header>

      {route === 'schedule' ? (
        <SchedulePage
          vid={vid}
          refreshKey={refreshKey}
          editing={editing}
          onEdit={startEditing}
          onCancelEdit={() => setEditing(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      ) : (
        <MyBookingsPage
          vid={vid}
          refreshKey={refreshKey}
          onEdit={startEditing}
          onDelete={handleDelete}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismiss} />
      {confirmDialog}
    </>
  )
}
