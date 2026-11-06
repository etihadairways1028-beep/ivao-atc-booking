import { describe, expect, it } from 'vitest'
import { addHours, formatDuration, shiftDate, toPeriod } from './time'

describe('toPeriod', () => {
  it('builds a same-day period in UTC', () => {
    expect(toPeriod('2026-03-10', '18:00', '20:30')).toEqual({
      startsAt: '2026-03-10T18:00:00.000Z',
      endsAt: '2026-03-10T20:30:00.000Z',
    })
  })

  it('treats an end before the start as the next day', () => {
    expect(toPeriod('2026-03-10', '22:00', '01:00').endsAt).toBe(
      '2026-03-11T01:00:00.000Z',
    )
  })

  it('treats equal times as a full day, which the API then refuses', () => {
    expect(toPeriod('2026-03-10', '10:00', '10:00').endsAt).toBe(
      '2026-03-11T10:00:00.000Z',
    )
  })
})

describe('time helpers', () => {
  it('adds hours across midnight', () => {
    expect(addHours('23:30', 2)).toBe('01:30')
    expect(addHours('09:15', 3)).toBe('12:15')
  })

  it('shifts dates across months and years', () => {
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('formats durations', () => {
    expect(formatDuration(2 * 3_600_000)).toBe('2h')
    expect(formatDuration(90 * 60_000)).toBe('1h 30m')
  })
})
