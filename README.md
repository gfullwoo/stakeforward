# Stakeforward

**Build now. Get paid forward.**
Profit-share agreements for people who build for small businesses that can't pay upfront.
Domains: stakeforward.com (primary), sharemyprofit.com (redirects to primary).

## What it does

- **Agreement wizard.** Set up the parties and the work, then the share basis (net profit, gross revenue, or revenue from your work), the percentage with optional step-downs, a loss carry-forward, and a per-period floor. The term can end at a number of months, a payout cap, a date, whichever of those comes first, or never. Then set the reporting cadence, the payment window, a buyout (a fixed price or a multiple of the last 12 months), audit rights, and the governing state. A live "if they make $X/month" projection shows the first payment, the total, and when the term ends.
- **Generated agreement.** Plain-language clauses built from the terms, with a signature block, a copy-text button, and print. Signatures are a typed-name record, not a legal e-signature. Have a lawyer review the template.
- **Ledger.** Report each period. The app works out the share, applies prior losses, the floor, and the cap, and flags shares paid after the term ended. It tracks paid, due, and overdue amounts by due date.
- **Dashboard.** Earned, collected, outstanding, and past-due totals; a 12-month paid/unpaid chart; a "needs attention" list (overdue payments, unsigned agreements, missing reports, terms near their end); and term progress for each agreement.
- **Lifecycle.** Draft → awaiting signature → active → term complete, bought out, or terminated, with an activity log of notes.
- **Brand page.** Logo, palette, type, and voice.

## Run it

```bash
npm install
npm run dev            # local dev
npm run build          # dist/ for hosting (Cloudflare Pages, Firebase Hosting, etc.)
npm run build:single   # dist-single/index.html, one self-contained file
```

Data lives in the browser's localStorage under the key `stakeforward:v1`. Settings lets you export and import it as JSON.

## Layout

```
src/
  types.ts                 data model (Agreement, Term, Tier, Period, ...)
  lib/calc.ts              all money math: ledger, caps, tiers, loss carry-forward, term progress, buyout
  lib/agreementText.ts     clause generator
  lib/store.ts             localStorage store + sample data
  views/                   Dashboard, Agreements, AgreementDetail, AgreementWizard, Brand, Settings
  components/              Logo (mark + wordmark), AgreementDoc, ui
public/stakeforward-mark.svg, favicon.svg
```

## Brand

| Token | Hex | Use |
|---|---|---|
| Ink | `#18211D` | text, primary buttons, the disc in the mark |
| Paper | `#F5F1E8` | background |
| Forward Green | `#1E6B4F` | money in, the "forward" in the wordmark |
| Ember | `#E0743A` | the share slice, money owed |
| Alert | `#B0412F` | overdue only |

Type: Geist (headlines, wordmark, body) and Geist Mono (figures). The fonts are bundled through @fontsource.

The mark is a disc with a 72° slice (20%) pulled out, up and to the right. The slice is the share, and the gap shows that the share can end.

## Next steps toward a multi-user product

1. Auth and a shared backend (Firebase Auth + Firestore fits this model), so the partner logs in, sees the same ledger, and reports their own numbers.
2. Real e-signature (Dropbox Sign or DocuSign API) in place of the typed-name record.
3. Payments through Stripe Connect: invoice each period's share and mark it paid automatically.
4. Pull numbers straight from QuickBooks, Stripe, or Shopify, so reports aren't self-entered.
5. Email reminders when a report or payment is due.
