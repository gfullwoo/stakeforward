import { Mark, Wordmark } from '../components/Logo'

const COLORS: [string, string, string, string][] = [
  ['Ink', '#18211D', 'Text, primary buttons, the mark', '#F5F1E8'],
  ['Paper', '#F5F1E8', 'Page background', '#18211D'],
  ['Forward Green', '#1E6B4F', 'Money in, success, the "forward" in the wordmark', '#FFFFFF'],
  ['Ember', '#E0743A', 'The share slice, money owed, highlights', '#18211D'],
  ['Card', '#FFFDF8', 'Surfaces', '#18211D'],
  ['Alert', '#B0412F', 'Overdue only', '#FFFFFF'],
]

export default function Brand() {
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Brand</div>
          <h1>Stakeforward</h1>
          <p>Build now. Get paid forward. A profit-share platform for people who build for small businesses that can't pay upfront.</p>
        </div>
      </div>

      <div className="grid g2">
        <div className="hero-mark" style={{ minHeight: 260 }}>
          <div style={{ textAlign: 'center' }}>
            <Mark size={120} ink="#F5F1E8" />
            <div style={{ marginTop: 14 }}>
              <span className="wordmark" style={{ fontSize: 38, color: '#F5F1E8' }}>
                Stake<em style={{ color: '#7FC6A4' }}>forward</em>
              </span>
            </div>
          </div>
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
          <div style={{ textAlign: 'center' }}>
            <Mark size={120} />
            <div style={{ marginTop: 14 }}><Wordmark size={38} /></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>The mark</h3>
        <p style={{ marginBottom: 0, color: 'var(--ink-2)' }}>
          A disc is the business. One slice of it, exactly 72°, or 20%, is pulled out, up and to the right, like the exploded slice of a chart that's going up. The slice is your share; the gap says the share is
          separate and can end. Ember for the share, ink for what the owner keeps. Minimum size 16px. Don't rotate it, recolor the slice green, or close the gap.
        </p>
        <div className="row" style={{ marginTop: 16, gap: 24 }}>
          {[64, 40, 24, 16].map((s) => (
            <div key={s} style={{ textAlign: 'center' }}>
              <Mark size={s} />
              <div className="muted num" style={{ fontSize: 11 }}>{s}px</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Color</h3>
        <div className="grid g3">
          {COLORS.map(([n, hex, use, fg]) => (
            <div key={n}>
              <div className="swatch" style={{ background: hex, color: fg, border: '1px solid var(--line)' }}>{hex}</div>
              <div style={{ marginTop: 6, fontWeight: 600, fontSize: 14 }}>{n}</div>
              <div className="muted" style={{ fontSize: 13 }}>{use}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Type</h3>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.035em' }}>Geist for headlines</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>700 for headlines and the wordmark, tight tracking.</div>
          <div style={{ fontSize: 17 }}>Geist for everything you read.</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>400 / 500 / 600.</div>
          <div className="num" style={{ fontSize: 20 }}>$12,480.00 · 20% · 36 mo</div>
          <div className="muted" style={{ fontSize: 13 }}>Geist Mono for money and figures, tabular.</div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Name, domain, voice</h3>
          <dl className="kv">
            <dt>Name</dt>
            <dd>Stakeforward. One word, capital S only.</dd>
            <dt>Domain</dt>
            <dd>stakeforward.com <span className="muted">(sharemyprofit.com redirects here)</span></dd>
            <dt>Tagline</dt>
            <dd>Build now. Get paid forward.</dd>
            <dt>Voice</dt>
            <dd>Plain and fair. Say "share," "term," and "paid," not "equity," "vesting," or "royalty." Explain every number in a sentence the owner would understand.</dd>
          </dl>
        </div>
      </div>
    </>
  )
}
