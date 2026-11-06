export type AgreementStatus =
  | 'draft'
  | 'proposed'
  | 'active'
  | 'completed'
  | 'terminated'
  | 'bought_out'

export type ProfitBasis = 'net_profit' | 'gross_revenue' | 'attributed_revenue'

export type Cadence = 'monthly' | 'quarterly'

export interface Party {
  name: string
  business: string
  email: string
}

/** Share percent that applies starting at a given month of the agreement (1-based). */
export interface Tier {
  fromMonth: number
  percent: number
}

/** The share ends when ANY enabled condition is hit. None enabled = indefinite. */
export interface Term {
  months: number | null
  capAmount: number | null
  endDate: string | null // YYYY-MM-DD
}

export interface Buyout {
  enabled: boolean
  /** Fixed buyout price. If null, use multiple of trailing-12-month payouts. */
  fixedAmount: number | null
  trailingMultiple: number | null
}

export interface Signature {
  name: string
  signedAt: string // ISO
}

export interface Period {
  id: string
  /** First month of the period, YYYY-MM */
  start: string
  /** Amount of the basis for the period (net profit, gross revenue, or attributed revenue). Can be negative for net profit. */
  amount: number
  paid: number
  paidDate: string | null
  note: string
  reportedAt: string
}

export interface ActivityItem {
  id: string
  at: string
  text: string
}

export interface Agreement {
  id: string
  title: string
  status: AgreementStatus
  provider: Party
  partner: Party
  services: string
  /** Fair market value of the work, informational and used for "multiple of value" cap presets. */
  serviceValue: number | null
  basis: ProfitBasis
  basisNotes: string
  tiers: Tier[]
  term: Term
  /** Losses in earlier periods offset later profits before a share is owed. */
  lossCarryForward: boolean
  /** Basis below this per period owes nothing (e.g. first $500/mo is the owner's). */
  periodFloor: number
  cadence: Cadence
  startDate: string // YYYY-MM-DD
  paymentDueDays: number
  buyout: Buyout
  auditRights: boolean
  governingState: string
  signatures: { provider: Signature | null; partner: Signature | null }
  periods: Period[]
  activity: ActivityItem[]
  createdAt: string
}

export interface ProviderProfile {
  name: string
  business: string
  email: string
}

export interface AppData {
  version: 1
  profile: ProviderProfile
  agreements: Agreement[]
}
