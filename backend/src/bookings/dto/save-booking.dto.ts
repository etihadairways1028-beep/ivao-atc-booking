import { Transform, Type } from 'class-transformer';
import { IsDate, IsString, Matches } from 'class-validator';

// ICAO code, optional sector/sub-position, then the facility type.
// e.g. LFPG_TWR, LFPG_N_APP, EGTT_CTR, LFFF_E_CTR
export const CALLSIGN_PATTERN =
  /^[A-Z]{4}(_[A-Z0-9]{1,3})?_(DEL|GND|TWR|APP|DEP|CTR|FSS)$/;

// Used for both creation and edition: an edit always sends the full booking.
export class SaveBookingDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(CALLSIGN_PATTERN, {
    message: 'callsign must be a valid position, e.g. LFPG_TWR or LFFF_E_CTR',
  })
  callsign: string;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @Type(() => Date)
  @IsDate()
  endsAt: Date;
}
