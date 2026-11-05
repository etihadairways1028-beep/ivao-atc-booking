// Everything is shown and typed in UTC (zulu), as on the IVAO network.

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const todayUtc = () => new Date().toISOString().slice(0, 10)

export const formatDate = (iso: string) => iso.slice(0, 10)

export const formatTime = (iso: string) => `${iso.slice(11, 16)}z`

export const isSameUtcDay = (a: string, b: string) =>
  formatDate(a) === formatDate(b)

/**
 * Builds the booking period from a date and two HH:MM times. Like the old
 * scheduling form, an end time earlier than the start means the session goes
 * past midnight and ends the next day.
 */
export function toPeriod(date: string, from: string, to: string) {
  const startsAt = new Date(`${date}T${from}:00Z`)
  let endsAt = new Date(`${date}T${to}:00Z`)
  if (endsAt <= startsAt) {
    endsAt = new Date(endsAt.getTime() + ONE_DAY_MS)
  }
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }
}
