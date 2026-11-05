import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { Booking } from './bookings/booking.entity';

const HOUR = 60 * 60 * 1000;

// [callsign, vid, start offset from the current hour, duration], in hours.
// Negative offsets give ongoing or past sessions, which the API itself
// would refuse to create.
const DEMO: [string, number, number, number][] = [
  ['LFPG_TWR', 485573, -1, 3],
  ['LFPG_GND', 512034, -2, 4],
  ['LFPG_N_APP', 601122, 1, 2],
  ['EGLL_DEL', 377210, 0, 2],
  ['EGLL_N_TWR', 455901, 3, 3],
  ['EGTT_CTR', 300112, 6, 4],
  ['EDDF_APP', 622480, -3, 2],
  ['EDDF_TWR', 589003, 8, 3],
  ['LFFF_E_CTR', 410777, 12, 5],
  ['OMDB_GND', 699001, 4, 2],
  ['OMDB_TWR', 700100, 14, 3],
  ['OMAE_CTR', 655432, 18, 4],
  ['KJFK_APP', 588231, 20, 3],
  ['LFPG_TWR', 512034, 5, 2],
  ['EGLL_DEL', 601122, 10, 2],
  ['EDDF_APP', 377210, 26, 3],
  ['LFPG_GND', 485573, -30, 2],
];

/** Fills an empty database with demo bookings around the current time. */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const bookings = app.get<Repository<Booking>>(getRepositoryToken(Booking));

  if ((await bookings.count()) > 0) {
    console.log('Database already has bookings, nothing to do.');
  } else {
    const hour = Math.floor(Date.now() / HOUR) * HOUR;
    await bookings.save(
      DEMO.map(([callsign, vid, offset, duration]) => ({
        callsign,
        vid,
        startsAt: new Date(hour + offset * HOUR),
        endsAt: new Date(hour + (offset + duration) * HOUR),
      })),
    );
    console.log(`Added ${DEMO.length} demo bookings.`);
  }

  await app.close();
}

void seed();
