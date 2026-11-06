import { useState } from 'react'
import type { Agreement, Tier } from '../types'
import { addMonthsYM, BASIS_LABEL, fmtDate, money, monthIndex, percentForMonth, round2, termSentence, tierSentence } from '../lib/calc'
import { blankAgreement, logActivity, type useStore } from '../lib/store'
import { go } from '../lib/nav'
import AgreementDoc from '../components/AgreementDoc'

type Store = ReturnType<typeof useStore>

const STEPS = ['Parties & work', 'The share', 'The term', 'Payments', 'Review']

export default function AgreementWizard({ store, existing, notify }: { store: Store; existing?: Agreement; notify: (s: string) => void }) {
  const [a, setA] = useState<Agreement>(() => existing ?? blankAgreement(store.data.profile))
  const [step, setStep] = useState(0)
  const [estimate, setEstimate] = useState(4000)
  const set = <K extends keyof Agreement>(k: K, v: Agreement[K]) => setA((x) => ({ ...x, [k]: v }))
  const locked = existing && existing.status === 'active'

  const valid = [
    !!a.partner.business && !!a.provider.name && !!a.services,
    a.tiers.length > 0 && a.tiers.every((t) => t.percent > 0 && t.percent <= 100),
    true,
    !!a.startDate,
    true,
  ]

  function save(status: Agreement['status']) {
    let next = { ...a, status, title: a.title || `${a.partner.business} agreement` }
    if (!existing) next = logActivity(next, status === 'proposed' ? 'Created and sent for signature.' : 'Draft created.')
    else next = logActivity(next, 'Terms edited.')
    if (status === 'proposed' && !next.signatures.provider) {
      next.signatures = { ...next.signatures, provider: { name: next.provider.name, signedAt: new Date().toISOString() } }
    }
    store.upsert(next)
    notify(status === 'proposed' ? 'Signed on your side. Waiting on your partner.' : 'Draft saved')
    go(`a-${next.id}`)
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">{existing ? 'Edit agreement' : 'New agreement'}</div>
          <h1>{a.partner.business ? `Agreement with ${a.partner.business}` : 'Set up a profit share'}</h1>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => (existing ? go(`a-${existing.id}`) : go('agreements'))}>Cancel</button>
          <button className="btn" onClick={() => save(existing?.status ?? 'draft')} disabled={!valid[0]}>Save {existing ? 'changes' : 'draft'}</button>
        </div>
      </div>

      {locked && (
        <div className="callout" style={{ marginBottom: 16 }}>
          This agreement is signed and active. Changing terms here is for fixing records; real changes need both parties to agree in writing.
        </div>
      )}

      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} className={`${i === step ? 'on' : ''} ${i < step && valid[i] ? 'done' : ''}`} onClick={() => setStep(i)}>
            <span className="n">{i < step && valid[i] ? '✓' : i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      <div className="split">
        <div className="card stack">
          {step === 0 && <StepParties a={a} setA={setA} />}
          {step === 1 && <StepShare a={a} set={set} />}
          {step === 2 && <StepTerm a={a} set={set} estimate={estimate} setEstimate={setEstimate} />}
          {step === 3 && <StepPayments a={a} set={set} />}
          {step === 4 && (
            <>
              <h2>Review the agreement</h2>
              <p className="muted" style={{ margin: 0 }}>
                This is the text both parties sign. Saving and sending records your signature; your partner signs from the agreement page.
              </p>
              <AgreementDoc a={a} />
            </>
          )}
          <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
            <span className="spacer" />
            {step < STEPS.length - 1 ? (
              <button className="btn primary" disabled={!valid[step]} onClick={() => setStep(step + 1)}>Continue</button>
            ) : existing && existing.status !== 'draft' ? (
              <button className="btn primary" onClick={() => save(existing.status)}>Save changes</button>
            ) : (
              <>
                <button className="btn" onClick={() => save('draft')}>Save as draft</button>
                <button className="btn green" disabled={!valid.every(Boolean)} onClick={() => save('proposed')}>Sign and send</button>
              </>
            )}
          </div>
        </div>

        <Summary a={a} estimate={estimate} />
      </div>
    </>
  )
}

