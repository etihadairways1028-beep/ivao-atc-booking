import { useNow } from '../useNow'

export function UtcClock() {
  const now = useNow(1000)

  return (
    <div className="clock" aria-label="Current UTC time">
      <time dateTime={now.toISOString()}>
        {now.toISOString().slice(11, 19)}
      </time>
      <span className="clock-zone">UTC</span>
    </div>
  )
}
