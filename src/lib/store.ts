import { useCallback, useEffect, useState } from 'react'
import type { Agreement, AppData, Period } from '../types'
import { addMonthsYM, ym } from './calc'

const KEY = 'stakeforward:v1'

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function nowISO() {
  return new Date().toISOString()
}

export function blankAgreement(profile: AppData['profile']): Agreement {
  const today = new Date()
  const start = `${ym(today)}-01`
  return {
    id: uid(),
    title: '',
    status: 'draft',
    provider: { ...profile },
    partner: { name: '', business: '', email: '' },
    services: '',
    serviceValue: null,
    basis: 'net_profit',
    basisNotes: '',
    tiers: [{ fromMonth: 1, percent: 20 }],
    term: { months: 36, capAmount: null, endDate: null },
    lossCarryForward: true,
    periodFloor: 0,
    cadence: 'monthly',
    startDate: start,
    paymentDueDays: 15,
    buyout: { enabled: true, fixedAmount: null, trailingMultiple: 2 },
    auditRights: true,
    governingState: 'Delaware',
    signatures: { provider: null, partner: null },
    periods: [],
    activity: [],
    createdAt: nowISO(),
  }
}

function seedPeriods(
  start: string,
  count: number,
  step: number,
  amounts: number[],
  paidThrough: number,
  shareFor: (amt: number, i: number) => number,
): Period[] {
  return Array.from({ length: count }, (_, i) => {
    const s = addMonthsYM(start.slice(0, 7), i * step)
    const amount = amounts[i % amounts.length]
    const paid = i < paidThrough ? Math.max(0, shareFor(amount, i)) : 0
    return {
      id: uid(),
      start: s,
      amount,
      paid,
      paidDate: i < paidThrough ? `${addMonthsYM(s, step)}-12` : null,
      note: '',
      reportedAt: `${addMonthsYM(s, step)}-05T14:00:00.000Z`,
    }
  })
}

