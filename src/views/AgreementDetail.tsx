import { useState } from 'react'
import type { Agreement, Period } from '../types'
import { BASIS_LABEL, computeLedger, fmtDate, money, periodLabel, round2, summarize, termSentence, tierSentence } from '../lib/calc'
import { agreementPlainText } from '../lib/agreementText'
import { logActivity, uid, type useStore } from '../lib/store'
import { go } from '../lib/nav'
import { Bar, copyText, Modal, Stat, StatusPill } from '../components/ui'
import AgreementDoc from '../components/AgreementDoc'

type Store = ReturnType<typeof useStore>

export default function AgreementDetail({ a, store, notify }: { a: Agreement; store: Store; notify: (s: string) => void }) {
  const [tab, setTab] = useState<'ledger' | 'agreement' | 'activity'>(a.status === 'active' ? 'ledger' : 'agreement')
  const [modal, setModal] = useState<null | 'report' | 'pay' | 'sign' | 'end' | 'delete'>(null)
  const [payFor, setPayFor] = useState<Period | null>(null)
  const s = summarize(a)
  const rows = computeLedger(a)
  const update = (next: Agreement, msg?: string) => {
    store.upsert(msg ? logActivity(next, msg) : next)
    if (msg) notify(msg)
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <a href="#agreements" className="muted" style={{ textDecoration: 'none', fontSize: 14 }}>← Agreements</a>
            <StatusPill a={a} />
          </div>
          <h1 style={{ marginTop: 8 }}>{a.partner.business || 'Untitled'}</h1>
          <p>
            {a.title} · {tierSentence(a)} of {BASIS_LABEL[a.basis].toLowerCase()} · {termSentence(a)}
          </p>
        </div>
        <div className="row">
          {a.status === 'active' && (
            <>
              <button className="btn primary" onClick={() => setModal('report')}>Report {periodLabel(s.nextPeriod, a.cadence)}</button>
              <button className="btn" onClick={() => setModal('end')}>End…</button>
            </>
          )}
          {a.status === 'proposed' && <button className="btn green" onClick={() => setModal('sign')}>Record partner signature</button>}
          {a.status === 'draft' && (
            <button className="btn green" onClick={() => update({ ...a, status: 'proposed', signatures: { ...a.signatures, provider: { name: a.provider.name, signedAt: new Date().toISOString() } } }, 'Signed and sent for signature')}>
              Sign and send
            </button>
          )}
          <button className="btn ghost" onClick={() => go(`edit-${a.id}`)}>Edit</button>
        </div>
      </div>

      {s.endedReason && a.status === 'active' && (
        <div className="callout green" style={{ marginBottom: 16 }}>
          <div className="row">
            <span><b>{s.endedReason}.</b> Collect anything outstanding, then close it out.</span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => update({ ...a, status: 'completed' }, 'Marked term complete')}>Mark complete</button>
          </div>
        </div>
      )}

      <div className="grid g4">
        <Stat label="Earned" value={money(s.accrued)} sub={`${s.currentPct}% share this month`} />
        <Stat label="Collected" value={money(s.paid)} />
        <Stat label="Outstanding" value={money(s.outstanding)} warn={s.overdue > 0} sub={s.overdue > 0 ? `${money(s.overdue)} past due` : 'Nothing past due'} />
        <div className="card stat">
          <div className="label">Term progress</div>
          {s.termProgress == null ? (
            <>
              <div className="value" style={{ fontSize: 20 }}>Indefinite</div>
              <div className="sub">{s.buyoutPrice != null ? `Buyout today: ${money(s.buyoutPrice)}` : 'No buyout'}</div>
            </>
          ) : (
            <>
              <div className="value">{Math.round(s.termProgress * 100)}%</div>
              <div style={{ marginTop: 8 }}><Bar value={s.termProgress} tone={s.termProgress > 0.85 ? 'ember' : undefined} /></div>
              <div className="sub" style={{ marginTop: 6 }}>
                {[
                  s.monthsProgress != null && `${s.monthsElapsed} of ${a.term.months} months`,
                  s.capProgress != null && `${money(s.accrued)} of ${money(a.term.capAmount)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        <button className={tab === 'ledger' ? 'on' : ''} onClick={() => setTab('ledger')}>Ledger</button>
        <button className={tab === 'agreement' ? 'on' : ''} onClick={() => setTab('agreement')}>Agreement</button>
        <button className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {tab === 'ledger' && (
        <div className="card">
          {rows.length === 0 ? (
            <div className="empty">
              <p>No periods reported yet.</p>
              {a.status === 'active' && <button className="btn primary" onClick={() => setModal('report')}>Report the first period</button>}
            </div>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="r">{BASIS_LABEL[a.basis]}</th>
                    <th className="r">Share</th>
                    <th className="r">Owed</th>
                    <th className="r">Paid</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.period.id}>
                      <td>
                        <b>{r.label}</b>
                        {r.period.note && <div className="muted" style={{ fontSize: 12.5 }}>{r.period.note}</div>}
                      </td>
                      <td className="r num" style={{ color: r.basisAmount < 0 ? 'var(--red)' : undefined }}>
                        {money(r.basisAmount)}
                        {r.lossOffset > 0 && <div className="muted" style={{ fontSize: 12 }}>−{money(r.lossOffset)} prior losses</div>}
                      </td>
                      <td className="r num">{r.afterTerm ? '—' : `${r.pct}%`}</td>
                      <td className="r num">
                        {money(r.share, true)}
                        {r.cappedBy > 0 && <div className="muted" style={{ fontSize: 12 }}>capped</div>}
                      </td>
                      <td className="r num">{money(r.period.paid, true)}</td>
                      <td>
                        {r.share === 0 ? (
                          <span className="muted" style={{ fontSize: 13 }}>{r.afterTerm ? 'After term' : 'Nothing owed'}</span>
                        ) : r.outstanding === 0 ? (
                          <span className="pill active">Paid</span>
                        ) : r.overdue ? (
                          <span className="pill overdue">Overdue</span>
                        ) : (
                          <span className="pill proposed">Due {fmtDate(r.dueDate)}</span>
                        )}
                      </td>
                      <td className="r">
                        {r.outstanding > 0 && (
                          <button className="btn sm" onClick={() => { setPayFor(r.period); setModal('pay') }}>Record payment</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'agreement' && (
        <div className="split">
          <AgreementDoc a={a} />
          <div className="card stack" style={{ position: 'sticky', top: 20 }}>
            <h3>Signatures</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Signatures here are a typed-name record kept in this app. For a binding e-signature, send the text through an e-sign service and record the date here.
            </p>
            <button
              className="btn"
              onClick={async () => notify((await copyText(agreementPlainText(a))) ? 'Agreement text copied' : 'Copy was blocked by the browser')}
            >
              Copy agreement text
            </button>
            <button className="btn" onClick={() => { try { window.print() } catch { notify('Printing is blocked here') } }}>Print</button>
            {a.status === 'proposed' && <button className="btn green" onClick={() => setModal('sign')}>Record partner signature</button>}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          <ActivityLog a={a} onAdd={(t) => update(a, t)} />
        </div>
      )}

      <div className="row" style={{ marginTop: 30 }}>
        <span className="spacer" />
        <button className="btn ghost danger sm" onClick={() => setModal('delete')}>Delete agreement</button>
      </div>

      {modal === 'report' && <ReportModal a={a} onClose={() => setModal(null)} onSave={(p) => { update({ ...a, periods: [...a.periods.filter((x) => x.start !== p.start), p] }, `Reported ${periodLabel(p.start, a.cadence)}: ${money(p.amount)}`); setModal(null) }} />}
      {modal === 'pay' && payFor && (
        <PayModal
          a={a}
          period={payFor}
          owed={rows.find((r) => r.period.id === payFor.id)?.outstanding ?? 0}
          onClose={() => setModal(null)}
          onSave={(amt, date) => {
            update(
              { ...a, periods: a.periods.map((p) => (p.id === payFor.id ? { ...p, paid: round2((p.paid || 0) + amt), paidDate: date } : p)) },
              `Payment of ${money(amt, true)} recorded for ${periodLabel(payFor.start, a.cadence)}`,
            )
            setModal(null)
          }}
        />
      )}
      {modal === 'sign' && (
        <SignModal
          a={a}
          onClose={() => setModal(null)}
          onSign={(name) => {
            update({ ...a, status: 'active', signatures: { ...a.signatures, partner: { name, signedAt: new Date().toISOString() } } }, `${name} signed. Agreement active.`)
            setModal(null)
            setTab('ledger')
          }}
        />
      )}
      {modal === 'end' && (
        <EndModal
          buyout={s.buyoutPrice}
          onClose={() => setModal(null)}
          onEnd={(status, note) => {
            update({ ...a, status }, note)
            setModal(null)
          }}
        />
      )}
      {modal === 'delete' && (
        <Modal title="Delete this agreement?" onClose={() => setModal(null)}>
          <p>This removes {a.partner.business || 'it'} and its whole ledger from this browser. It can't be undone.</p>
          <div className="row">
            <span className="spacer" />
            <button className="btn" onClick={() => setModal(null)}>Keep it</button>
            <button className="btn primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => { store.remove(a.id); notify('Agreement deleted'); go('agreements') }}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  )
}

function ReportModal({ a, onClose, onSave }: { a: Agreement; onClose: () => void; onSave: (p: Period) => void }) {
  const s = summarize(a)
  const [start, setStart] = useState(s.nextPeriod)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const existing = a.periods.find((p) => p.start === start)
  return (
    <Modal title={`Report ${BASIS_LABEL[a.basis].toLowerCase()}`} onClose={onClose}>
      <div className="stack">
        <label className="f">
          {a.cadence === 'quarterly' ? 'Quarter starting' : 'Month'}
          <input type="month" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="f">
          {BASIS_LABEL[a.basis]} for {periodLabel(start, a.cadence)}
          {a.basis === 'net_profit' && <span className="hint">Enter a negative number for a loss.</span>}
          <input type="number" autoFocus value={amount} placeholder={existing ? String(existing.amount) : '0'} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="f">Note (optional)<input type="text" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        {existing && <div className="callout">A report for this period exists. Saving replaces it.</div>}
        <div className="row">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={amount === ''}
            onClick={() =>
              onSave({ id: existing?.id ?? uid(), start, amount: Number(amount), paid: existing?.paid ?? 0, paidDate: existing?.paidDate ?? null, note, reportedAt: new Date().toISOString() })
            }
          >
            Save report
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PayModal({ a, period, owed, onClose, onSave }: { a: Agreement; period: Period; owed: number; onClose: () => void; onSave: (amt: number, date: string) => void }) {
  const [amt, setAmt] = useState(String(owed))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  return (
    <Modal title={`Payment for ${periodLabel(period.start, a.cadence)}`} onClose={onClose}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>Outstanding: <span className="num">{money(owed, true)}</span></p>
        <div className="grid g2">
          <label className="f">Amount received<input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
          <label className="f">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <div className="row">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn green" disabled={!(Number(amt) > 0)} onClick={() => onSave(Number(amt), date)}>Record payment</button>
        </div>
      </div>
    </Modal>
  )
}

function SignModal({ a, onClose, onSign }: { a: Agreement; onClose: () => void; onSign: (name: string) => void }) {
  const [name, setName] = useState(a.partner.name)
  const [ok, setOk] = useState(false)
  return (
    <Modal title={`Signature from ${a.partner.business}`} onClose={onClose}>
      <div className="stack">
        <label className="f">Full name as signed<input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div style={{ fontStyle: 'italic', fontWeight: 500, fontSize: 26, color: 'var(--green)', minHeight: 40 }}>{name}</div>
        <label className="check">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          <span>{a.partner.name || 'The partner'} has read and agreed to the terms of this agreement.</span>
        </label>
        <div className="row">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn green" disabled={!ok || !name.trim()} onClick={() => onSign(name.trim())}>Record and activate</button>
        </div>
      </div>
    </Modal>
  )
}

function EndModal({ buyout, onClose, onEnd }: { buyout: number | null; onClose: () => void; onEnd: (s: Agreement['status'], note: string) => void }) {
  const [kind, setKind] = useState<'completed' | 'bought_out' | 'terminated'>(buyout != null ? 'bought_out' : 'completed')
  const [reason, setReason] = useState('')
  return (
    <Modal title="End this agreement" onClose={onClose}>
      <div className="stack">
        <div className="choice">
          <button className={`opt ${kind === 'completed' ? 'on' : ''}`} onClick={() => setKind('completed')}><b>Term complete</b><span>The term or cap was reached.</span></button>
          {buyout != null && (
            <button className={`opt ${kind === 'bought_out' ? 'on' : ''}`} onClick={() => setKind('bought_out')}>
              <b>Bought out for {money(buyout)}</b>
              <span>The owner paid the buyout price.</span>
            </button>
          )}
          <button className={`opt ${kind === 'terminated' ? 'on' : ''}`} onClick={() => setKind('terminated')}><b>Terminated</b><span>Ended early for breach or by mutual agreement.</span></button>
        </div>
        <label className="f">Note (optional)<input type="text" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <div className="row">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={() =>
              onEnd(kind, `${kind === 'completed' ? 'Term completed' : kind === 'bought_out' ? `Bought out for ${money(buyout)}` : 'Terminated'}${reason ? `: ${reason}` : ''}`)
            }
          >
            End agreement
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ActivityLog({ a, onAdd }: { a: Agreement; onAdd: (t: string) => void }) {
  const [t, setT] = useState('')
  return (
    <div className="stack">
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT('') } }}>
        <input type="text" placeholder="Add a note: a call, a change, a promise" value={t} onChange={(e) => setT(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" type="submit">Add note</button>
      </form>
      <ul className="timeline">
        {a.activity.map((x) => (
          <li key={x.id}>
            {x.text}
            <time>{new Date(x.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
          </li>
        ))}
      </ul>
    </div>
  )
}
