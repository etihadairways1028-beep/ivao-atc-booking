import { useCallback, useState, type FormEvent } from 'react'
import { api, CALLSIGN_PATTERN, type Booking, type BookingInput } from '../api'
import { useApiData } from '../hooks/useApiData'
import {
  addHours,
  formatDate,
  formatDuration,
  formatTime,
  nextFullHourUtc,
  shiftDate,
  todayUtc,
  toPeriod,
} from '../time'

type Props = {
  vid: string
  // When set, the form edits this booking instead of creating a new one.
  editing: Booking | null
  // Bumped after every change, so the availability panel stays current.
  refreshKey: number
  // Positions seen on the schedule, offered as suggestions.
  knownCallsigns: string[]
  // Resolves to false when the booking was refused, so the inputs are kept.
  onSubmit: (booking: BookingInput) => Promise<boolean>
  onCancel: () => void
}

const QUICK_DURATIONS = [1, 2, 3, 4]
const MAX_HOURS = 12

const initialValues = (booking: Booking | null) => ({
  callsign: booking?.callsign ?? '',
  date: booking ? formatDate(booking.startsAt) : todayUtc(),
  from: booking?.startsAt.slice(11, 16) ?? '',
  to: booking?.endsAt.slice(11, 16) ?? '',
})

export function BookingForm({
  vid,
  editing,
  refreshKey,
  knownCallsigns,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState(() => initialValues(editing))
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  const callsign = values.callsign.trim().toUpperCase()
  const validCallsign = CALLSIGN_PATTERN.test(callsign)
  const period =
    values.date && values.from && values.to
      ? toPeriod(values.date, values.from, values.to)
      : null
  const durationMs = period
    ? Date.parse(period.endsAt) - Date.parse(period.startsAt)
    : 0
  const endsNextDay = period && formatDate(period.endsAt) !== values.date

  // Everything booked on this position that day (and the next one, for a
  // session that crosses midnight), to warn before the server says no.
  const load = useCallback(
    async (signal: AbortSignal) => {
      const days = [values.date, shiftDate(values.date, 1)]
      const lists = await Promise.all(days.map((d) => api.list(d, signal)))
      const seen = new Set<number>()
      return lists
        .flat()
        .filter(
          (b) => b.callsign === callsign && !seen.has(b.id) && seen.add(b.id),
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    },
    [values.date, callsign],
  )
  const { data: positionBookings } = useApiData(
    validCallsign && values.date
      ? `${callsign}|${values.date}|${refreshKey}`
      : null,
    load,
  )
  const others = (positionBookings ?? []).filter((b) => b.id !== editing?.id)
  const sameDay = others.filter(
    (b) =>
      formatDate(b.startsAt) === values.date ||
      formatDate(b.endsAt) === values.date,
  )
  const overlap =
    period &&
    others.find((b) => b.startsAt < period.endsAt && b.endsAt > period.startsAt)

  const pickDuration = (hours: number) => {
    const from = values.from || nextFullHourUtc()
    setValues((current) => ({ ...current, from, to: addHours(from, hours) }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!period) return
    setSubmitting(true)
    try {
      const saved = await onSubmit({ callsign, ...period })
      if (saved && !editing) setValues(initialValues(null))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="glass card booking-form" onSubmit={handleSubmit}>
      <h2>
        {editing ? `Edit booking on ${editing.callsign}` : 'Book a position'}
      </h2>

      <label>
        Position
        <input
          className="mono"
          value={values.callsign}
          onChange={(e) => set('callsign')(e.target.value.toUpperCase())}
          placeholder="LFPG_TWR"
          list="known-callsigns"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={values.callsign !== '' && !validCallsign}
          required
        />
        <datalist id="known-callsigns">
          {knownCallsigns.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {values.callsign !== '' && !validCallsign && (
          <span className="field-hint">
            ICAO code + facility, e.g. LFPG_TWR or EGTT_N_CTR
          </span>
        )}
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

      <div className="time-row">
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
      </div>

      <div className="chips" role="group" aria-label="Quick duration">
        {QUICK_DURATIONS.map((hours) => (
          <button
            key={hours}
            type="button"
            className="chip"
            aria-pressed={durationMs === hours * 3_600_000}
            onClick={() => pickDuration(hours)}
          >
            {hours}h
          </button>
        ))}
      </div>

      {period && (
        <p
          className={`session-summary${durationMs > MAX_HOURS * 3_600_000 ? ' too-long' : ''}`}
        >
          {formatDuration(durationMs)} session
          {endsNextDay && ', ends the next day'}
          {durationMs > MAX_HOURS * 3_600_000 && ' · 12h maximum'}
        </p>
      )}

      {validCallsign && positionBookings && (
        <div
          className={`availability${overlap ? ' conflict' : sameDay.length ? ' booked' : ''}`}
        >
          {overlap ? (
            <p>
              <strong>Overlaps</strong> {formatTime(overlap.startsAt)}–
              {formatTime(overlap.endsAt)} by VID {overlap.vid}
            </p>
          ) : sameDay.length === 0 ? (
            <p>
              <strong>{callsign}</strong> is free all day.
            </p>
          ) : (
            <>
              <p>
                <strong>{callsign}</strong> already booked:
              </p>
              <ul>
                {sameDay.map((b) => (
                  <li key={b.id}>
                    {formatTime(b.startsAt)}–{formatTime(b.endsAt)}
                    <span className="muted">
                      {String(b.vid) === vid ? ' · you' : ` · ${b.vid}`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

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