function seed(): AppData {
  const profile = { name: 'Your Name', business: 'Your Studio', email: 'you@example.com' }
  const today = new Date()

  // Agreement 1: 20% of net profit, 36 months or $25k cap, monthly, started 12 months ago
  const s1 = `${addMonthsYM(ym(today), -12)}-01`
  const a1Amounts = [-1800, -400, 1200, 2600, 3100, 2900, 4200, 5100, 4700, 6000, 6800, 7400]
  // Loss carry-forward makes exact paid amounts fiddly; precomputed shares at 20% after offsets:
  const a1Shares = [0, 0, 0, 320, 620, 580, 840, 1020, 940, 1200, 1360, 1480]
  const a1: Agreement = {
    ...blankAgreement(profile),
    id: 'harbor',
    title: 'Online ordering site',
    status: 'active',
    partner: { name: 'Dana Ruiz', business: 'Harbor & Pine Coffee', email: 'dana@harborpine.example' },
    services:
      'Design and build of an online ordering website with menu management, Stripe checkout, and pickup scheduling. Hosting and maintenance for the life of the agreement.',
    serviceValue: 12000,
    basis: 'net_profit',
    basisNotes: 'Net profit of the whole business as shown on the monthly P&L.',
    tiers: [{ fromMonth: 1, percent: 20 }],
    term: { months: 36, capAmount: 25000, endDate: null },
    lossCarryForward: true,
    startDate: s1,
    buyout: { enabled: true, fixedAmount: null, trailingMultiple: 2 },
    signatures: {
      provider: { name: 'Your Name', signedAt: `${s1}T15:00:00.000Z` },
      partner: { name: 'Dana Ruiz', signedAt: `${s1}T18:30:00.000Z` },
    },
    periods: seedPeriods(s1, 12, 1, a1Amounts, 10, (_a, i) => a1Shares[i]),
    activity: [
      { id: uid(), at: `${s1}T18:30:00.000Z`, text: 'Both parties signed. Agreement active.' },
      { id: uid(), at: `${addMonthsYM(s1.slice(0, 7), 3)}-05T14:00:00.000Z`, text: 'First profitable month after losses were recovered.' },
    ],
    createdAt: `${s1}T12:00:00.000Z`,
  }

  // Agreement 2: 15% of attributed revenue, steps down to 7.5% after 12 months, indefinite with buyout, quarterly
  const s2 = `${addMonthsYM(ym(today), -10)}-01`
  const a2Amounts = [9800, 14200, 16900]
  const a2: Agreement = {
    ...blankAgreement(profile),
    id: 'tidewater',
    title: 'Booking and reminders app',
    status: 'active',
    partner: { name: 'Marcus Bell', business: 'Tidewater Mobile Detailing', email: 'marcus@tidewater.example' },
    services: 'Customer booking web app with SMS reminders, deposit collection, and a route planner for the crew.',
    serviceValue: 8000,
    basis: 'attributed_revenue',
    basisNotes: 'Revenue from jobs booked through the app, as recorded in its booking reports.',
    tiers: [
      { fromMonth: 1, percent: 15 },
      { fromMonth: 13, percent: 7.5 },
    ],
    term: { months: null, capAmount: null, endDate: null },
    lossCarryForward: false,
    cadence: 'quarterly',
    paymentDueDays: 30,
    startDate: s2,
    buyout: { enabled: true, fixedAmount: null, trailingMultiple: 3 },
    signatures: {
      provider: { name: 'Your Name', signedAt: `${s2}T15:00:00.000Z` },
      partner: { name: 'Marcus Bell', signedAt: `${s2}T16:00:00.000Z` },
    },
    periods: seedPeriods(s2, 3, 3, a2Amounts, 2, (a) => Math.round(a * 0.15 * 100) / 100),
    activity: [{ id: uid(), at: `${s2}T16:00:00.000Z`, text: 'Both parties signed. Agreement active.' }],
    createdAt: `${s2}T12:00:00.000Z`,
  }

  // Agreement 3: proposed, awaiting partner signature
  const s3 = `${ym(today)}-01`
  const a3: Agreement = {
    ...blankAgreement(profile),
    id: 'lark',
    title: 'Online shop and print-order portal',
    status: 'proposed',
    partner: { name: 'June Okafor', business: 'Lark Letterpress', email: 'june@larkpress.example' },
    services: 'Shopify storefront setup, custom wedding-suite order builder, and proofing workflow.',
    serviceValue: 6500,
    basis: 'net_profit',
    tiers: [{ fromMonth: 1, percent: 20 }],
    term: { months: 24, capAmount: 19500, endDate: null },
    startDate: s3,
    signatures: { provider: { name: 'Your Name', signedAt: nowISO() }, partner: null },
    activity: [{ id: uid(), at: nowISO(), text: 'Sent to June for signature.' }],
  }

  return { version: 1, profile, agreements: [a1, a2, a3] }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (parsed && parsed.version === 1 && Array.isArray(parsed.agreements)) return parsed
    }
  } catch {
    /* storage unavailable: fall through to seed */
  }
  return seed()
}

function save(d: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

export function useStore() {
  const [data, setData] = useState<AppData>(load)
  useEffect(() => save(data), [data])

  const upsert = useCallback((a: Agreement) => {
    setData((d) => {
      const exists = d.agreements.some((x) => x.id === a.id)
      return {
        ...d,
        agreements: exists ? d.agreements.map((x) => (x.id === a.id ? a : x)) : [a, ...d.agreements],
      }
    })
  }, [])

  const remove = useCallback((id: string) => {
    setData((d) => ({ ...d, agreements: d.agreements.filter((x) => x.id !== id) }))
  }, [])

  const setProfile = useCallback((profile: AppData['profile']) => setData((d) => ({ ...d, profile })), [])
  const replaceAll = useCallback((next: AppData) => setData(next), [])
  const reset = useCallback(() => setData(seed()), [])
  const clear = useCallback(
    () => setData((d) => ({ version: 1, profile: d.profile, agreements: [] })),
    [],
  )

  return { data, upsert, remove, setProfile, replaceAll, reset, clear }
}

export function logActivity(a: Agreement, text: string): Agreement {
  return { ...a, activity: [{ id: uid(), at: nowISO(), text }, ...a.activity] }
}
