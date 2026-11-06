import type { Agreement, Period, Tier } from '../types'

export const BASIS_LABEL: Record<Agreement['basis'], string> = {
  net_profit: 'Net profit',
  gross_revenue: 'Gross revenue',
  attributed_revenue: 'Revenue from the delivered services',
}

export const STATUS_LABEL: Record<Agreement['status'], string> = {
  draft: 'Draft',
  proposed: 'Awaiting signature',
  active: 'Active',
  completed: 'Term complete',
  terminated: 'Terminated',
  bought_out: 'Bought out',
}

export function cadenceMonths(c: Agreement['cadence']) {
  return c === 'quarterly' ? 3 : 1
}

/** "YYYY-MM" for a Date */
export function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function parseYM(s: string): { y: number; m: number } {
  const [y, m] = s.split('-').map(Number)
  return { y, m }
}

export function addMonthsYM(s: string, n: number) {
  const { y, m } = parseYM(s)
  const d = new Date(y, m - 1 + n, 1)
  return ym(d)
}

/** 1-based month index of `periodStart` (YYYY-MM) relative to the agreement start date. */
export function monthIndex(startDate: string, periodStart: string) {
  const a = parseYM(startDate.slice(0, 7))
  const b = parseYM(periodStart)
  return (b.y - a.y) * 12 + (b.m - a.m) + 1
}

export function periodEndDate(start: string, cadence: Agreement['cadence']) {
  const { y, m } = parseYM(start)
  return new Date(y, m - 1 + cadenceMonths(cadence), 0) // last day of final month
}

