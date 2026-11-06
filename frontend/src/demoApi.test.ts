import { beforeEach, describe, expect, it } from 'vitest'
import { demoApi, resetDemo } from './demoApi'

// The demo must enforce the same rules as the NestJS service, since it is
// what people see on the hosted demo.

const HOUR = 3_600_000
const at = (hours: number) => {
  const date = new Date(Date.now() + hours * HOUR)
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}
const slot = (callsign: string, from: number, to: number) => ({
  callsign,
  startsAt: at(from),
  endsAt: at(to),
})

const ALICE = '111111'
const BOB = '222222'

describe('demo API', () => {
  beforeEach(() => resetDemo())

  it('creates a booking and normalises the callsign', async () => {
    const booking = await demoApi.create(ALICE, slot('ksfo_twr', 2, 4))
    expect(booking).toMatchObject({ vid: 111111, callsign: 'KSFO_TWR' })
  })

  it.each([
    ['an invalid callsign', slot('PARIS', 2, 4), /valid position/],
    ['an end before the start', slot('KSFO_TWR', 4, 2), /end after/],
    ['a start in the past', slot('KSFO_TWR', -2, 1), /future/],
    ['more than 12 hours', slot('KSFO_TWR', 2, 15), /12 hours/],
  ])('rejects %s', async (_, input, message) => {
    await expect(demoApi.create(ALICE, input)).rejects.toThrow(message)
  })

  it('rejects overlaps on the position and for the user, not back-to-back', async () => {
    await demoApi.create(ALICE, slot('KSFO_TWR', 2, 4))
    await expect(demoApi.create(BOB, slot('KSFO_TWR', 3, 5))).rejects.toThrow(
      /already booked/,
    )
    await expect(demoApi.create(ALICE, slot('KLAX_GND', 1, 3))).rejects.toThrow(
      /You already have a booking/,
    )
    await expect(
      demoApi.create(BOB, slot('KSFO_TWR', 4, 6)),
    ).resolves.toBeTruthy()
  })

  it('only lets the owner edit or delete, and an edit can overlap itself', async () => {
    const booking = await demoApi.create(ALICE, slot('KSFO_TWR', 2, 4))
    await expect(
      demoApi.update(BOB, booking.id, slot('KSFO_TWR', 2, 3)),
    ).rejects.toThrow(/your own/)
    await expect(
      demoApi.update(ALICE, booking.id, slot('KSFO_TWR', 3, 5)),
    ).resolves.toMatchObject({ startsAt: at(3) })
    await expect(demoApi.remove(BOB, booking.id)).rejects.toThrow(/your own/)
    await demoApi.remove(ALICE, booking.id)
    expect(await demoApi.mine(ALICE)).toEqual([])
  })

  it('refuses to change a booking that already started', async () => {
    // The seed has 485573 controlling LFPG_TWR right now.
    const [live] = (await demoApi.mine('485573')).filter(
      (b) =>
        b.startsAt <= new Date().toISOString() &&
        b.endsAt > new Date().toISOString(),
    )
    await expect(demoApi.remove('485573', live.id)).rejects.toThrow(/ongoing/)
  })

  it('lists upcoming bookings sorted by position', async () => {
    const list = await demoApi.list()
    const callsigns = list.map((b) => b.callsign)
    expect(callsigns).toEqual([...callsigns].sort())
    expect(list.every((b) => b.endsAt > new Date().toISOString())).toBe(true)
  })
})
