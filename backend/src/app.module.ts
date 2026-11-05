import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './bookings/booking.entity';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH ?? 'bookings.sqlite',
      entities: [Booking],
      // Creates the table on startup. Fine for this exercise, a real
      // deployment would use migrations instead.
      synchronize: true,
    }),
    BookingsModule,
  ],
})
export class AppModule {}
