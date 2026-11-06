import { IS_DEMO } from '../api'

// The viewer's offset from UTC, e.g. "UTC+4", to help convert slot times.
function localOffset() {
  const minutes = -new Date().getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '−'
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <section>
          <h3>Booking rules</h3>
          <ul>
            <li>Bookings start in the future and last up to 12 hours.</li>
            <li>
              One controller per position at a time, and one position per
              controller.
            </li>
            <li>Back-to-back sessions are fine.</li>
            <li>You can change or delete your bookings until they start.</li>
          </ul>
        </section>
        <section>
          <h3>Times</h3>
          <p>
            All times are UTC (zulu). Your device is on{' '}
            <strong>{localOffset()}</strong>.
          </p>
          <p>Callsigns look like LFPG_TWR, EGLL_N_APP or LFFF_E_CTR.</p>
        </section>
        <section>
          <h3>About</h3>
          {IS_DEMO ? (
            <p>
              Demo build: it runs in your browser and your bookings stay on this
              device. Use “Demo · reset” to start over.
            </p>
          ) : (
            <p>
              The API is documented at <a href="/api/docs">/api/docs</a>.
            </p>
          )}
          <p className="muted">Built with NestJS, React and SQLite.</p>
        </section>
      </div>
    </footer>
  )
}
