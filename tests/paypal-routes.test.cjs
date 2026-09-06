const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
function moduleFrom(file, dependencies, fetchImpl) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, require: name => { if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`); return dependencies[name] },
    process: { env: { NEXT_PUBLIC_PAYPAL_CLIENT_ID: 'test', PAYPAL_CLIENT_SECRET: 'test', PAYPAL_FOREIGN_CURRENCY: 'KRW', PAYPAL_TRY_KRW: 'true', PAYPAL_KRW_PER_USD: '1400' } },
    Buffer, fetch: fetchImpl, AbortSignal, console: { error() {}, warn() {} }, URL, Date,
  }, { filename: file })
  return exports
}
const fx = moduleFrom('src/lib/paypal-fx.ts', {})
const quote = { currency: 'USD', amount: 75, krwPerUnit: 1350, krwAmount: 100000 }
const providerId = 'TEST-PAYPAL-ORDER'
const pgOrderId = 'QA-ORDER-1'
function providerOrder({ currency = 'USD', value = '75.00', status = 'APPROVED', captureStatus = 'COMPLETED' } = {}) {
  return { id: providerId, status, purchase_units: [{ reference_id: pgOrderId, amount: { currency_code: currency, value }, payments: status === 'COMPLETED' ? { captures: [{ id: 'TEST-CAPTURE', status: captureStatus, amount: { currency_code: currency, value } }] } : undefined }] }
}

function setup({ payment = {}, metadata = { paypal_quotes: { 1: quote } }, lookup = providerOrder(), after = lookup, capture = providerOrder({ status: 'COMPLETED' }), captureHttp = 201, timeout = false } = {}) {
  const rows = {
    training_order_payments: [{ id: '11111111-1111-4111-8111-111111111111', order_id: 'order', pg_order_id: pgOrderId, sequence: 1, amount: 100000, status: 'pending', provider_order_id: providerId, ...payment }],
    training_orders: [{ id: 'order', product_id: 'product', order_no: 'QA-ORDER', metadata, total_amount: 100000, installment_months: 1, customer_email: 'qa@example.com' }],
    training_products: [{ id: 'product', slug: 'audition-fee', title: 'Audition', is_active: true }],
    training_price_plans: [{ id: 'plan', product_id: 'product', code: 'fee', is_active: true, total_amount: 100000, amount_per_charge: 100000, installment_months: 1, currency: 'KRW' }],
  }
  const calls = [], writes = []
  let lookups = 0, receipts = 0
  const db = { from(table) {
    let filters = [], update, insert
    const query = {
      select() { return query },
      eq(k,v) { filters.push(r => r[k] === v); return query },
      in(k,v) { filters.push(r => v.includes(r[k])); return query },
      update(value) { update=value;return query },
      insert(value) { insert=value;return query },
      maybeSingle() { return Promise.resolve(run(true)) },
      single() { return Promise.resolve(run(true)) },
      then(resolve,reject) { return Promise.resolve(run(false)).then(resolve,reject) },
    }
    function run(single) {
      if(insert) {
        const added=(Array.isArray(insert)?insert:[insert]).map((r,i)=>({id:`new-${table}-${i}`,...r}))
        rows[table].push(...added)
        return {data:single?added[0]:added,error:null}
      }
      const found = (rows[table] || []).filter(r => filters.every(f => f(r)))
      if(update) { writes.push({table,...update}); found.forEach(r=>Object.assign(r,update)) }
      return { data: single ? found[0] || null : found, error: null }
    }
    return query
  } }
  const fetchImpl = async (url, options = {}) => {
    calls.push({url, ...options})
    if(url.endsWith('/v1/oauth2/token')) return Response.json({access_token:'TEST-TOKEN'})
    if(url.endsWith('/capture')) {
      if(timeout) throw new TypeError('Simulated network failure')
      return Response.json(capture,{status:captureHttp})
    }
    if(options.method === 'POST' && url.endsWith('/v2/checkout/orders')) return Response.json({id:providerId,status:'CREATED'},{status:201})
    return Response.json(lookups++ === 0 ? lookup : after)
  }
  const dependencies = {
    'next/server': {NextResponse:{json:(data, options)=>Response.json(data,options)}},
    '@supabase/supabase-js': {createClient:()=>db},
    '@/lib/paypal-fx': fx,
    '@/lib/visa-payment-ref': {notifyVisaCasePayment:async()=>false,verifyVisaPaymentRef:()=>null},
    '@/lib/visa-program-sync': {loadVisaDocumentProductSlug:async()=>null,syncPaidProgramOrderToDeetz:async()=>null},
    '@/lib/payment-receipt': {sendPaymentReceipt:async()=>{receipts++;return true}},
    'node:crypto': require('node:crypto'),
    '@/lib/payment-request-audit': {buildPaymentRequestAudit:()=>({version:1})},
    '@/lib/discount': {},
    '@/lib/training-package': {TRAINING_PRODUCT_SLUG:'training-and-placement',buildDueDates:()=>['2026-09-06'],buildOrderNo:()=>'QA-CHECKOUT'},
  }
  return {
    async run(kind='capture-order') {
      const route=moduleFrom(`src/app/api/training/paypal/${kind}/route.ts`, dependencies, fetchImpl)
      const response=await route.POST({json:async()=>({pgOrderId,paypalOrderId:providerId})})
      return {http:response.status, body:await response.json()}
    }, calls, rows, writes, get receipts(){return receipts},
    async checkout() {
      const route=moduleFrom('src/app/api/training/checkout/route.ts',dependencies,fetchImpl)
      const response=await route.POST({headers:new Headers(),json:async()=>({productSlug:'audition-fee',planCode:'fee',name:'QA',email:'qa@example.com',agreed:true,preferredLang:'en'})})
      return {http:response.status,body:await response.json()}
    },
  }
}

test('checkout persists the exact quote returned to the customer',async()=>{
  const h=setup();const r=await h.checkout()
  assert.equal(r.http,200)
  const saved=h.rows.training_orders.find(o=>o.order_no==='QA-CHECKOUT').metadata.paypal_quotes['1']
  assert.equal(r.body.paypalQuote.currency,saved.currency)
  assert.equal(r.body.paypalQuote.amount,saved.amount)
  assert.equal(r.body.paypalQuote.krwAmount,100000)
  assert.equal(h.calls.length,0)
})

test('create uses saved USD 75 despite KRW override and changed current FX', async()=>{
  const h=setup();const r=await h.run('create-order')
  assert.equal(r.http,200);assert.equal(r.body.currency,'USD');assert.equal(r.body.chargedAmount,75)
  const creates=h.calls.filter(c=>c.url.endsWith('/v2/checkout/orders')&&c.method==='POST')
  assert.equal(creates.length,1)
  assert.deepEqual(JSON.parse(creates[0].body).purchase_units[0].amount,{currency_code:'USD',value:'75.00'})
})
test('legacy checkout without a quote requests refresh before any PG request',async()=>{
  const h=setup({metadata:{}});const r=await h.run('create-order')
  assert.equal(r.body.code,'CHECKOUT_REFRESH_REQUIRED');assert.equal(h.calls.length,0)
})
for(const [currency,value] of [['KRW','75.00'],['EUR','75.00'],['USD','74.99'],['USD','75.01']]) {
  test(`capture blocks mismatched ${currency} ${value} before moving money`,async()=>{
    const h=setup({lookup:providerOrder({currency,value})});const r=await h.run()
    assert.equal(r.body.code,'PAYMENT_AMOUNT_MISMATCH')
    assert(!h.calls.some(c=>c.url.endsWith('/capture')));assert.equal(h.receipts,0)
  })
}
test('capture is idempotent and completes the frozen amount',async()=>{
  const h=setup();const r=await h.run()
  assert.equal(r.body.success,true)
  assert.equal(h.calls.find(c=>c.url.endsWith('/capture')).headers['PayPal-Request-Id'],'11111111-1111-4111-8111-111111111111')
  assert.equal(h.rows.training_order_payments[0].status,'paid');assert.equal(h.receipts,1)
})
test('already completed provider order is finalized without another capture',async()=>{
  const h=setup({lookup:providerOrder({status:'COMPLETED'})});const r=await h.run()
  assert(r.body.success);assert(!h.calls.some(c=>c.url.endsWith('/capture')))
})
test('lost capture response is recovered from PG without a false failure',async()=>{
  const h=setup({timeout:true,after:providerOrder({status:'COMPLETED'})});const r=await h.run()
  assert(r.body.success);assert.equal(h.calls.filter(c=>c.url.endsWith('/capture')).length,1)
})
test('unknown capture result stays pending, without failure mail or paid mutation',async()=>{
  const h=setup({timeout:true});const r=await h.run()
  assert.equal(r.body.state,'waiting');assert.equal(h.rows.training_order_payments[0].status,'pending');assert.equal(h.receipts,0)
})
test('pending provider capture is not falsely finalized',async()=>{
  const h=setup({capture:providerOrder({status:'COMPLETED',captureStatus:'PENDING'})});const r=await h.run()
  assert.equal(r.body.state,'waiting');assert.equal(h.receipts,0)
})
test('already-captured response with unavailable confirmation never becomes failed',async()=>{
  const h=setup({capture:{details:[{issue:'ORDER_ALREADY_CAPTURED'}]},captureHttp:422});const r=await h.run()
  assert.equal(r.body.state,'waiting');assert.equal(h.rows.training_order_payments[0].status,'pending');assert.equal(h.receipts,0)
})
test('bank decline remains recoverable so the buyer can choose another method',async()=>{
  const h=setup({capture:{details:[{issue:'INSTRUMENT_DECLINED'}]},captureHttp:422});const r=await h.run()
  assert.equal(r.body.recoverable,true);assert.equal(h.rows.training_order_payments[0].status,'failed')
})
test('provider order cannot be attached to another local payment',async()=>{
  const h=setup({payment:{provider_order_id:'OTHER'}});const r=await h.run()
  assert.equal(r.http,400);assert.equal(h.calls.length,0)
})
