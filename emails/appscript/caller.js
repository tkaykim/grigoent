/**
 * AppScript Email Caller
 * Node.js client for calling the Google Apps Script Web App
 */

const APPSCRIPT_WEBHOOK_URL = process.env.APPSCRIPT_WEBHOOK_URL;

// Safety guard
const SAFE_MODE = process.env.EMAIL_SAFE_MODE !== 'APPROVED_BY_CEO';
const TEST_RECIPIENT = process.env.TEST_RECIPIENT || 'tommy0621@naver.com';

/**
 * Sends email via Google Apps Script Web App
 * @param {Object} options
 * @param {'welcome'|'project'} options.type - Email type
 * @param {string} options.to - Recipient email address
 * @param {Object} options.data - Template variables
 * @returns {Promise<Object>} Response from AppScript
 */
async function sendEmailViaAppScript({ type, to, data }) {
  if (!APPSCRIPT_WEBHOOK_URL) {
    throw new Error('APPSCRIPT_WEBHOOK_URL environment variable is not set');
  }

  // Safety guard: redirect to test recipient in safe mode
  const recipient = SAFE_MODE ? TEST_RECIPIENT : to;
  if (SAFE_MODE) {
    console.log(`[SAFE MODE] Actual recipient (${to}) redirected to test email (${recipient})`);
  }

  const res = await fetch(APPSCRIPT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, to: recipient, data }),
  });

  if (!res.ok) {
    throw new Error(`AppScript request failed: ${res.status} ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.ok) {
    throw new Error(`AppScript error: ${result.error}`);
  }

  console.log('Email sent via AppScript:', result);
  return result;
}

/**
 * Checks if AppScript webhook is configured
 */
function isAppScriptConfigured() {
  return !!APPSCRIPT_WEBHOOK_URL;
}

module.exports = { sendEmailViaAppScript, isAppScriptConfigured };
