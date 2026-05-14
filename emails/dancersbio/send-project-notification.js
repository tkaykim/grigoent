/**
 * DancersBio Project Notification Email Sender
 * Sends project notification emails to dancers when new projects are available
 *
 * Usage:
 *   const { sendProjectNotification } = require('./emails/dancersbio/send-project-notification');
 *   await sendProjectNotification(
 *     { email: 'dancer@example.com', name: 'Kim' },
 *     { projectName: 'MV 촬영', description: '...', deadline: '2024-12-31', projectUrl: 'https://...' }
 *   );
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
 * Loads and returns the project-notification HTML template
 */
function loadProjectTemplate() {
  const templatePath = path.join(__dirname, '../templates/project-notification.html');
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
 * Sends project notification email via SMTP (Nodemailer)
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
    from: `"${process.env.EMAIL_FROM_NAME || 'DancersBio'}" <${process.env.EMAIL_SMTP_USER}>`,
    to: recipient,
    subject,
    html,
  });

  console.log('[SMTP] Email sent:', result.messageId);
  return { success: true, messageId: result.messageId, method: 'smtp' };
}

/**
 * Sends project notification email via Google Apps Script Web App
 */
async function sendViaAppScript(recipient, data) {
  if (!APPSCRIPT_WEBHOOK_URL) {
    throw new Error('APPSCRIPT_WEBHOOK_URL environment variable is not set');
  }

  const res = await fetch(APPSCRIPT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'project-notification',
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
 * Sends project notification email to a dancer
 *
 * @param {Object} recipient - Recipient info
 * @param {string} recipient.email - Recipient email address
 * @param {string} recipient.name - Recipient name
 *
 * @param {Object} project - Project info
 * @param {string} project.projectName - Project title
 * @param {string} project.description - Project description
 * @param {string} project.deadline - Application deadline (e.g., "2024년 12월 31일")
 * @param {string} [project.projectUrl] - Direct link to the project page
 *
 * @returns {Promise<Object>} Send result with success status, recipient, and method used
 *
 * @example
 * await sendProjectNotification(
 *   { email: 'dancer@example.com', name: '홍길동' },
 *   {
 *     projectName: '2024 Summer MV 촬영',
 *     description: '인기 아이돌 그룹의 신곡 뮤직비디오 백댄서 모집',
 *     deadline: '2024년 8월 15일',
 *     projectUrl: 'https://dancers-bio.vercel.app/projects/abc123'
 *   }
 * );
 */
async function sendProjectNotification(recipient, project) {
  // Validate required params
  if (!recipient?.email) throw new Error('recipient.email is required');
  if (!recipient?.name) throw new Error('recipient.name is required');
  if (!project?.projectName) throw new Error('project.projectName is required');

  // Safety guard: redirect to test recipient in safe mode
  const finalRecipient = SAFE_MODE ? TEST_RECIPIENT : recipient.email;
  if (SAFE_MODE) {
    console.log(`[SAFE MODE] Actual recipient (${recipient.email}) redirected to test email (${finalRecipient})`);
  }

  // Build project URL if not provided
  const finalProjectUrl = project.projectUrl || DANCERSBIO_URL;

  const templateVars = {
    name: recipient.name,
    project_name: project.projectName,
    description: project.description || '',
    deadline: project.deadline || '추후 공지',
    project_url: finalProjectUrl,
  };

  const subject = `[DancersBio] 새 프로젝트: ${project.projectName}`;

  if (EMAIL_MODE === 'smtp') {
    const template = loadProjectTemplate();
    const html = renderTemplate(template, templateVars);
    return await sendViaSMTP(finalRecipient, html, subject);
  } else {
    // AppScript mode (default)
    return await sendViaAppScript(finalRecipient, templateVars);
  }
}

/**
 * Returns current email configuration summary
 */
function getConfigSummary() {
  return {
    mode: EMAIL_MODE,
    safeMode: SAFE_MODE,
    testRecipient: TEST_RECIPIENT,
    smtpConfigured: !!(process.env.EMAIL_SMTP_USER && process.env.EMAIL_SMTP_PASS),
    appScriptConfigured: !!APPSCRIPT_WEBHOOK_URL,
    dancersBioUrl: DANCERSBIO_URL,
  };
}

module.exports = {
  sendProjectNotification,
  getConfigSummary,
  // Export for testing
  loadProjectTemplate,
  renderTemplate,
};
