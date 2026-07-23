const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.resolve(__dirname, '..')
const BASE_URL = process.env.BASE_URL || 'https://www.grigoent.co.kr'
const SCREENSHOT_DIR = path.join(ROOT, '.gstack', 'qa-reports', 'recruiting-2026-07-23')
const PDF_PATH = path.join(ROOT, 'tmp', 'e2e-live-recruiting-resume.pdf')
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

function writePdf() {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 96>>stream
BT /F1 16 Tf 72 720 Td (GRIGO Recruiting E2E Resume) Tj 0 -28 Td (${new Date().toISOString()}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`
  fs.writeFileSync(PDF_PATH, Buffer.from(content))
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
  writePdf()
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  assert(supabaseUrl && anonKey && serviceKey, 'Supabase env is missing')

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: adminProfile, error: adminProfileError } = await admin
    .from('users')
    .select('id,email,type')
    .eq('type', 'admin')
    .order('email', { ascending: true })
    .limit(1)
    .single()
  if (adminProfileError) throw adminProfileError
  assert(adminProfile?.email, 'Admin email was not found')

  const application = {
    fullName: `채용 E2E 테스트 ${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12)}`,
    email: process.env.RECRUITING_E2E_APPLICANT_EMAIL || adminProfile.email,
    phone: '010-0000-3155',
  }

  const report = {
    baseUrl: BASE_URL,
    clientSubmissionId: null,
    applicationId: null,
    fullName: application.fullName,
    submitStatus: null,
    emailSent: null,
    notificationSent: null,
    dbRowFound: false,
    storageDownloadOk: false,
    adminApiStatus: null,
    adminUiFound: false,
    signedResumeStatus: null,
    consoleErrors: [],
    pageErrors: [],
    screenshots: [],
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
    const page = await publicContext.newPage()
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => report.pageErrors.push(error.message))

    await page.goto(`${BASE_URL}/careers`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: /그리고와 함께/ }).waitFor()

    await page.locator('input[name="full_name"]').fill(application.fullName)
    await page.locator('input[name="position_slugs"][value="management"]').check()
    await page.locator('input[name="position_slugs"][value="planning-event-operations"]').check()
    await page.locator('input[name="email"]').fill(application.email)
    await page.locator('input[name="phone"]').fill(application.phone)
    await page.locator('textarea[name="career_summary"]').fill('실제 E2E 검증용 지원서입니다. 매니지먼트 일정 조율, 섭외 커뮤니케이션, 행사 운영 경험을 테스트 데이터로 기재합니다.')
    await page.locator('textarea[name="motivation"]').fill('채용 폼의 실제 제출, PDF 이력서 업로드, 접수 메일과 운영자 알림 메일 발송 여부를 확인하기 위한 지원 동기입니다.')

    const toolLevels = {
      premiere_pro: 'medium',
      after_effects: 'low',
      davinci_resolve: 'none',
      photoshop: 'high',
      illustrator: 'medium',
      figma: 'medium',
    }
    for (const [tool, level] of Object.entries(toolLevels)) {
      await page.locator(`input[name="tool_${tool}"][value="${level}"]`).check({ force: true })
    }

    const aiToolLevels = {
      gemini: 'used',
      chatgpt: 'proficient',
      claude: 'used',
      codex: 'proficient',
      claude_code: 'used',
      higgsfield: 'heard',
    }
    for (const [tool, level] of Object.entries(aiToolLevels)) {
      await page.locator(`input[name="ai_tool_${tool}"][value="${level}"]`).check({ force: true })
    }

    await page.locator('input[name="other_tools"]').fill('E2E: Notion, Slack')
    await page.locator('input[name="camera_capability"][value="basic"]').check({ force: true })
    await page.locator('input[name="camera_details"]').fill('E2E 기준: 미러리스 카메라 기본 조작 가능')
    await page.locator('input[name="driving_capability"][value="yes"]').check({ force: true })
    await page.locator('textarea[name="foreign_languages"]').fill('영어 이메일 커뮤니케이션 가능')
    await page.locator('input[name="portfolio_url"]').fill('https://www.grigoent.co.kr/careers')
    await page.locator('input[name="resume"]').setInputFiles(PDF_PATH)
    await page.locator('input[name="privacy_consent"]').check()
    await page.locator('input[name="alternative_position_consent"]').check()

    const formPath = path.join(SCREENSHOT_DIR, 'careers-live-form-filled.png')
    await page.locator('header').evaluate((header) => { header.style.display = 'none' })
    await page.locator('#application').screenshot({ path: formPath })
    await page.locator('header').evaluate((header) => { header.style.display = '' })
    report.screenshots.push(formPath)

    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/recruiting-applications') && response.request().method() === 'POST')
    await page.getByRole('button', { name: '지원서 제출' }).click()
    const response = await responsePromise
    report.submitStatus = response.status()
    const submitPayload = await response.json().catch(() => ({}))
    assert(report.submitStatus === 201, `Submit returned ${report.submitStatus}: ${JSON.stringify(submitPayload)}`)
    report.applicationId = submitPayload.id || null
    report.emailSent = submitPayload.emailSent
    report.notificationSent = submitPayload.notificationSent
    assert(submitPayload.emailSent === true, 'Applicant receipt email was not reported as sent')
    assert(submitPayload.notificationSent === true, 'Operator notification email was not reported as sent')

    await page.waitForURL(/\/careers\/success\?/, { timeout: 15000 })
    await page.getByRole('heading', { name: '지원서 제출이 완료되었습니다.' }).waitFor()
    const successPath = path.join(SCREENSHOT_DIR, 'careers-live-success.png')
    await page.screenshot({ path: successPath, fullPage: true })
    report.screenshots.push(successPath)
    await publicContext.close()

    const { data: dbRow, error: dbError } = await admin
      .from('recruiting_applications')
      .select('id,client_submission_id,full_name,email,phone,position_slugs,position_titles,tool_skills,ai_tool_skills,resume_file_path,review_status')
      .eq('id', report.applicationId)
      .single()
    if (dbError) throw dbError
    assert(dbRow?.id === report.applicationId, 'Inserted DB row id does not match API response')
    report.clientSubmissionId = dbRow.client_submission_id
    assert(dbRow.email === application.email, 'Inserted email does not match')
    assert(dbRow.position_slugs?.length === 2, 'Multiple positions were not stored')
    assert(dbRow.ai_tool_skills?.codex === 'proficient', 'AI tool skills were not stored')
    report.dbRowFound = true

    const { data: resumeBytes, error: downloadError } = await admin.storage
      .from('recruiting-resumes')
      .download(dbRow.resume_file_path)
    if (downloadError) throw downloadError
    const resumeBuffer = Buffer.from(await resumeBytes.arrayBuffer())
    assert(resumeBuffer.toString('utf8', 0, 5) === '%PDF-', 'Downloaded resume is not a PDF')
    report.storageDownloadOk = true

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
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
    const adminPage = await adminContext.newPage()
    adminPage.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(`[admin] ${message.text()}`)
    })
    adminPage.on('pageerror', (error) => report.pageErrors.push(`[admin] ${error.message}`))
    await adminPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await adminPage.evaluate(([key, value]) => window.localStorage.setItem(key, value), [STORAGE_KEY, adminStorageValue])
    await adminPage.goto(`${BASE_URL}/admin/recruiting`, { waitUntil: 'networkidle' })
    await adminPage.getByRole('heading', { name: '채용 지원 관리' }).waitFor({ timeout: 20000 })

    const apiResponse = await adminContext.request.get(`${BASE_URL}/api/admin/recruiting-applications?q=${encodeURIComponent(application.fullName)}&limit=5`, {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    })
    report.adminApiStatus = apiResponse.status()
    const apiPayload = await apiResponse.json()
    assert(report.adminApiStatus === 200, `Admin API returned ${report.adminApiStatus}`)
    assert(apiPayload.items?.some((item) => item.id === report.applicationId), 'Admin API did not include the submitted row')

    await adminPage.getByPlaceholder('이름, 이메일, 전화번호 검색').fill(application.fullName)
    await adminPage.getByRole('button', { name: '검색' }).click()
    await adminPage.getByRole('heading', { name: application.fullName }).waitFor({ timeout: 15000 })
    await adminPage.getByRole('heading', { name: application.fullName }).click()
    await adminPage.getByText('AI 툴').waitFor()
    await adminPage.getByText('Codex (코덱스)').waitFor()
    await adminPage.getByText('숙련자이다').first().waitFor()
    await adminPage.getByRole('button', { name: '이력서' }).waitFor()
    report.adminUiFound = true

    const signedResponse = await adminContext.request.get(`${BASE_URL}/api/admin/recruiting-applications/signed-url?path=${encodeURIComponent(dbRow.resume_file_path)}`, {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    })
    assert(signedResponse.status() === 200, `Signed URL API returned ${signedResponse.status()}`)
    const signedPayload = await signedResponse.json()
    const pdfResponse = await adminContext.request.get(signedPayload.url)
    report.signedResumeStatus = pdfResponse.status()
    assert(report.signedResumeStatus === 200, `Signed resume returned ${report.signedResumeStatus}`)
    const signedBody = await pdfResponse.body()
    assert(signedBody.toString('utf8', 0, 5) === '%PDF-', 'Signed resume response is not a PDF')

    const adminPath = path.join(SCREENSHOT_DIR, 'careers-live-admin-row.png')
    await adminPage.screenshot({ path: adminPath, fullPage: true })
    report.screenshots.push(adminPath)
    await adminContext.close()

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
