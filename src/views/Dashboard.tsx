import { useMemo, useState } from 'react'
import type { AppData } from '../types'
import { addMonthsYM, computeLedger, fmtDate, money, periodLabel, summarize, ym } from '../lib/calc'
import { Bar, Stat, StatusPill } from '../components/ui'
import { go } from '../lib/nav'

export default function Dashboard({ data }: { data: AppData }) {
  const { agreements } = data
  const today = new Date()

  const totals = useMemo(() => {
    let accrued = 0,
      paid = 0,
      outstanding = 0,
      overdue = 0
    for (const a of agreements) {
      const s = summarize(a, today)
      accrued += s.accrued
      paid += s.paid
      outstanding += s.outstanding
      overdue += s.overdue
    }
    return { accrued, paid, outstanding, overdue }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreements])

  const active = agreements.filter((a) => a.status === 'active')

  const attention: { id: string; text: string; tone: 'red' | 'ember' | 'green'; when?: string }[] = []
  for (const a of agreements) {
    const who = a.partner.business || a.partner.name
    if (a.status === 'proposed') attention.push({ id: a.id, tone: 'ember', text: `${who} hasn't signed yet` })
    if (a.status === 'draft') attention.push({ id: a.id, tone: 'ember', text: `${who || 'Untitled'} is still a draft` })
    if (a.status !== 'active') continue
    for (const r of computeLedger(a, today)) {
      if (r.overdue)
        attention.push({ id: a.id, tone: 'red', text: `${who} owes ${money(r.outstanding, true)} for ${r.label}`, when: `due ${fmtDate(r.dueDate)}` })
    }
    const s = summarize(a, today)
    if (s.endedReason) attention.push({ id: a.id, tone: 'green', text: `${who}: ${s.endedReason.toLowerCase()}. Mark it complete.` })
    else if (s.termProgress != null && s.termProgress >= 0.85)
      attention.push({ id: a.id, tone: 'ember', text: `${who} is ${Math.round(s.termProgress * 100)}% through its term` })
    const nextEnd = new Date(Number(s.nextPeriod.slice(0, 4)), Number(s.nextPeriod.slice(5)) - 1 + (a.cadence === 'quarterly' ? 3 : 1), 1)
    if (nextEnd <= today) attention.push({ id: a.id, tone: 'ember', text: `${who}: ${periodLabel(s.nextPeriod, a.cadence)} needs a report` })
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>Your shares at a glance</h1>
          <p>Every agreement, what's been earned, what's been paid, and how close each one is to the end of its term.</p>
        </div>
        <a href="#new" className="btn primary">+ New agreement</a>
      </div>

      <div className="grid g4">
        <Stat label="Active agreements" value={active.length} sub={`${agreements.length} total`} />
        <Stat label="Earned to date" value={money(totals.accrued)} sub="Shares accrued, all agreements" />
        <Stat label="Collected" value={money(totals.paid)} sub={totals.accrued ? `${Math.round((totals.paid / totals.accrued) * 100)}% of earned` : '—'} />
        <Stat
          label="Outstanding"
          value={money(totals.outstanding)}
          warn={totals.overdue > 0}
          sub={totals.overdue > 0 ? `${money(totals.overdue)} past due` : 'Nothing past due'}
        />
      </div>

      <div className="split" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <h3>Shares earned by month</h3>
            <span className="spacer" />
            <div className="legend">
              <span><i style={{ background: 'var(--chart-paid)' }} />Paid</span>
              <span><i style={{ background: 'var(--ember)' }} />Unpaid</span>
            </div>
          </div>
          <MonthlyChart data={data} />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Needs attention</h3>
          {attention.length === 0 ? (
            <p className="muted">All caught up.</p>
          ) : (
            <ul className="timeline">
              {attention.slice(0, 8).map((x, i) => (
                <li key={i} style={{ cursor: 'pointer' }} onClick={() => go(`a-${x.id}`)}>
                  <span style={{ color: x.tone === 'red' ? 'var(--red)' : undefined }}>{x.text}</span>
                  {x.when && <time>{x.when}</time>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Progress toward term end</h3>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Status</th>
                <th>Share now</th>
                <th style={{ width: '28%' }}>Term</th>
                <th className="r">Earned</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => {
                const s = summarize(a, today)
                return (
                  <tr key={a.id} className="click" onClick={() => go(`a-${a.id}`)}>
                    <td>
                      <b>{a.partner.business || 'Untitled'}</b>
                      <div className="muted" style={{ fontSize: 13 }}>{a.title}</div>
                    </td>
                    <td><StatusPill a={a} /></td>
                    <td className="num">{s.currentPct}%</td>
                    <td>
                      {s.termProgress == null ? (
                        <span className="muted">Indefinite{a.buyout.enabled ? ' · buyout available' : ''}</span>
                      ) : (
                        <div>
                          <Bar value={s.termProgress} tone={s.termProgress > 0.85 ? 'ember' : undefined} />
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{Math.round(s.termProgress * 100)}% of the way to the end</div>
                        </div>
                      )}
                    </td>
                    <td className="r num">{money(s.accrued)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function MonthlyChart({ data }: { data: AppData }) {
  const [hover, setHover] = useState<number | null>(null)
  const months = Array.from({ length: 12 }, (_, i) => addMonthsYM(ym(new Date()), i - 12))
  const buckets = months.map((m) => ({ m, paid: 0, unpaid: 0 }))
  for (const a of data.agreements) {
    for (const r of computeLedger(a)) {
      const b = buckets.find((x) => x.m === r.period.start)
      if (!b) continue
      const p = Math.min(r.share, r.period.paid || 0)
      b.paid += p
      b.unpaid += Math.max(0, r.share - p)
    }
  }
  const max = Math.max(100, ...buckets.map((b) => b.paid + b.unpaid))
  const nice = niceMax(max)
  const W = 640, H = 220, L = 46, B = 24, T = 10
  const bw = (W - L) / 12
  const y = (v: number) => T + (H - T - B) * (1 - v / nice)
  const ticks = [0, nice / 2, nice]
  const h = hover != null ? buckets[hover] : null

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ minHeight: 22, fontSize: 13, color: 'var(--ink-2)' }}>
        {h ? (
          <>
            <b>{new Date(`${h.m}-15`).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</b> · Paid{' '}
            <span className="num">{money(h.paid)}</span> · Unpaid <span className="num">{money(h.unpaid)}</span>
          </>
        ) : (
          <span className="muted">Hover a month for details. Quarterly reports count in their first month.</span>
        )}
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Shares earned per month, paid versus unpaid">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? '' : '2 4'} />
            <text x={L - 8} y={y(t) + 3.5} textAnchor="end">{t >= 1000 ? `$${t / 1000}k` : `$${t}`}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = L + i * bw + bw * 0.22
          const w = bw * 0.56
          const yp = y(b.paid)
          const yu = y(b.paid + b.unpaid)
          const dim = hover != null && hover !== i
          return (
            <g key={b.m} opacity={dim ? 0.45 : 1}>
              {b.paid > 0 && <rect x={x} y={yp} width={w} height={y(0) - yp} rx={b.unpaid > 0 ? 0 : 4} fill="var(--chart-paid)" />}
              {b.unpaid > 0 && <rect x={x} y={yu} width={w} height={Math.max(0, yp - yu - (b.paid > 0 ? 2 : 0))} rx={4} fill="var(--ember)" />}
              <text x={x + w / 2} y={H - 6} textAnchor="middle">
                {new Date(`${b.m}-15`).toLocaleString('en-US', { month: 'short' })}
              </text>
              <rect x={L + i * bw} y={0} width={bw} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}
