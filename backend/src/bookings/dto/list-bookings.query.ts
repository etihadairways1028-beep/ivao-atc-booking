import { IsDateString, IsOptional, Matches } from 'class-validator';

export class ListBookingsQuery {
  /** UTC day (YYYY-MM-DD). When omitted, upcoming bookings are returned. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @IsDateString({ strict: true })
  date?: string;
}
