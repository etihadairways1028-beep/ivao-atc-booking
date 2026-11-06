import { demoApi } from './demoApi'
import {
  ApiError,
  type ApiClient,
  type Booking,
  type BookingInput,
} from './model'

export {
  ApiError,
  CALLSIGN_PATTERN,
  errorMessage,
  type Booking,
  type BookingInput,
} from './model'

const VID_HEADER = 'X-IVAO-VID'

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

const httpApi: ApiClient = {
  list: (date?: string, signal?: AbortSignal) =>
    call<Booking[]>(date ? `/bookings?date=${date}` : '/bookings', { signal }),

  mine: (vid: string, signal?: AbortSignal) =>
    call<Booking[]>('/bookings/mine', { vid, signal }),

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

/**
 * The demo build (npm run build:demo) has no server: it swaps in an
 * in-browser implementation with the same rules, so the site can be hosted
 * as static files.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true'

export const api: ApiClient = IS_DEMO ? demoApi : httpApi
