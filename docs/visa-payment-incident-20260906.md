# Visa checkout incident — 2026-09-06

Status: release prepared; user requested completion and reliable domestic/international checkout after the deployment question.

## Evidence

- Leo has five audition-fee orders between 10:37 and 10:44 KST on September 6, with no paid records in GRIGO or deetz.
- Four have synthetic `ABORTED / NOT_FOUND_PAYMENT` records written roughly two minutes after creation. These are application classifications, not evidence that the buyer cancelled a Toss checkout. The checkout endpoint initially labels every order as Toss, including orders awaiting a PayPal button.
- The last order, `GRT-260906-02C02A`, contains a real Toss response: requested at 10:44:08, `EXPIRED`, no approval time, no selected method, no card details, no provider failure code. It was recorded at 11:14:51. The exact point at which Leo stopped cannot be reconstructed from the current logs.
- Production `/audition-fee` reproduced a PayPal SDK HTTP 400 with `locale=en-US` and no payment button. The browser's checkout request was intercepted and fulfilled with a dummy response; no production order was created.
- Read-only requests using the production public client ID returned HTTP 400 for `en-US`, `ja-JP`, `ko-KR` and HTTP 200 for `en_US`, `ja_JP`, `ko_KR`.
- `FailClient` and failure email both previously sent every customer to `/training`, losing the original product and signed application reference.
- A direct fresh Toss lookup was unavailable with the local credentials (401); the transaction findings above are based on stored provider responses, not a fresh PG lookup.
- Follow-up: pulled the actual Vercel production environment into an ignored local file and verified Toss lookup HTTP 200 (`EXPIRED`, no approval) and live PayPal authentication HTTP 200. The earlier local credentials were stale; production credentials are valid.

## Changes

- Use PayPal v5 locale identifiers and show an explicit reload control when SDK loading fails.
- Preserve the product, application reference and language in failure-page retry links. Failure email references are regenerated server-side from the order's application and product, without embedding customer contact details.
- Omit masked display-only customer fields from Toss SDK optional fields. Actual customer details remain in the server-side order.
- Keep missing-PG recovery eligible for 35 minutes instead of declaring abandonment after two minutes. This covers the 30-minute Toss window plus an opening allowance within the existing 40-minute cron scan window.
- No schema migration, customer-data correction, payment execution or email sending was performed.
- Follow-up hardening: KRW domestic payments and USD PayPal payments are explicitly labelled. The USD quote is saved per installment in `training_orders.metadata.paypal_quotes` and reused by checkout, order creation and capture checks. Currency overrides and the obsolete KRW-first PayPal request are removed; existing production policy remains USD with the same conversion rate.
- Capture checks exact currency/value before charging and uses a stable PayPal idempotency key. Already completed orders are finalized from the PG lookup; timeouts/unknown outcomes are rechecked and kept pending instead of marked failed. The buyer can check the same order again while method/order edits are disabled.
- Receipt foreign-charge amounts come from completed provider capture records, never the current exchange rate. Quotes missing from legacy unapproved checkout sessions require a new checkout; already created legacy provider orders retain amount verification.

## Verification

- Unit regressions: `node --test tests/training-toss-state.test.mjs tests/training-checkout-client.test.mjs` (7 pass).
- Scoped TypeScript: `npx tsc -p tsconfig.visa-checkout.json` passes.
- Production build: `npm run build` passes (repository configuration skips full-project lint/type validation during build).
- Full-project TypeScript has existing errors outside the changed files, including inquiry route parameter types and proposal component joins.
- Legacy ESLint configuration requires `ESLINT_USE_FLAT_CONFIG=false`; the changed-file run reports an existing plain anchor to `/monthly-training` in TrainingClient.
- Browser regression: `tests/visa-checkout-browser.cjs`, using localhost port 3196 and intercepted checkout responses. The live PayPal SDK is loaded, but approval and capture are never invoked.
- Production-build browser results: actual PayPal buttons visible inside the provider iframe in English, Japanese and Korean; 390px layout without horizontal overflow; forced SDK load failure and reload recovery pass; original product/ref/language retry passes. Screenshots are in `tmp/visa-checkout-*-fixed.png` and `tmp/visa-checkout-en_US-reload.png`.
- Local browser runs also log unrelated HTTP 404s and the intentionally blocked SDK request; this is not a claim of zero console errors across the application.
- Follow-up verification: 26 unit/route regressions pass, including persisted quotes, currency overrides, rate drift, under/overpayments, wrong currencies, completed/lost/pending captures, decline retry and receipt amounts. All external requests and mail are stubbed in route tests. Scoped TypeScript passes.
- Production-build browser checks also cover CARD and TRANSFER payloads (KRW 100,000, original retry product/language), using a stubbed Toss SDK and mocked order/recovery APIs. No live card authorization was attempted.

## Limits

The PayPal loader failure is reproduced and fixed; it explains why the default international payment route was unavailable. Leo's individual browser history is unavailable, so it does not prove that all five attempts followed the same sequence. `EXPIRED` alone does not establish a bank decline or a problem with Leo's card.

Existing orders remain untouched. Historical provider labels and coarse abandonment classifications should not be used as counts of actual Toss payment attempts. End-to-end live authorization and charging remain untested.

References: [PayPal v5 configuration](https://developer.paypal.com/sdk/js/v5/configuration), [Toss payment lifecycle](https://docs.tosspayments.com/reference/using-api/webhook-events).
