export type Booking = {
  id: number
  vid: number
  callsign: string
  startsAt: string
  endsAt: string
}

export type BookingInput = Pick<Booking, 'callsign' | 'startsAt' | 'endsAt'>

/** An error whose message is meant for the user (from the API or the demo). */
export class ApiError extends Error {}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong, try again.'

export type ApiClient = {
  list: (date?: string, signal?: AbortSignal) => Promise<Booking[]>
  mine: (vid: string, signal?: AbortSignal) => Promise<Booking[]>
  create: (vid: string, booking: BookingInput) => Promise<Booking>
  update: (vid: string, id: number, booking: BookingInput) => Promise<Booking>
  remove: (vid: string, id: number) => Promise<void>
}
