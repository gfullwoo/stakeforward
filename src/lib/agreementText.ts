import type { Agreement } from '../types'
import { BASIS_LABEL, fmtDate, money, termSentence, tierSentence } from './calc'

export interface Clause {
  heading: string
  body: string
}

export function buildClauses(a: Agreement): Clause[] {
  const prov = a.provider.business || a.provider.name || 'Provider'
  const part = a.partner.business || a.partner.name || 'Partner'
  const period = a.cadence === 'quarterly' ? 'calendar quarter' : 'calendar month'

  const basisText: Record<Agreement['basis'], string> = {
    net_profit: `"Net Profit" means ${part}'s total revenue for the period minus ordinary and necessary business expenses, determined consistently from period to period. Owner salaries or draws above a reasonable market rate, and payments to related parties above market rate, are not counted as expenses.`,
    gross_revenue: `"Gross Revenue" means all money ${part} receives for goods and services in the period, before expenses, less refunds and sales tax collected.`,
    attributed_revenue: `"Attributed Revenue" means revenue ${part} receives in the period that is generated through, or recorded by, the Services delivered by ${prov}.`,
  }

  const clauses: Clause[] = [
    {
      heading: 'Parties',
      body: `This Profit Share Agreement (the "Agreement") is between ${a.provider.name || '[Provider name]'}${a.provider.business ? ` of ${a.provider.business}` : ''} ("${prov}") and ${a.partner.name || '[Partner name]'}${a.partner.business ? ` of ${a.partner.business}` : ''} ("${part}"). It takes effect on ${fmtDate(a.startDate)} (the "Start Date").`,
    },
    {
      heading: 'Services',
      body: `${prov} will provide the following (the "Services"): ${a.services || '[describe the services]'}${a.serviceValue ? ` The parties agree the Services have a market value of about ${money(a.serviceValue)}.` : ''} ${part} pays no upfront fee. In place of a fee, ${part} shares part of its earnings as set out below.`,
    },
    {
      heading: 'What the share is based on',
      body: `${basisText[a.basis]}${a.basisNotes ? ` ${a.basisNotes}` : ''}`,
    },
    {
      heading: 'Share percentage',
      body: `For each ${period} of the Term, ${part} will pay ${prov} ${tierSentence(a)} of ${BASIS_LABEL[a.basis]}${a.periodFloor ? ` above the first ${money(a.periodFloor)} each ${period}` : ''}. Month 1 is the month containing the Start Date.${
        a.lossCarryForward && a.basis === 'net_profit'
          ? ` If a ${period} shows a net loss, that loss is carried forward and offsets later Net Profit before any share is owed.`
          : ''
      } No share is owed for a ${period} with no positive amount.`,
    },
    {
      heading: 'Term',
      body: `${termSentence(a)} When the Term ends, ${part} owes nothing further except shares already earned for earlier periods.${
        a.term.capAmount ? ` If a payment would take total payments above ${money(a.term.capAmount)}, only the amount up to that total is owed.` : ''
      }`,
    },
    {
      heading: 'Reporting and payment',
      body: `Within ${a.paymentDueDays} days after each ${period} ends, ${part} will report the amount for that ${period} and pay the share owed. Reports and payments are recorded in Stakeforward, which both parties can use as the running record of this Agreement.`,
    },
  ]

  if (a.auditRights) {
    clauses.push({
      heading: 'Records and review',
      body: `${part} will keep accurate books. Once per year, on 14 days' notice, ${prov} may review the records needed to confirm the reported amounts. If a review shows underpayment of more than 5%, ${part} will pay the shortfall and the reasonable cost of the review.`,
    })
  }

  if (a.buyout.enabled) {
    const price =
      a.buyout.fixedAmount != null
        ? `a one-time payment of ${money(a.buyout.fixedAmount)}`
        : `a one-time payment equal to ${a.buyout.trailingMultiple ?? 2} times the shares earned in the 12 months before the buyout`
    clauses.push({
      heading: 'Buyout',
      body: `At any time ${part} may end all future share obligations by paying ${price}${a.term.capAmount ? `, but never more than the amount remaining under the payout cap` : ''}, plus any shares already earned and unpaid.`,
    })
  }

  clauses.push(
    {
      heading: 'Sale or transfer of the business',
      body: `If ${part} sells the business, or the part of it that uses the Services, ${part} will either have the buyer take on this Agreement in writing or complete the Buyout before closing.`,
    },
    {
      heading: 'Ending early',
      body: `Either party may end this Agreement on 30 days' written notice if the other party materially breaches it and does not fix the breach within that time. If ${prov} stops providing ongoing Services it agreed to provide, the share stops for the periods those Services are not provided.`,
    },
    {
      heading: 'Not a partnership',
      body: `This Agreement is a payment arrangement. It does not make the parties partners, joint venturers, or employees of each other, and it gives ${prov} no ownership, equity, or control of ${part}.`,
    },
    {
      heading: 'Governing law',
      body: `This Agreement is governed by the laws of the State of ${a.governingState || '[state]'}. It is the full agreement between the parties on this subject and can be changed only in writing signed by both.`,
    },
  )

  return clauses
}

export function agreementPlainText(a: Agreement) {
  const lines = [`PROFIT SHARE AGREEMENT`, a.title ? a.title : '', '']
  buildClauses(a).forEach((c, i) => {
    lines.push(`${i + 1}. ${c.heading.toUpperCase()}`, c.body, '')
  })
  lines.push('SIGNATURES')
  lines.push(
    `${a.provider.name || 'Provider'}: ${a.signatures.provider ? `${a.signatures.provider.name}, signed ${fmtDate(a.signatures.provider.signedAt)}` : '________________________'}`,
  )
  lines.push(
    `${a.partner.name || 'Partner'}: ${a.signatures.partner ? `${a.signatures.partner.name}, signed ${fmtDate(a.signatures.partner.signedAt)}` : '________________________'}`,
  )
  lines.push('', 'Template generated by Stakeforward. Not legal advice; have an attorney review before signing.')
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}
