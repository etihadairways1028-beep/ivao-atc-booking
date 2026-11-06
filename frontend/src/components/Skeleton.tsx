// Shimmering placeholder rows shown while data loads.
export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} style={{ width: `${92 - ((i * 17) % 30)}%` }} />
      ))}
    </div>
  )
}