export function periodLabel(start: string, cadence: Agreement['cadence']) {
  const { y, m } = parseYM(start)
  const d = new Date(y, m - 1, 1)
  if (cadence === 'quarterly') {
    const end = new Date(y, m + 1, 1)
    const f = (x: Date) => x.toLocaleString('en-US', { month: 'short' })
    return `${f(d)}–${f(end)} ${end.getFullYear()}`
  }
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

export function percentForMonth(tiers: Tier[], idx: number) {
  const sorted = [...tiers].sort((a, b) => a.fromMonth - b.fromMonth)
  let pct = 0
  for (const t of sorted) if (idx >= t.fromMonth) pct = t.percent
  return pct
}

export interface LedgerRow {
  period: Period
  label: string
  monthIdx: number
  pct: number
  basisAmount: number
  lossOffset: number
  shareable: number
  share: number
  cappedBy: number
  afterTerm: boolean
  cumulative: number
  outstanding: number
  dueDate: Date
  overdue: boolean
}

export function computeLedger(a: Agreement, today = new Date()): LedgerRow[] {
  const periods = [...a.periods].sort((x, y) => x.start.localeCompare(y.start))
  let lossBank = 0
  let cumulative = 0
  const rows: LedgerRow[] = []
  for (const p of periods) {
    const idx = monthIndex(a.startDate, p.start)
    const pct = percentForMonth(a.tiers, idx)
    const afterMonths = a.term.months != null && idx > a.term.months
    const afterDate = a.term.endDate != null && `${p.start}-01` > a.term.endDate
    const capHit = a.term.capAmount != null && cumulative >= a.term.capAmount
    const afterTerm = afterMonths || afterDate || capHit

    let amount = p.amount
    let lossOffset = 0
    if (a.lossCarryForward) {
      if (amount < 0) {
        lossBank += -amount
        amount = 0
      } else if (lossBank > 0) {
        lossOffset = Math.min(lossBank, amount)
        lossBank -= lossOffset
        amount -= lossOffset
      }
    }
    const shareable = Math.max(0, amount - (a.periodFloor || 0))
    let share = afterTerm ? 0 : round2((shareable * pct) / 100)
    let cappedBy = 0
    if (!afterTerm && a.term.capAmount != null) {
      const room = Math.max(0, a.term.capAmount - cumulative)
      if (share > room) {
        cappedBy = round2(share - room)
        share = round2(room)
      }
    }
    cumulative = round2(cumulative + share)
    const dueDate = new Date(periodEndDate(p.start, a.cadence))
    dueDate.setDate(dueDate.getDate() + (a.paymentDueDays || 0))
    const outstanding = round2(Math.max(0, share - (p.paid || 0)))
    rows.push({
      period: p,
      label: periodLabel(p.start, a.cadence),
      monthIdx: idx,
      pct,
      basisAmount: p.amount,
      lossOffset,
      shareable,
      share,
      cappedBy,
      afterTerm,
      cumulative,
      outstanding,
      dueDate,
      overdue: outstanding > 0 && dueDate < today,
    })
  }
  return rows
}

export interface Summary {
  accrued: number
  paid: number
  outstanding: number
  overdue: number
  monthsElapsed: number
  monthsProgress: number | null
  capProgress: number | null
  dateProgress: number | null
  /** The closest-to-done end condition, 0..1, or null for indefinite */
  termProgress: number | null
  endedReason: string | null
  trailing12Paid: number
  buyoutPrice: number | null
  nextPeriod: string
  currentPct: number
}

export function summarize(a: Agreement, today = new Date()): Summary {
  const rows = computeLedger(a, today)
  const accrued = round2(rows.reduce((s, r) => s + r.share, 0))
  const paid = round2(rows.reduce((s, r) => s + (r.period.paid || 0), 0))
  const outstanding = round2(rows.reduce((s, r) => s + r.outstanding, 0))
  const overdue = round2(rows.filter((r) => r.overdue).reduce((s, r) => s + r.outstanding, 0))
  const monthsElapsed = Math.max(0, monthIndex(a.startDate, ym(today)) - 1)

  const monthsProgress = a.term.months ? clamp01(monthsElapsed / a.term.months) : null
  const capProgress = a.term.capAmount ? clamp01(accrued / a.term.capAmount) : null
  let dateProgress: number | null = null
  if (a.term.endDate) {
    const s = new Date(a.startDate).getTime()
    const e = new Date(a.term.endDate).getTime()
    dateProgress = e > s ? clamp01((today.getTime() - s) / (e - s)) : 1
  }
  const candidates = [monthsProgress, capProgress, dateProgress].filter((x): x is number => x != null)
  const termProgress = candidates.length ? Math.max(...candidates) : null

  let endedReason: string | null = null
  if (capProgress != null && capProgress >= 1) endedReason = 'Payout cap reached'
  else if (monthsProgress != null && monthsProgress >= 1) endedReason = `${a.term.months}-month term complete`
  else if (dateProgress != null && dateProgress >= 1) endedReason = 'End date reached'

  const cutoff = addMonthsYM(ym(today), -12)
  const trailing12Paid = round2(
    rows.filter((r) => r.period.start >= cutoff).reduce((s, r) => s + r.share, 0),
  )
  let buyoutPrice: number | null = null
  if (a.buyout.enabled) {
    if (a.buyout.fixedAmount != null) buyoutPrice = a.buyout.fixedAmount
    else if (a.buyout.trailingMultiple != null) buyoutPrice = round2(trailing12Paid * a.buyout.trailingMultiple)
    if (buyoutPrice != null && a.term.capAmount != null) {
      buyoutPrice = Math.min(buyoutPrice, Math.max(0, a.term.capAmount - accrued))
    }
  }

  const sorted = [...a.periods].sort((x, y) => x.start.localeCompare(y.start))
  const nextPeriod = sorted.length
    ? addMonthsYM(sorted[sorted.length - 1].start, cadenceMonths(a.cadence))
    : a.startDate.slice(0, 7)

  return {
    accrued,
    paid,
    outstanding,
    overdue,
    monthsElapsed,
    monthsProgress,
    capProgress,
    dateProgress,
    termProgress,
    endedReason,
    trailing12Paid,
    buyoutPrice,
    nextPeriod,
    currentPct: percentForMonth(a.tiers, monthsElapsed + 1),
  }
}

export function termSentence(a: Agreement) {
  const parts: string[] = []
  if (a.term.months) parts.push(`${a.term.months} months`)
  if (a.term.capAmount) parts.push(`${money(a.term.capAmount)} paid in total`)
  if (a.term.endDate) parts.push(`${fmtDate(a.term.endDate)}`)
  if (!parts.length) return 'Indefinite. The share continues until both parties end it in writing.'
  if (parts.length === 1) return `Ends at ${parts[0]}.`
  return `Ends at whichever comes first: ${parts.join(', ')}.`
}

export function tierSentence(a: Agreement) {
  const t = [...a.tiers].sort((x, y) => x.fromMonth - y.fromMonth)
  if (t.length === 1) return `${t[0].percent}%`
  return t
    .map((x, i) => {
      const next = t[i + 1]
      const range = next ? `months ${x.fromMonth}–${next.fromMonth - 1}` : `month ${x.fromMonth} onward`
      return `${x.percent}% (${range})`
    })
    .join(', then ')
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function money(n: number | null | undefined, cents = false) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
}

export function fmtDate(s: string | Date) {
  const d = typeof s === 'string' ? new Date(s.length === 10 ? `${s}T12:00:00` : s) : s
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
