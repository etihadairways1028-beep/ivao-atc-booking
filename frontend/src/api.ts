export type Booking = {
  id: number
  vid: number
  callsign: string
  startsAt: string
  endsAt: string
}

export type BookingInput = Pick<Booking, 'callsign' | 'startsAt' | 'endsAt'>

const VID_HEADER = 'X-IVAO-VID'

export class ApiError extends Error {}

async function call<T>(
  path: string,
  init: RequestInit & { vid?: string } = {},
): Promise<T> {
  const { vid, ...options } = init
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (vid) headers.set(VID_HEADER, vid)

  const response = await fetch(`/api${path}`, { ...options, headers })

  if (!response.ok) {
    // Nest sends { message: string | string[] } on errors.
    const body = await response.json().catch(() => null)
    const message = body?.message ?? response.statusText
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  list: (date?: string, signal?: AbortSignal) =>
    call<Booking[]>(date ? `/bookings?date=${date}` : '/bookings', { signal }),

  create: (vid: string, booking: BookingInput) =>
    call<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
      vid,
    }),

  update: (vid: string, id: number, booking: BookingInput) =>
    call<Booking>(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(booking),
      vid,
    }),

  remove: (vid: string, id: number) =>
    call<void>(`/bookings/${id}`, { method: 'DELETE', vid }),
}
