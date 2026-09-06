const { chromium } = require('playwright')
const assert = require('node:assert/strict')

;(async () => {
  const browser = await chromium.launch()
  try {
    for (const [label, locale, start, failOnce] of [
      ['EN', 'en_US', 'Continue to payment', false],
      ['日本語', 'ja_JP', '決済に進む', false],
      ['한국어', 'ko_KR', '결제 진행하기', false],
      ['EN', 'en_US', 'Continue to payment', true],
    ]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      let blocked = 0, rejectSdk = failOnce
      const sdk = []
      page.on('console', m => { if (m.type() === 'error') console.log('console error:', m.text().split('\n')[0].slice(0,100)) })
      await page.route('**/api/training/**', route => {
        if (route.request().url().endsWith('/checkout')) {
          return route.fulfill({ json: { success: true, orderNo: 'QA-NO-CHARGE', pgOrderId: 'QA-NO-CHARGE-1', amount: 100000, totalAmount: 100000, installmentMonths: 1, orderName: 'QA', customerKey: 'qa-local', paypalQuote: { currency: 'USD', amount: 75, krwPerUnit: 1333.33 } } })
        }
        blocked++
        return route.abort()
      })
      await page.route('https://www.paypal.com/sdk/js?**', route => rejectSdk ? route.abort() : route.continue())
      page.on('response', r => { if (r.url().includes('paypal.com/sdk/js')) sdk.push({ locale: new URL(r.url()).searchParams.get('locale'), status: r.status() }) })
      await page.goto('http://localhost:3196/audition-fee')
      await page.getByRole('button', { name: label, exact: true }).last().click()
      await page.getByRole('textbox').first().fill('QA')
      await page.locator('input[type=email]').fill('qa@example.com')
      await page.locator('input[type=checkbox]').check()
      await page.getByRole('button', { name: start, exact: true }).click()
      await page.getByRole('button', { name: /PayPal/ }).click()
      await page.waitForTimeout(2000)
      console.log('SDK results', sdk)
      await page.screenshot({path:'tmp/visa-debug.png',fullPage:true})
      if (failOnce) {
        await page.getByRole('button', { name: 'Reload PayPal', exact: true }).waitFor()
        rejectSdk = false
        await page.getByRole('button', { name: 'Reload PayPal', exact: true }).click()
      }
      const buttonFrame = page.locator('iframe[title="PayPal"].component-frame')
      await buttonFrame.waitFor({ state: 'attached', timeout: 20000 })
      await buttonFrame.scrollIntoViewIfNeeded()
      await buttonFrame.waitFor({ state: 'visible', timeout: 20000 })
      await page.frameLocator('iframe[title="PayPal"].component-frame').locator('[data-funding-source="paypal"]').waitFor({state:'visible',timeout:20000})
      assert(sdk.some(s => s.locale === locale && s.status === 200))
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: `tmp/visa-checkout-${locale}-${failOnce ? 'reload' : 'fixed'}.png` })
      console.log(`PASS ${locale}: visible button, mobile layout${failOnce ? ', SDK failure/reload' : ''}`)
      await page.goto('http://localhost:3196/training/fail?product=audition-fee&ref=qa.reference&lang=en&code=EXPIRED')
      const href = await page.getByRole('link', { name: 'Try again', exact: true }).getAttribute('href')
      assert(href.includes('ref=qa.reference') && href.includes('lang=en'))
      assert.equal(blocked, 0)
      await page.close()
    }
    console.log('PASS original product/ref/language retry; all checkout calls mocked, no payment execution')
  } finally { await browser.close() }
})().catch(e => { console.error(e.message); process.exit(1) })
