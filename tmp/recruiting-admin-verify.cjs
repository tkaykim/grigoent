const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.resolve(__dirname, '..')
const BASE_URL = process.env.BASE_URL || 'https://www.grigoent.co.kr'
const APPLICATION_ID = process.env.RECRUITING_E2E_APPLICATION_ID
const SCREENSHOT_DIR = path.join(ROOT, '.gstack', 'qa-reports', 'recruiting-2026-07-23')
const STORAGE_KEY = 'supabase-auth-token'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function loadLocalEnv() {
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

async function createBrowserStorageValue(url, anonKey, session) {
  let storedValue = null
  const storage = {
    getItem() {
      return null
    },
    setItem(key, value) {
      if (key === STORAGE_KEY) storedValue = value
    },
    removeItem() {},
  }
  const client = createClient(url, anonKey, {
    auth: {
      storage,
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) throw error
  if (!storedValue) throw new Error('Supabase session storage was not produced')
  return storedValue
}

async function run() {
  loadLocalEnv()
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  assert(APPLICATION_ID, 'Set RECRUITING_E2E_APPLICATION_ID to verify an existing application')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  assert(supabaseUrl && anonKey && serviceKey, 'Supabase env is missing')

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: dbRow, error: dbError } = await admin
    .from('recruiting_applications')
    .select('id,client_submission_id,full_name,email,phone,position_slugs,position_titles,tool_skills,ai_tool_skills,resume_file_path,review_status')
    .eq('id', APPLICATION_ID)
    .single()
  if (dbError) throw dbError
  assert(dbRow?.id === APPLICATION_ID, 'Application row was not found')
  assert(dbRow.position_slugs?.length >= 1, 'Application positions are missing')
  assert(dbRow.ai_tool_skills?.codex, 'AI tool skills are missing')

  const { data: resumeBytes, error: downloadError } = await admin.storage
    .from('recruiting-resumes')
    .download(dbRow.resume_file_path)
  if (downloadError) throw downloadError
  const resumeBuffer = Buffer.from(await resumeBytes.arrayBuffer())
  assert(resumeBuffer.toString('utf8', 0, 5) === '%PDF-', 'Downloaded resume is not a PDF')

  const { data: adminProfile, error: adminProfileError } = await admin
    .from('users')
    .select('id,email,type')
    .eq('type', 'admin')
    .order('email', { ascending: true })
    .limit(1)
    .single()
  if (adminProfileError) throw adminProfileError
  assert(adminProfile?.email, 'Admin email was not found')

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: adminProfile.email,
  })
  if (linkError) throw linkError
  const tokenHash = linkData?.properties?.hashed_token
  assert(tokenHash, 'Admin magic-link token was not produced')
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })
  if (verifyError) throw verifyError
  assert(sessionData.session?.access_token && sessionData.session?.refresh_token, 'Admin session was not produced')
  const adminStorageValue = await createBrowserStorageValue(supabaseUrl, anonKey, sessionData.session)

  const report = {
    baseUrl: BASE_URL,
    applicationId: APPLICATION_ID,
    clientSubmissionId: dbRow.client_submission_id,
    fullName: dbRow.full_name,
    dbRowFound: true,
    storageDownloadOk: true,
    adminApiStatus: null,
    adminUiFound: false,
    signedResumeStatus: null,
    consoleErrors: [],
    pageErrors: [],
    screenshots: [],
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
    const page = await context.newPage()
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [STORAGE_KEY, adminStorageValue])
    await page.goto(`${BASE_URL}/admin/recruiting`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: '채용 지원 관리' }).waitFor({ timeout: 20000 })

    const apiResponse = await context.request.get(`${BASE_URL}/api/admin/recruiting-applications?q=${encodeURIComponent(dbRow.full_name)}&limit=5`, {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    })
    report.adminApiStatus = apiResponse.status()
    const apiPayload = await apiResponse.json()
    assert(report.adminApiStatus === 200, `Admin API returned ${report.adminApiStatus}`)
    assert(apiPayload.items?.some((item) => item.id === APPLICATION_ID), 'Admin API did not include the submitted row')

    await page.getByPlaceholder('이름, 이메일, 전화번호 검색').fill(dbRow.full_name)
    await page.getByRole('button', { name: '검색' }).click()
    await page.getByRole('heading', { name: dbRow.full_name }).waitFor({ timeout: 15000 })
    await page.getByRole('heading', { name: dbRow.full_name }).click()
    await page.getByText('AI 툴').waitFor()
    await page.getByText('Codex (코덱스)').waitFor()
    await page.getByRole('button', { name: '이력서' }).waitFor()
    report.adminUiFound = true

    const signedResponse = await context.request.get(`${BASE_URL}/api/admin/recruiting-applications/signed-url?path=${encodeURIComponent(dbRow.resume_file_path)}`, {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    })
    assert(signedResponse.status() === 200, `Signed URL API returned ${signedResponse.status()}`)
    const signedPayload = await signedResponse.json()
    const pdfResponse = await context.request.get(signedPayload.url)
    report.signedResumeStatus = pdfResponse.status()
    assert(report.signedResumeStatus === 200, `Signed resume returned ${report.signedResumeStatus}`)
    const signedBody = await pdfResponse.body()
    assert(signedBody.toString('utf8', 0, 5) === '%PDF-', 'Signed resume response is not a PDF')

    const adminPath = path.join(SCREENSHOT_DIR, 'careers-live-admin-row.png')
    await page.screenshot({ path: adminPath, fullPage: true })
    report.screenshots.push(adminPath)
    await context.close()

    assert(report.consoleErrors.length === 0, `Console errors: ${report.consoleErrors.join(' | ')}`)
    assert(report.pageErrors.length === 0, `Page errors: ${report.pageErrors.join(' | ')}`)
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
