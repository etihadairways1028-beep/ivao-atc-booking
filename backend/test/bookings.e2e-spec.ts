import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Booking } from '../src/bookings/booking.entity';

const HOUR = 60 * 60 * 1000;

// Whole hours from now, so periods line up nicely in the assertions.
const at = (hours: number) => {
  const date = new Date(Date.now() + hours * HOUR);
  date.setUTCMinutes(0, 0, 0);
  return date;
};

const ALICE = '111111';
const BOB = '222222';

describe('Bookings (e2e)', () => {
  let app: INestApplication<App>;
  let repository: Repository<Booking>;

  const book = (vid: string, callsign: string, from: number, to: number) =>
    request(app.getHttpServer())
      .post('/api/bookings')
      .set('X-IVAO-VID', vid)
      .send({ callsign, startsAt: at(from), endsAt: at(to) });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    repository = moduleRef.get(getRepositoryToken(Booking));
  });

  afterEach(() => app.close());

  describe('identification', () => {
    it('requires a VID header to book', () =>
      request(app.getHttpServer())
        .post('/api/bookings')
        .send({ callsign: 'LFPG_TWR', startsAt: at(2), endsAt: at(3) })
        .expect(401));

    it('rejects a malformed VID', () =>
      book('abc', 'LFPG_TWR', 2, 3).expect(401));
  });

  describe('POST /bookings', () => {
    it('creates a booking for the identified user', async () => {
      const { body } = await book(ALICE, 'lfpg_twr', 2, 4).expect(201);

      expect(body).toMatchObject({ vid: 111111, callsign: 'LFPG_TWR' });
    });

    it.each([
      ['an invalid callsign', { callsign: 'PARIS' }],
      ['an end before the start', { startsAt: at(4), endsAt: at(2) }],
      ['a start in the past', { startsAt: at(-2), endsAt: at(1) }],
      ['a booking longer than 12h', { startsAt: at(2), endsAt: at(15) }],
      ['a forged owner', { vid: 222222 }],
    ])('rejects %s', (_, override) =>
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('X-IVAO-VID', ALICE)
        .send({
          callsign: 'LFPG_TWR',
          startsAt: at(2),
          endsAt: at(4),
          ...override,
        })
        .expect(400),
    );

    it('rejects a position already booked during the period', async () => {
      await book(ALICE, 'LFPG_TWR', 2, 4).expect(201);
      await book(BOB, 'LFPG_TWR', 3, 5).expect(409);
    });

    it('rejects a user already booked elsewhere during the period', async () => {
      await book(ALICE, 'LFPG_TWR', 2, 4).expect(201);
      await book(ALICE, 'EGLL_GND', 1, 3).expect(409);
    });

    it('allows back-to-back bookings', async () => {
      await book(ALICE, 'LFPG_TWR', 2, 4).expect(201);
      await book(BOB, 'LFPG_TWR', 4, 6).expect(201);
      await book(ALICE, 'EGLL_GND', 4, 6).expect(201);
    });

    it('only accepts one of several simultaneous requests for a slot', async () => {
      const vids = ['1001', '1002', '1003', '1004', '1005'];
      const responses = await Promise.all(
        vids.map((vid) => book(vid, 'LFPG_TWR', 2, 4)),
      );

      expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
      expect(await repository.count()).toBe(1);
    });
  });

  describe('PUT /bookings/:id', () => {
    const edit = (vid: string, id: number, from: number, to: number) =>
      request(app.getHttpServer())
        .put(`/api/bookings/${id}`)
        .set('X-IVAO-VID', vid)
        .send({ callsign: 'LFPG_TWR', startsAt: at(from), endsAt: at(to) });

    it('lets the owner move their booking, even over its own slot', async () => {
      const { body } = await book(ALICE, 'LFPG_TWR', 2, 4);
      const { body: updated } = await edit(ALICE, body.id, 3, 5).expect(200);

      expect(new Date(updated.startsAt)).toEqual(at(3));
    });

    it("refuses to edit someone else's booking", async () => {
      const { body } = await book(ALICE, 'LFPG_TWR', 2, 4);
      await edit(BOB, body.id, 2, 3).expect(403);
    });

    it('refuses an edit overlapping another booking', async () => {
      const { body } = await book(ALICE, 'LFPG_TWR', 2, 4);
      await book(BOB, 'LFPG_TWR', 5, 7);
      await edit(ALICE, body.id, 3, 6).expect(409);
    });

    it('refuses to edit a booking that already started', async () => {
      const ongoing = await repository.save({
        vid: 111111,
        callsign: 'LFPG_TWR',
        startsAt: at(-1),
        endsAt: at(1),
      });
      await edit(ALICE, ongoing.id, 2, 3).expect(403);
    });

    it('returns 404 for an unknown booking', () =>
      edit(ALICE, 999, 2, 3).expect(404));
  });

  describe('DELETE /bookings/:id', () => {
    const remove = (vid: string, id: number) =>
      request(app.getHttpServer())
        .delete(`/api/bookings/${id}`)
        .set('X-IVAO-VID', vid);

    it('lets only the owner delete a booking', async () => {
      const { body } = await book(ALICE, 'LFPG_TWR', 2, 4);

      await remove(BOB, body.id).expect(403);
      await remove(ALICE, body.id).expect(204);
      await remove(ALICE, body.id).expect(404);
    });
  });

  describe('GET /bookings', () => {
    it('lists upcoming bookings sorted by position', async () => {
      await book(ALICE, 'LFPG_TWR', 2, 4);
      await book(BOB, 'EGLL_GND', 6, 8);
      await repository.save({
        vid: 333333,
        callsign: 'AAAA_TWR',
        startsAt: at(-5),
        endsAt: at(-3),
      });

      const { body } = await request(app.getHttpServer())
        .get('/api/bookings')
        .expect(200);

      expect(body.map((b: Booking) => b.callsign)).toEqual([
        'EGLL_GND',
        'LFPG_TWR',
      ]);
    });

    it('lists bookings of a past date', async () => {
      await repository.save({
        vid: 111111,
        callsign: 'LFPG_TWR',
        startsAt: new Date('2024-03-10T22:00:00Z'),
        endsAt: new Date('2024-03-11T01:00:00Z'),
      });

      // Spans midnight, so it shows up on both days.
      for (const date of ['2024-03-10', '2024-03-11']) {
        const { body } = await request(app.getHttpServer())
          .get(`/api/bookings?date=${date}`)
          .expect(200);
        expect(body).toHaveLength(1);
      }

      await request(app.getHttpServer())
        .get('/api/bookings?date=2024-03-12')
        .expect(200, []);
    });

    it('rejects a malformed date', () =>
      request(app.getHttpServer())
        .get('/api/bookings?date=tomorrow')
        .expect(400));
  });

  describe('GET /bookings/mine', () => {
    it("returns only the user's bookings, newest first, past included", async () => {
      await book(ALICE, 'LFPG_TWR', 2, 4);
      await book(ALICE, 'EGLL_GND', 6, 8);
      await book(BOB, 'EDDF_APP', 2, 4);
      await repository.save({
        vid: 111111,
        callsign: 'LFPG_GND',
        startsAt: at(-30),
        endsAt: at(-28),
      });

      const { body } = await request(app.getHttpServer())
        .get('/api/bookings/mine')
        .set('X-IVAO-VID', ALICE)
        .expect(200);

      expect(body.map((b: Booking) => b.callsign)).toEqual([
        'EGLL_GND',
        'LFPG_TWR',
        'LFPG_GND',
      ]);
    });

    it('requires a VID', () =>
      request(app.getHttpServer()).get('/api/bookings/mine').expect(401));
  });

  describe('GET /bookings/current/:callsign', () => {
    it('returns the VID of the controller booked right now', async () => {
      await repository.save({
        vid: 111111,
        callsign: 'LFPG_TWR',
        startsAt: at(-1),
        endsAt: at(1),
      });

      await request(app.getHttpServer())
        .get('/api/bookings/current/lfpg_twr')
        .expect(200, { callsign: 'LFPG_TWR', vid: 111111 });

      await request(app.getHttpServer())
        .get('/api/bookings/current/EGLL_GND')
        .expect(404);
    });
  });
});
