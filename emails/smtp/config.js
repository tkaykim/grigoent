/**
 * SMTP Configuration Helper
 * Validates and provides SMTP settings from environment variables
 */

const REQUIRED_ENV_VARS = [
  'EMAIL_SMTP_USER',
  'EMAIL_SMTP_PASS',
];

const OPTIONAL_ENV_VARS = {
  EMAIL_SMTP_HOST: 'smtp.gmail.com',
  EMAIL_SMTP_PORT: '587',
  EMAIL_FROM_NAME: '그리고 엔터테인먼트',
  DANCERSBIO_URL: 'https://dancers-bio.vercel.app',
  TEST_RECIPIENT: 'tommy0621@naver.com',
  EMAIL_SAFE_MODE: '', // Empty = safe mode ON
};

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
function validateConfig() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Returns the current SMTP configuration (with sensitive data masked)
 */
function getConfigSummary() {
  return {
    host: process.env.EMAIL_SMTP_HOST || OPTIONAL_ENV_VARS.EMAIL_SMTP_HOST,
    port: process.env.EMAIL_SMTP_PORT || OPTIONAL_ENV_VARS.EMAIL_SMTP_PORT,
    user: process.env.EMAIL_SMTP_USER ? `${process.env.EMAIL_SMTP_USER.slice(0, 3)}***` : 'NOT SET',
    passConfigured: !!process.env.EMAIL_SMTP_PASS,
    fromName: process.env.EMAIL_FROM_NAME || OPTIONAL_ENV_VARS.EMAIL_FROM_NAME,
    dancersBioUrl: process.env.DANCERSBIO_URL || OPTIONAL_ENV_VARS.DANCERSBIO_URL,
    testRecipient: process.env.TEST_RECIPIENT || OPTIONAL_ENV_VARS.TEST_RECIPIENT,
    safeMode: process.env.EMAIL_SAFE_MODE !== 'APPROVED_BY_CEO',
  };
}

/**
 * Checks if production mode is enabled (CEO approved)
 */
function isProductionMode() {
  return process.env.EMAIL_SAFE_MODE === 'APPROVED_BY_CEO';
}

module.exports = {
  validateConfig,
  getConfigSummary,
  isProductionMode,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
};
