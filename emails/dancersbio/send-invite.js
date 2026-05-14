/**
 * DancersBio Invite Email Sender
 * Sends onboarding/welcome emails to dancers when their profile is registered on DancersBio
 *
 * Usage:
 *   const { sendDancersBioInvite } = require('./emails/dancersbio/send-invite');
 *   await sendDancersBioInvite({ email: 'dancer@example.com', name: 'Kim', profileUrl: 'https://...' });
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// ===== Safety Guard =====
// Production emails require explicit CEO approval via EMAIL_SAFE_MODE=APPROVED_BY_CEO
const SAFE_MODE = process.env.EMAIL_SAFE_MODE !== 'APPROVED_BY_CEO';
const TEST_RECIPIENT = process.env.TEST_RECIPIENT || 'tommy0621@naver.com';

// ===== Email Configuration =====
const EMAIL_MODE = process.env.EMAIL_MODE || 'appscript'; // 'appscript' | 'smtp'
const APPSCRIPT_WEBHOOK_URL = process.env.APPSCRIPT_WEBHOOK_URL;
const DANCERSBIO_URL = process.env.DANCERSBIO_URL || 'https://dancers-bio.vercel.app';

/**
 * Loads and returns the dancersbio-invite HTML template
 */
function loadInviteTemplate() {
  const templatePath = path.join(__dirname, '../templates/dancersbio-invite.html');
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Replaces {{key}} placeholders in template with actual values
 */
function renderTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (html, [key, val]) => html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || ''),
    template
  );
}

/**
 * Sends DancersBio invite email via SMTP (Nodemailer)
 */
async function sendViaSMTP(recipient, html, subject) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  });

  const result = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || '그리고 엔터테인먼트'}" <${process.env.EMAIL_SMTP_USER}>`,
    to: recipient,
    subject,
    html,
  });

  console.log('[SMTP] Email sent:', result.messageId);
  return { success: true, messageId: result.messageId, method: 'smtp' };
}

/**
 * Sends DancersBio invite email via Google Apps Script Web App
 */
async function sendViaAppScript(recipient, data) {
  if (!APPSCRIPT_WEBHOOK_URL) {
    throw new Error('APPSCRIPT_WEBHOOK_URL environment variable is not set');
  }

  const res = await fetch(APPSCRIPT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dancersbio-invite',
      to: recipient,
      data,
    }),
  });

  if (!res.ok) {
    throw new Error(`AppScript request failed: ${res.status} ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.ok) {
    throw new Error(`AppScript error: ${result.error}`);
  }

  console.log('[AppScript] Email sent:', result);
  return { success: true, recipient: result.recipient, method: 'appscript' };
}

/**
 * Sends DancersBio invite email to a dancer
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.name - Recipient name (displayed as "안녕하세요, {name}님")
 * @param {string} [options.profileUrl] - Direct link to the dancer's DancersBio profile
 * @returns {Promise<Object>} Send result with success status, recipient, and method used
 *
 * @example
 * await sendDancersBioInvite({
 *   email: 'dancer@example.com',
 *   name: '홍길동',
 *   profileUrl: 'https://dancers-bio.vercel.app/dancers/abc123'
 * });
 */
async function sendDancersBioInvite({ email, name, profileUrl }) {
  // Validate required params
  if (!email) throw new Error('email is required');
  if (!name) throw new Error('name is required');

  // Safety guard: redirect to test recipient in safe mode
  const recipient = SAFE_MODE ? TEST_RECIPIENT : email;
  if (SAFE_MODE) {
    console.log(`[SAFE MODE] Actual recipient (${email}) redirected to test email (${recipient})`);
  }

  // Build profile URL if not provided
  const finalProfileUrl = profileUrl || DANCERSBIO_URL;

  const templateVars = {
    name,
    profile_url: finalProfileUrl,
  };

  const subject = '[그리고 엔터테인먼트] DancersBio 프로필이 등록되었습니다';

  if (EMAIL_MODE === 'smtp') {
    const template = loadInviteTemplate();
    const html = renderTemplate(template, templateVars);
    return await sendViaSMTP(recipient, html, subject);
  } else {
    // AppScript mode (default)
    return await sendViaAppScript(recipient, templateVars);
  }
}

/**
 * Checks if SMTP mode is properly configured
 */
function isSMTPConfigured() {
  return !!(process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS);
}

/**
 * Checks if AppScript mode is properly configured
 */
function isAppScriptConfigured() {
  return !!APPSCRIPT_WEBHOOK_URL;
}

/**
 * Returns current email configuration summary
 */
function getConfigSummary() {
  return {
    mode: EMAIL_MODE,
    safeMode: SAFE_MODE,
    testRecipient: TEST_RECIPIENT,
    smtpConfigured: isSMTPConfigured(),
    appScriptConfigured: isAppScriptConfigured(),
    dancersBioUrl: DANCERSBIO_URL,
  };
}

module.exports = {
  sendDancersBioInvite,
  isSMTPConfigured,
  isAppScriptConfigured,
  getConfigSummary,
  // Export for testing
  loadInviteTemplate,
  renderTemplate,
};
