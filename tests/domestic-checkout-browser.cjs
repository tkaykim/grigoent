const { chromium } = require('playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch()
  try {
    for (const [label, method] of [['Korean-issued card', 'CARD'], ['Bank transfer', 'TRANSFER']]) {
      const page = await browser.newPage()
      await page.route('https://js.tosspayments.com/v2/standard', route => route.fulfill({ contentType: 'application/javascript', body: `window.TossPayments = function() { return {payment: function() { return {requestPayment: async function(input) { window.__qaTossRequest = input; }} }} }` }))
      await page.route('**/api/training/**', route => {
        const url = route.request().url()
        if (url.endsWith('/checkout')) return route.fulfill({ json: { success: true, orderNo: 'QA-ORDER', pgOrderId: 'QA-ORDER-1', amount: 100000, totalAmount: 100000, installmentMonths: 1, orderName: 'QA', customerKey: 'qa-local', paypalQuote: { currency: 'USD', amount: 75, krwPerUnit: 1350, krwAmount: 100000 } } })
        if (url.endsWith('/recover')) return route.fulfill({ json: { success: false, state: 'waiting' } })
        return route.abort()
      })
      await page.goto('http://localhost:3196/audition-fee')
      await page.getByRole('button', { name: 'EN', exact: true }).last().click()
      await page.getByRole('textbox').first().fill('QA')
      await page.locator('input[type=email]').fill('qa@example.com')
      await page.locator('input[type=checkbox]').check()
      await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
      await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
      await page.getByRole('button', { name: 'Pay KRW 100,000', exact: true }).click()
      await page.waitForFunction(() => window.__qaTossRequest)
      const request = await page.evaluate(() => window.__qaTossRequest)
      assert.equal(request.method, method)
      assert.deepEqual(request.amount, { currency: 'KRW', value: 100000 })
      assert.equal(new URL(request.failUrl).searchParams.get('product'), 'audition-fee')
      assert.equal(new URL(request.failUrl).searchParams.get('lang'), 'en')
      if (method === 'CARD') assert.equal(request.card.useAppCardOnly, false)
      console.log(`PASS ${method}: KRW 100,000, original product retry, no live PG call`)
      await page.close()
    }
  } finally { await browser.close() }
})().catch(e => { console.error(e.message); process.exit(1) })
