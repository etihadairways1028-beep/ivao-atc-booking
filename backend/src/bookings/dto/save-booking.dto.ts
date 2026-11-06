import { Transform, Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

// ICAO code, optional sector/sub-position, then the facility type.
// e.g. LFPG_TWR, LFPG_N_APP, EGTT_CTR, LFFF_E_CTR
export const CALLSIGN_PATTERN =
  /^[A-Z]{4}(_[A-Z0-9]{1,3})?_(DEL|GND|TWR|APP|DEP|CTR|FSS)$/;

// Used for both creation and edition: an edit always sends the full booking.
export class SaveBookingDto {
  /** Position callsign, e.g. LFPG_TWR. Case-insensitive. */
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(CALLSIGN_PATTERN, {
    message: 'callsign must be a valid position, e.g. LFPG_TWR or LFFF_E_CTR',
  })
  callsign: string;

  /** Start of the session (ISO 8601, UTC). Must be in the future. */
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  /** End of the session (ISO 8601, UTC). At most 12 hours after the start. */
  @Type(() => Date)
  @IsDate()
  endsAt: Date;
}
