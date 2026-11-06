/**
 * Stakeforward mark: a business (the disc) with exactly 20% of it — a 72° slice —
 * pulled forward and up, like the exploded slice of a pie chart. The slice is the share; the gap is the term that lets it go.
 */
export function Mark({ size = 32, ink = 'var(--ink)', share = 'var(--ember)' }: { size?: number; ink?: string; share?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g transform="translate(1.5 -1.5)">
      <path d="M28 36 L31.13 16.25 A20 20 0 1 0 47.75 32.87 Z" fill={ink} />
      <path d="M32.95 31.05 L36.08 11.3 A20 20 0 0 1 52.7 27.92 Z" fill={share} />
      </g>
    </svg>
  )
}

export function Wordmark({ size = 22, color = 'var(--ink)' }: { size?: number; color?: string }) {
  return (
    <span className="wordmark" style={{ fontSize: size, color }}>
      Stake<em>forward</em>
    </span>
  )
}

export function Lockup({ size = 28 }: { size?: number }) {
  return (
    <span className="lockup">
      <Mark size={size + 6} />
      <Wordmark size={size * 0.8} />
    </span>
  )
}

export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="translate(1.5 -1.5)"><path d="M28 36 L31.13 16.25 A20 20 0 1 0 47.75 32.87 Z" fill="#18211D"/><path d="M32.95 31.05 L36.08 11.3 A20 20 0 0 1 52.7 27.92 Z" fill="#E0743A"/></g></svg>`
