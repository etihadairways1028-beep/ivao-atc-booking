export const FACILITIES = ['ALL', 'DEL', 'GND', 'TWR', 'APP', 'CTR'] as const
export type Facility = (typeof FACILITIES)[number]

/** Matches a booking against the search text and the facility chip. */
export function matchesFilter(
  booking: { callsign: string; vid: number },
  query: string,
  facility: Facility,
) {
  const text = query.trim().toUpperCase()
  const type = booking.callsign.slice(booking.callsign.lastIndexOf('_') + 1)
  const facilityOk =
    facility === 'ALL' ||
    type === facility ||
    (facility === 'APP' && type === 'DEP')
  const textOk =
    !text ||
    booking.callsign.includes(text) ||
    String(booking.vid).includes(text)
  return facilityOk && textOk
}