/* ---------------- steps ---------------- */

function StepParties({ a, setA }: { a: Agreement; setA: React.Dispatch<React.SetStateAction<Agreement>> }) {
  const p = (side: 'provider' | 'partner', k: keyof Agreement['provider'], v: string) =>
    setA((x) => ({ ...x, [side]: { ...x[side], [k]: v } }))
  return (
    <>
      <h2>Who's involved, and what are you building?</h2>
      <div className="grid g2">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <div className="eyebrow">You (provider)</div>
          <label className="f">Your name<input type="text" value={a.provider.name} onChange={(e) => p('provider', 'name', e.target.value)} /></label>
          <label className="f">Your business<input type="text" value={a.provider.business} onChange={(e) => p('provider', 'business', e.target.value)} /></label>
          <label className="f">Email<input type="email" value={a.provider.email} onChange={(e) => p('provider', 'email', e.target.value)} /></label>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <div className="eyebrow">Partner business</div>
          <label className="f">Owner's name<input type="text" value={a.partner.name} onChange={(e) => p('partner', 'name', e.target.value)} /></label>
          <label className="f">Business name<input type="text" value={a.partner.business} placeholder="e.g. Harbor & Pine Coffee" onChange={(e) => p('partner', 'business', e.target.value)} /></label>
          <label className="f">Email<input type="email" value={a.partner.email} onChange={(e) => p('partner', 'email', e.target.value)} /></label>
        </fieldset>
      </div>
      <label className="f">
        Agreement title
        <input type="text" value={a.title} placeholder="e.g. Online ordering site" onChange={(e) => setA((x) => ({ ...x, title: e.target.value }))} />
      </label>
      <label className="f">
        What you're delivering
        <span className="hint">Be specific. Include ongoing work like hosting or maintenance; the share can stop if you stop providing it.</span>
        <textarea value={a.services} onChange={(e) => setA((x) => ({ ...x, services: e.target.value }))} />
      </label>
      <label className="f" style={{ maxWidth: 260 }}>
        Market value of the work (optional)
        <span className="hint">What you'd normally charge. Useful for setting a cap.</span>
        <input type="number" min={0} value={a.serviceValue ?? ''} onChange={(e) => setA((x) => ({ ...x, serviceValue: e.target.value ? Number(e.target.value) : null }))} />
      </label>
    </>
  )
}

