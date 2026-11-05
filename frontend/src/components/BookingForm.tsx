import { useState, type FormEvent } from 'react'
import type { Booking, BookingInput } from '../api'
import { formatDate, todayUtc, toPeriod } from '../time'

type Props = {
  // When set, the form edits this booking instead of creating a new one.
  editing: Booking | null
  // Resolves to false when the booking was refused, so the inputs are kept.
  onSubmit: (booking: BookingInput) => Promise<boolean>
  onCancel: () => void
}

const initialValues = (booking: Booking | null) => ({
  callsign: booking?.callsign ?? '',
  date: booking ? formatDate(booking.startsAt) : todayUtc(),
  from: booking?.startsAt.slice(11, 16) ?? '',
  to: booking?.endsAt.slice(11, 16) ?? '',
})

export function BookingForm({ editing, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState(() => initialValues(editing))
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const saved = await onSubmit({
        callsign: values.callsign.trim().toUpperCase(),
        ...toPeriod(values.date, values.from, values.to),
      })
      if (saved && !editing) setValues(initialValues(null))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card booking-form" onSubmit={handleSubmit}>
      <h2>
        {editing ? `Edit booking on ${editing.callsign}` : 'Book a position'}
      </h2>

      <label>
        Position
        <input
          className="mono"
          value={values.callsign}
          onChange={(e) => set('callsign')(e.target.value)}
          placeholder="LFPG_TWR"
          required
        />
      </label>
      <label>
        Date (UTC)
        <input
          type="date"
          value={values.date}
          min={todayUtc()}
          onChange={(e) => set('date')(e.target.value)}
          required
        />
      </label>
      <label>
        From (UTC)
        <input
          type="time"
          value={values.from}
          onChange={(e) => set('from')(e.target.value)}
          required
        />
      </label>
      <label>
        To (UTC)
        <input
          type="time"
          value={values.to}
          onChange={(e) => set('to')(e.target.value)}
          required
        />
      </label>
      <p className="muted hint">
        An end time before the start time ends the next day.
      </p>

      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {editing ? 'Save' : 'Book'}
        </button>
        {editing && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
