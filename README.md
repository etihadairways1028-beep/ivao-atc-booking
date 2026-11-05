# IVAO ATC Booking

A small web app to book ATC positions: a simplified version of the IVAO ATC scheduling system.

- `backend/`: NestJS API, TypeORM with SQLite
- `frontend/`: React + TypeScript

## Running it

Requires Node.js 20 or later.

```bash
# API on http://localhost:3000
cd backend
npm install
npm run start:dev

# UI on http://localhost:5173 (in another terminal)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and sign in with any VID.

To fill the schedule with demo bookings (some of them live right now), run `npm run seed` in `backend/` once, before or while the API runs. It only adds data to an empty database.

### Database

There is nothing to set up. The backend uses SQLite through `better-sqlite3` and creates `backend/bookings.sqlite`, with its table, on first start (TypeORM `synchronize`). To use another file, set `DATABASE_PATH`. Delete the file to start over.

### Tests

```bash
cd backend
npm run test:e2e
```

The e2e tests run against an in-memory database and cover every rule below, including several users trying to book the same slot at the same moment.

## API

All routes are under `/api`. Routes marked 🔒 need the user's VID in the `X-IVAO-VID` header.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/bookings` | Upcoming bookings (not ended yet), sorted by position |
| GET | `/bookings?date=YYYY-MM-DD` | Bookings overlapping that UTC day, past days included |
| GET 🔒 | `/bookings/mine` | Your own bookings, newest first, past ones included (powers the My bookings page) |
| GET | `/bookings/current/:callsign` | VID of whoever has the position booked right now (the Aurora idea from the brief) |
| POST 🔒 | `/bookings` | Book a position: `{ callsign, startsAt, endsAt }` |
| PUT 🔒 | `/bookings/:id` | Edit one of your bookings (same body) |
| DELETE 🔒 | `/bookings/:id` | Delete one of your bookings |

## Booking rules

- Times are UTC everywhere, in the API and in the UI.
- A booking has to start in the future, end after it starts, and last 12 hours at most. The 12-hour limit stops anyone from blocking a position for days.
- The position must be free for the whole period, and the user can't be booked on another position at the same time. Back-to-back bookings (10:00–12:00 then 12:00–14:00) are allowed.
- Only the owner can edit or delete a booking, and only before it starts. When you edit a booking, it doesn't conflict with itself.
- Callsigns are validated (`LFPG_TWR`, `LFPG_N_APP`, `LFFF_E_CTR`...) and upper-cased.
- In the form, an end time earlier than the start time means the session ends the next day, as in the old scheduling form.

## Choices worth mentioning

- **Identification**: as the brief asks, the VID header is trusted as-is. A guard checks that it looks like a VID, and a `@Vid()` decorator passes it to the handlers. The owner always comes from the header, never from the body. The validation pipe rejects unknown fields, so a client can't send `vid` or `id` in a payload.
- **Concurrency**: the conflict check and the write happen in one transaction, and SQLite runs write transactions one at a time. So two simultaneous requests can't both get the same slot (there's a test for this). With Postgres I would add an exclusion constraint on `(callsign, tstzrange)` as a database-level guarantee.
- **Performance**: there are indexes on `(callsign, startsAt)` and `(vid, startsAt)`, which the overlap and listing queries use.
- **Pages**: Schedule and My bookings. The route lives in the URL hash, so reloading and the back button work without a router library. Page changes animate through the browser's View Transitions API, with a plain CSS fallback. Results show up as small notifications that disappear by themselves.
- **UI**: besides the required table and form, the schedule has a live UTC clock, stat tiles (who's live now, upcoming coverage, your next session) and a 24-hour timeline of every booked position, coloured by facility type, with a "now" marker. You can click one of your own bars to edit that booking. Everything is computed from the same list request, so it adds no extra API calls. There's a light, dark or system theme. The choice is saved, and it's applied before React loads so the page never flashes the wrong theme. The panels use a frosted-glass style over a neutral background: backdrop blur, a light edge, and a highlight that follows the cursor (one page-level pointer listener sets two CSS variables). Buttons and small panels spring slightly on hover and press. All motion is turned off for users who ask their system for reduced motion. There's no CSS library: it's one stylesheet built on CSS variables.
- **Frontend tooling**: Create React App has been deprecated since 2025 and no longer installs cleanly with current React. I used Vite, which is just the dev server and bundler; the app itself is plain React with no framework on top. In development, Vite proxies `/api` to the backend, so no CORS setup is needed.
- `synchronize: true` is fine for an exercise. A real deployment would use migrations.
