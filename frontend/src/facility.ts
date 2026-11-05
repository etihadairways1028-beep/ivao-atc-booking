// Facility type is the last part of the callsign: LFPG_N_APP -> APP.
export const facilityOf = (callsign: string) =>
  callsign.slice(callsign.lastIndexOf('_') + 1)

// Used as a class name; each facility has its own colour in index.css.
export const facilityClass = (callsign: string) =>
  `fac-${facilityOf(callsign).toLowerCase()}`
