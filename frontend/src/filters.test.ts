import { describe, expect, it } from 'vitest'
import { matchesFilter } from './filters'

const booking = (callsign: string, vid = 123456) => ({ callsign, vid })

describe('matchesFilter', () => {
  it('matches part of a callsign or a VID', () => {
    expect(matchesFilter(booking('LFPG_TWR'), 'lfpg', 'ALL')).toBe(true)
    expect(matchesFilter(booking('LFPG_TWR'), '3456', 'ALL')).toBe(true)
    expect(matchesFilter(booking('LFPG_TWR'), 'EGLL', 'ALL')).toBe(false)
  })

  it('filters by facility type, counting DEP as approach', () => {
    expect(matchesFilter(booking('LFFF_E_CTR'), '', 'CTR')).toBe(true)
    expect(matchesFilter(booking('LFPG_DEP'), '', 'APP')).toBe(true)
    expect(matchesFilter(booking('LFPG_GND'), '', 'TWR')).toBe(false)
  })
})
