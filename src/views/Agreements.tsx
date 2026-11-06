import { useState } from 'react'
import type { Agreement } from '../types'
import { BASIS_LABEL, money, summarize, termSentence, tierSentence } from '../lib/calc'
import { StatusPill } from '../components/ui'
import { go } from '../lib/nav'

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['pending', 'Pending'],
  ['closed', 'Closed'],
] as const

export default function Agreements({ agreements }: { agreements: Agreement[] }) {
  const [f, setF] = useState<(typeof FILTERS)[number][0]>('all')
  const [q, setQ] = useState('')
  const list = agreements.filter((a) => {
    if (f === 'active' && a.status !== 'active') return false
    if (f === 'pending' && !['draft', 'proposed'].includes(a.status)) return false
    if (f === 'closed' && !['completed', 'terminated', 'bought_out'].includes(a.status)) return false
    const hay = `${a.partner.business} ${a.partner.name} ${a.title}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Agreements</h1>
          <p>Each one records the work you delivered, the share you take, and when it stops.</p>
        </div>
        <a href="#new" className="btn primary">+ New agreement</a>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 0 }}>
          {FILTERS.map(([k, l]) => (
            <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>
          ))}
        </div>
        <span className="spacer" />
        <input type="text" placeholder="Search partners" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
      </div>
      {list.length === 0 ? (
        <div className="card empty">
          <p>No agreements here yet.</p>
          <a href="#new" className="btn primary">Draft your first agreement</a>
        </div>
      ) : (
        <div className="grid g2">
          {list.map((a) => {
            const s = summarize(a)
            return (
              <div key={a.id} className="card" style={{ cursor: 'pointer' }} onClick={() => go(`a-${a.id}`)}>
                <div className="row">
                  <h3>{a.partner.business || 'Untitled partner'}</h3>
                  <span className="spacer" />
                  <StatusPill a={a} />
                </div>
                <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{a.title || 'No title'}</div>
                <dl className="kv" style={{ marginTop: 14 }}>
                  <dt>Share</dt>
                  <dd>{tierSentence(a)} of {BASIS_LABEL[a.basis].toLowerCase()}</dd>
                  <dt>Term</dt>
                  <dd>{termSentence(a)}</dd>
                  <dt>Earned</dt>
                  <dd className="num">
                    {money(s.accrued)} <span className="muted">· {money(s.outstanding)} outstanding</span>
                  </dd>
                </dl>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
