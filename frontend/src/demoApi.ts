import {
  ApiError,
  type ApiClient,
  type Booking,
  type BookingInput,
} from './model'
import { readStorage, writeStorage } from './storage'

/**
 * In-browser stand-in for the NestJS API, used by the static demo build.
 * It applies the same rules, with the same messages, as BookingsService on
 * the backend; the backend remains the reference (and is the tested one).
 * Data lives in localStorage, so each visitor has their own sandbox.
 */

const STORAGE_KEY = 'demo-bookings'
const HOUR = 3_600_000
const DAY = 24 * HOUR
const MAX_DURATION = 12 * HOUR
const CALLSIGN_PATTERN =
  /^[A-Z]{4}(_[A-Z0-9]{1,3})?_(DEL|GND|TWR|APP|DEP|CTR|FSS)$/

// Same demo set as the backend's `npm run seed`:
// [callsign, vid, start offset from the current hour, duration], in hours.
const SEED: [string, number, number, number][] = [
  ['LFPG_TWR', 485573, -1, 3],
  ['LFPG_GND', 512034, -2, 4],
  ['LFPG_N_APP', 601122, 1, 2],
  ['EGLL_DEL', 377210, 0, 2],
  ['EGLL_N_TWR', 455901, 3, 3],
  ['EGTT_CTR', 300112, 6, 4],
  ['EDDF_APP', 622480, -3, 2],
  ['EDDF_TWR', 589003, 8, 3],
  ['LFFF_E_CTR', 410777, 12, 5],
  ['OMDB_GND', 699001, 4, 2],
  ['OMDB_TWR', 700100, 14, 3],
  ['OMAE_CTR', 655432, 18, 4],
  ['KJFK_APP', 588231, 20, 3],
  ['LFPG_TWR', 512034, 5, 2],
  ['EGLL_DEL', 601122, 10, 2],
  ['EDDF_APP', 377210, 26, 3],
  ['LFPG_GND', 485573, -30, 2],
]

let memory: Booking[] | null = null

function seed(): Booking[] {
  const hour = Math.floor(Date.now() / HOUR) * HOUR
  return SEED.map(([callsign, vid, offset, duration], i) => ({
    id: i + 1,
    vid,
    callsign,
    startsAt: new Date(hour + offset * HOUR).toISOString(),
    endsAt: new Date(hour + (offset + duration) * HOUR).toISOString(),
  }))
}

function load(): Booking[] {
  if (memory) return memory
  try {
    const stored = JSON.parse(readStorage(STORAGE_KEY) ?? 'null')
    memory = Array.isArray(stored) ? stored : seed()
  } catch {
    memory = seed()
  }
  return memory
}

function save(bookings: Booking[]) {
  memory = bookings
  writeStorage(STORAGE_KEY, JSON.stringify(bookings))
}

export function resetDemo() {
  save(seed())
}

// A tiny delay so loading states and transitions behave like the real thing.
const later = <T>(value: () => T) =>
  new Promise<T>((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(value())
      } catch (error) {
        reject(error)
      }
    }, 120),
  )

const byPosition = (a: Booking, b: Booking) =>
  a.callsign.localeCompare(b.callsign) || a.startsAt.localeCompare(b.startsAt)

function validate(vid: string, input: BookingInput) {
  if (!/^[1-9]\d{0,8}$/.test(vid)) {
    throw new ApiError('A valid VID must be sent in the x-ivao-vid header')
  }
  const callsign = input.callsign.trim().toUpperCase()
  if (!CALLSIGN_PATTERN.test(callsign)) {
    throw new ApiError(
      'callsign must be a valid position, e.g. LFPG_TWR or LFFF_E_CTR',
    )
  }
  const start = Date.parse(input.startsAt)
  const end = Date.parse(input.endsAt)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new ApiError('startsAt and endsAt must be valid dates')
  }
  if (start <= Date.now())
    throw new ApiError('A booking must start in the future')
  if (end <= start) throw new ApiError('A booking must end after it starts')
  if (end - start > MAX_DURATION) {
    throw new ApiError('A booking cannot last more than 12 hours')
  }
  return {
    callsign,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
  }
}

function assertNoConflict(
  bookings: Booking[],
  vid: number,
  { callsign, startsAt, endsAt }: BookingInput,
  excludeId?: number,
) {
  const conflict = bookings.find(
    (b) =>
      b.id !== excludeId &&
      b.startsAt < endsAt &&
      b.endsAt > startsAt &&
      (b.callsign === callsign || b.vid === vid),
  )
  if (!conflict) return
  throw new ApiError(
    conflict.callsign === callsign
      ? `${callsign} is already booked during this period`
      : `You already have a booking on ${conflict.callsign} during this period`,
  )
}

function findEditable(bookings: Booking[], vid: number, id: number) {
  const booking = bookings.find((b) => b.id === id)
  if (!booking) throw new ApiError(`Booking ${id} not found`)
  if (booking.vid !== vid) {
    throw new ApiError('You can only change your own bookings')
  }
  if (Date.parse(booking.startsAt) <= Date.now()) {
    throw new ApiError('Past or ongoing bookings cannot be changed')
  }
  return booking
}

export const demoApi: ApiClient = {
  list: (date) =>
    later(() => {
      const now = new Date().toISOString()
      const all = load()
      if (!date) return all.filter((b) => b.endsAt > now).sort(byPosition)
      const dayStart = new Date(`${date}T00:00:00Z`).toISOString()
      const dayEnd = new Date(Date.parse(dayStart) + DAY).toISOString()
      return all
        .filter((b) => b.startsAt < dayEnd && b.endsAt > dayStart)
        .sort(byPosition)
    }),

  mine: (vid) =>
    later(() =>
      load()
        .filter((b) => b.vid === Number(vid))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
        .slice(0, 50),
    ),

  create: (vid, input) =>
    later(() => {
      const period = validate(vid, input)
      const bookings = load()
      assertNoConflict(bookings, Number(vid), period)
      const booking: Booking = {
        id: Math.max(0, ...bookings.map((b) => b.id)) + 1,
        vid: Number(vid),
        ...period,
      }
      save([...bookings, booking])
      return booking
    }),

  update: (vid, id, input) =>
    later(() => {
      const period = validate(vid, input)
      const bookings = load()
      const booking = findEditable(bookings, Number(vid), id)
      assertNoConflict(bookings, Number(vid), period, id)
      const updated = { ...booking, ...period }
      save(bookings.map((b) => (b.id === id ? updated : b)))
      return updated
    }),

  remove: (vid, id) =>
    later(() => {
      const bookings = load()
      findEditable(bookings, Number(vid), id)
      save(bookings.filter((b) => b.id !== id))
    }),
}