function StepShare({ a, set }: { a: Agreement; set: <K extends keyof Agreement>(k: K, v: Agreement[K]) => void }) {
  const tiers = [...a.tiers].sort((x, y) => x.fromMonth - y.fromMonth)
  const updTier = (i: number, t: Partial<Tier>) => set('tiers', tiers.map((x, j) => (j === i ? { ...x, ...t } : x)))
  return (
    <>
      <h2>What's shared, and how much?</h2>
      <div className="f" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>Share is calculated on</div>
      <div className="choice c3">
        {(
          [
            ['net_profit', 'Net profit', 'Revenue minus expenses. Fairest to the owner, needs honest books.'],
            ['gross_revenue', 'Gross revenue', 'Simple to verify. Use a lower percentage.'],
            ['attributed_revenue', 'Revenue from your work', 'Only sales that came through what you built.'],
          ] as const
        ).map(([k, t, d]) => (
          <button key={k} className={`opt ${a.basis === k ? 'on' : ''}`} onClick={() => set('basis', k)}>
            <b>{t}</b>
            <span>{d}</span>
          </button>
        ))}
      </div>
      <label className="f">
        How it's measured (optional)
        <span className="hint">e.g. "From the monthly P&L in QuickBooks" or "From Shopify sales reports tagged online"</span>
        <input type="text" value={a.basisNotes} onChange={(e) => set('basisNotes', e.target.value)} />
      </label>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <b style={{ fontSize: 14 }}>Percentage</b>
          <span className="spacer" />
          <button
            className="btn sm"
            onClick={() => {
              const last = tiers[tiers.length - 1]
              set('tiers', [...tiers, { fromMonth: last.fromMonth + 12, percent: Math.max(1, round2(last.percent / 2)) }])
            }}
          >
            + Add step-down
          </button>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {tiers.map((t, i) => (
            <div key={i} className="row">
              <span style={{ width: 120, fontSize: 14 }}>{i === 0 ? 'From the start' : 'Starting month'}</span>
              {i > 0 && (
                <input type="number" min={2} style={{ width: 90 }} value={t.fromMonth} onChange={(e) => updTier(i, { fromMonth: Math.max(2, Number(e.target.value)) })} />
              )}
              <input type="number" min={0.5} max={100} step={0.5} style={{ width: 100 }} value={t.percent} onChange={(e) => updTier(i, { percent: Number(e.target.value) })} />
              <span>%</span>
              {i > 0 && <button className="btn ghost sm danger" onClick={() => set('tiers', tiers.filter((_, j) => j !== i))}>Remove</button>}
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Step-downs lower your share over time, which makes a long or open-ended term easier for the owner to accept.</p>
      </div>

      {a.basis === 'net_profit' && (
        <label className="check">
          <input type="checkbox" checked={a.lossCarryForward} onChange={(e) => set('lossCarryForward', e.target.checked)} />
          <span>
            <b>Carry losses forward.</b> A losing month offsets later profit before you're owed anything. Fair to a business that's still ramping up.
          </span>
        </label>
      )}
      <label className="f" style={{ maxWidth: 300 }}>
        Floor per period (optional)
        <span className="hint">The owner keeps this much each period before the share applies.</span>
        <input type="number" min={0} value={a.periodFloor || ''} placeholder="0" onChange={(e) => set('periodFloor', Number(e.target.value) || 0)} />
      </label>
    </>
  )
}

function StepTerm({
  a,
  set,
  estimate,
  setEstimate,
}: {
  a: Agreement
  set: <K extends keyof Agreement>(k: K, v: Agreement[K]) => void
  estimate: number
  setEstimate: (n: number) => void
}) {
  const t = a.term
  const setT = (patch: Partial<Agreement['term']>) => set('term', { ...t, ...patch })
  const presets: [string, string, Agreement['term']][] = [
    ['3 years', '36 months, then done', { months: 36, capAmount: null, endDate: null }],
    ['Paid back 3×', a.serviceValue ? `Stops at ${money(a.serviceValue * 3)}` : 'Cap at 3× the work value', { months: null, capAmount: a.serviceValue ? a.serviceValue * 3 : 30000, endDate: null }],
    ['First of', '5 years or 3× value', { months: 60, capAmount: a.serviceValue ? a.serviceValue * 3 : 30000, endDate: null }],
    ['Indefinite', 'Until ended or bought out', { months: null, capAmount: null, endDate: null }],
  ]
  const isPreset = (p: Agreement['term']) => p.months === t.months && p.capAmount === t.capAmount && p.endDate === t.endDate
  return (
    <>
      <h2>When does the share stop?</h2>
      <p className="muted" style={{ margin: 0 }}>Turn on any combination. The share ends at whichever comes first. Leave them all off for an open-ended share.</p>
      <div className="choice c4">
        {presets.map(([title, d, p]) => (
          <button key={title} className={`opt ${isPreset(p) ? 'on' : ''}`} onClick={() => set('term', p)}>
            <b>{title}</b>
            <span>{d}</span>
          </button>
        ))}
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <label className="check">
          <input type="checkbox" checked={t.months != null} onChange={(e) => setT({ months: e.target.checked ? 36 : null })} />
          <span style={{ flex: 1 }}>
            <b>After a number of months</b>
            {t.months != null && (
              <div className="row" style={{ marginTop: 6 }}>
                <input type="number" min={1} style={{ width: 110 }} value={t.months} onChange={(e) => setT({ months: Math.max(1, Number(e.target.value)) })} />
                <span className="muted">months · ends {fmtDate(`${addMonthsYM(a.startDate.slice(0, 7), t.months)}-01`)}</span>
              </div>
            )}
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={t.capAmount != null} onChange={(e) => setT({ capAmount: e.target.checked ? (a.serviceValue ?? 10000) * 2 : null })} />
          <span style={{ flex: 1 }}>
            <b>Once total payments reach a cap</b>
            {t.capAmount != null && (
              <div className="row" style={{ marginTop: 6 }}>
                <span>$</span>
                <input type="number" min={1} style={{ width: 140 }} value={t.capAmount} onChange={(e) => setT({ capAmount: Math.max(1, Number(e.target.value)) })} />
                {a.serviceValue ? <span className="muted">{round2(t.capAmount / a.serviceValue)}× the work's value</span> : null}
              </div>
            )}
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={t.endDate != null} onChange={(e) => setT({ endDate: e.target.checked ? `${addMonthsYM(a.startDate.slice(0, 7), 24)}-01` : null })} />
          <span style={{ flex: 1 }}>
            <b>On a specific date</b>
            {t.endDate != null && (
              <div style={{ marginTop: 6, maxWidth: 200 }}>
                <input type="date" value={t.endDate} onChange={(e) => setT({ endDate: e.target.value })} />
              </div>
            )}
          </span>
        </label>
      </div>

      <div className="callout green">
        <div className="row">
          <b>Try it:</b> if the business makes
          <input type="number" min={0} step={500} value={estimate} onChange={(e) => setEstimate(Number(e.target.value))} style={{ width: 120, background: '#fff' }} />
          per month in {BASIS_LABEL[a.basis].toLowerCase()}…
        </div>
        <Projection a={a} estimate={estimate} />
      </div>
    </>
  )
}

function StepPayments({ a, set }: { a: Agreement; set: <K extends keyof Agreement>(k: K, v: Agreement[K]) => void }) {
  const b = a.buyout
  return (
    <>
      <h2>Reporting, payment, and protections</h2>
      <div className="grid g3">
        <label className="f">
          Start date
          <input type="date" value={a.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </label>
        <label className="f">
          Report and pay
          <select value={a.cadence} onChange={(e) => set('cadence', e.target.value as Agreement['cadence'])}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </label>
        <label className="f">
          Due within (days)
          <input type="number" min={1} value={a.paymentDueDays} onChange={(e) => set('paymentDueDays', Number(e.target.value))} />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={b.enabled} onChange={(e) => set('buyout', { ...b, enabled: e.target.checked })} />
        <span style={{ flex: 1 }}>
          <b>Let the owner buy out the share.</b> Owners sign more readily when they know there's a way out, and you get a lump sum.
          {b.enabled && (
            <div className="row" style={{ marginTop: 8 }}>
              <select
                style={{ width: 'auto' }}
                value={b.fixedAmount != null ? 'fixed' : 'multiple'}
                onChange={(e) =>
                  set('buyout', e.target.value === 'fixed' ? { ...b, fixedAmount: a.serviceValue ? a.serviceValue * 2 : 15000, trailingMultiple: null } : { ...b, fixedAmount: null, trailingMultiple: 2 })
                }
              >
                <option value="multiple">Multiple of last 12 months</option>
                <option value="fixed">Fixed amount</option>
              </select>
              {b.fixedAmount != null ? (
                <>
                  <span>$</span>
                  <input type="number" min={0} style={{ width: 130 }} value={b.fixedAmount} onChange={(e) => set('buyout', { ...b, fixedAmount: Number(e.target.value) })} />
                </>
              ) : (
                <>
                  <input type="number" min={0.5} step={0.5} style={{ width: 90 }} value={b.trailingMultiple ?? 2} onChange={(e) => set('buyout', { ...b, trailingMultiple: Number(e.target.value) })} />
                  <span>× shares earned in the past 12 months</span>
                </>
              )}
            </div>
          )}
        </span>
      </label>
      <label className="check">
        <input type="checkbox" checked={a.auditRights} onChange={(e) => set('auditRights', e.target.checked)} />
        <span>
          <b>Annual records review.</b> You can check the books once a year. Underpayment over 5% means the owner covers the cost.
        </span>
      </label>
      <label className="f" style={{ maxWidth: 260 }}>
        Governing state
        <input type="text" value={a.governingState} onChange={(e) => set('governingState', e.target.value)} />
      </label>
    </>
  )
}

/* ---------------- side summary ---------------- */

function Summary({ a, estimate }: { a: Agreement; estimate: number }) {
  return (
    <div className="card" style={{ position: 'sticky', top: 20 }}>
      <div className="eyebrow">In plain terms</div>
      <h3 style={{ margin: '6px 0 14px' }}>
        {a.partner.business || 'The partner'} pays {a.provider.business || 'you'} {tierSentence(a)} of {BASIS_LABEL[a.basis].toLowerCase()}.
      </h3>
      <dl className="kv">
        <dt>Term</dt>
        <dd>{termSentence(a)}</dd>
        <dt>Paid</dt>
        <dd>{a.cadence === 'quarterly' ? 'Quarterly' : 'Monthly'}, within {a.paymentDueDays} days</dd>
        <dt>Starts</dt>
        <dd>{a.startDate ? fmtDate(a.startDate) : '—'}</dd>
        <dt>Buyout</dt>
        <dd>
          {a.buyout.enabled
            ? a.buyout.fixedAmount != null
              ? money(a.buyout.fixedAmount)
              : `${a.buyout.trailingMultiple}× trailing 12 months`
            : 'None'}
        </dd>
      </dl>
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>At {money(estimate)}/month</div>
        <Projection a={a} estimate={estimate} compact />
      </div>
    </div>
  )
}

function Projection({ a, estimate, compact }: { a: Agreement; estimate: number; compact?: boolean }) {
  // simulate a constant monthly amount
  let total = 0
  let month = 0
  let endedBy = ''
  const maxMonths = 600
  const startYM = a.startDate.slice(0, 7)
  while (month < maxMonths) {
    month++
    const ymStr = addMonthsYM(startYM, month - 1)
    if (a.term.months != null && month > a.term.months) { endedBy = 'term'; month--; break }
    if (a.term.endDate && `${ymStr}-01` > a.term.endDate) { endedBy = 'date'; month--; break }
    const pct = percentForMonth(a.tiers, monthIndex(a.startDate, ymStr))
    let share = (Math.max(0, estimate - (a.periodFloor || 0)) * pct) / 100
    if (a.term.capAmount != null && total + share >= a.term.capAmount) {
      share = a.term.capAmount - total
      total += share
      endedBy = 'cap'
      break
    }
    total += share
    if (a.term.months == null && a.term.capAmount == null && !a.term.endDate && month >= 12) { endedBy = 'indef'; break }
  }
  const first = (Math.max(0, estimate - (a.periodFloor || 0)) * percentForMonth(a.tiers, 1)) / 100
  const years = (m: number) => (m >= 24 ? `${round2(m / 12)} years` : `${m} months`)

  if (estimate <= 0) return <p style={{ margin: '8px 0 0' }}>…no share is owed.</p>
  let text: string
  if (endedBy === 'indef') text = `You'd earn about ${money(total)} a year, with no end date${a.tiers.length > 1 ? ' (after step-downs, less later)' : ''}.`
  else if (endedBy === 'cap') text = `The cap is reached in month ${month}, about ${years(month)} in. Total: ${money(total)}.`
  else if (endedBy === 'term' || endedBy === 'date') text = `The term ends after ${years(month)}. Total: ${money(total)}.`
  else text = `Total over ${years(month)}: ${money(total)}.`
  return compact ? (
    <div style={{ fontSize: 14 }}>
      <div><span className="num">{money(first, true)}</span> <span className="muted">first month to you</span></div>
      <div style={{ marginTop: 4 }}>{text}</div>
    </div>
  ) : (
    <p style={{ margin: '8px 0 0' }}>
      …you'd get <b className="num">{money(first, true)}</b> the first month. {text}
    </p>
  )
}
