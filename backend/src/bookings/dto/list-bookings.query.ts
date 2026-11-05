import { IsDateString, IsOptional, Matches } from 'class-validator';

export class ListBookingsQuery {
  // When omitted, the endpoint returns upcoming bookings instead.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @IsDateString({ strict: true })
  date?: string;
}
