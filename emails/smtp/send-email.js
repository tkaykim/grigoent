const nodemailer = require('nodemailer');

// ===== Safety Guard =====
// Production emails require explicit CEO approval via EMAIL_SAFE_MODE=APPROVED_BY_CEO
const SAFE_MODE = process.env.EMAIL_SAFE_MODE !== 'APPROVED_BY_CEO';
const TEST_RECIPIENT = process.env.TEST_RECIPIENT || 'tommy0621@naver.com';

/**
 * Replaces {{key}} placeholders in template with actual values
 */
function renderTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (html, [key, val]) => html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || ''),
    template
  );
}

// ===== Welcome Email HTML Template =====
const WELCOME_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Noto Sans KR',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">
        <!-- Header -->
        <tr><td style="padding:48px 40px 32px;border-bottom:1px solid #e0e0e0;">
          <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111;">GRIGO ENT.</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.8;">안녕하세요, {{name}}님.</p>
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.8;">그리고 엔터테인먼트에 지원해 주셔서 감사합니다.<br>제출하신 프로필 검토가 완료되었습니다.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.8;">저희는 소속 아티스트들의 활동을 <strong>DancersBio</strong> 플랫폼을 통해 체계적으로 관리하고 있습니다.</p>
          <!-- Feature List -->
          <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin:0 0 32px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:500;color:#111;">DancersBio에서 하실 수 있습니다:</p>
            <p style="margin:4px 0;font-size:14px;color:#555;">• 나만의 댄서 프로필 페이지 관리</p>
            <p style="margin:4px 0;font-size:14px;color:#555;">• 새로운 프로젝트 소식 실시간 수신</p>
            <p style="margin:4px 0;font-size:14px;color:#555;">• 오디션·공연·광고 등 다양한 기회 연결</p>
          </div>
          <!-- CTA Button -->
          <div style="text-align:center;margin:0 0 32px;">
            <a href="{{cta_url}}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:16px 40px;font-size:15px;font-weight:500;letter-spacing:0.5px;border-radius:4px;">DancersBio 둘러보기 →</a>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #e0e0e0;background:#fafafa;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111;letter-spacing:1px;">그리고 엔터테인먼트</p>
          <p style="margin:0 0 4px;font-size:12px;color:#999;">서울 마포구 성지3길 55 | grigoent.com</p>
          <p style="margin:16px 0 0;font-size:11px;color:#bbb;">이 메일은 그리고 엔터테인먼트 지원자분들께 발송됩니다.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ===== Project Notification Email HTML Template =====
const PROJECT_NOTIFY_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Noto Sans KR',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">
        <!-- Header -->
        <tr><td style="padding:48px 40px 32px;border-bottom:1px solid #e0e0e0;">
          <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111;">GRIGO ENT.</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.8;">안녕하세요, {{name}}님.<br>새로운 프로젝트 소식을 전해드립니다.</p>
          <!-- Project Card -->
          <div style="border:1px solid #e0e0e0;padding:28px;margin:0 0 32px;">
            <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#111;">{{project_title}}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:12px;font-weight:500;color:#999;letter-spacing:1px;">일정</span></td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="font-size:14px;color:#333;">{{project_date}}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:12px;font-weight:500;color:#999;letter-spacing:1px;">장소</span></td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="font-size:14px;color:#333;">{{project_location}}</span></td></tr>
              <tr><td style="padding:6px 0;"><span style="font-size:12px;font-weight:500;color:#999;letter-spacing:1px;">모집</span></td><td style="padding:6px 0;text-align:right;"><span style="font-size:14px;color:#333;">{{positions}}</span></td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:14px;color:#555;line-height:1.7;">{{project_description}}</p>
          </div>
          <!-- CTA Button -->
          <div style="text-align:center;margin:0 0 32px;">
            <a href="{{cta_url}}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:16px 40px;font-size:15px;font-weight:500;letter-spacing:0.5px;border-radius:4px;">DancersBio에서 자세히 보기 →</a>
          </div>
          <p style="margin:0;font-size:14px;color:#666;line-height:1.8;text-align:center;">이 외에도 다양한 프로젝트가 DancersBio에 등록되어 있습니다.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #e0e0e0;background:#fafafa;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111;letter-spacing:1px;">그리고 엔터테인먼트</p>
          <p style="margin:0 0 4px;font-size:12px;color:#999;">서울 마포구 성지3길 55 | grigoent.com</p>
          <p style="margin:16px 0 0;font-size:11px;color:#bbb;">이 메일은 그리고 엔터테인먼트 지원자분들께 발송됩니다.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * Sends email via SMTP (Nodemailer)
 * @param {Object} options
 * @param {'welcome'|'project'} options.type - Email type
 * @param {string} options.to - Recipient email address
 * @param {Object} options.data - Template variables
 * @returns {Promise<Object>} Nodemailer send result
 */
async function sendEmail({ type, to, data }) {
  // Safety guard: redirect to test recipient in safe mode
  const recipient = SAFE_MODE ? TEST_RECIPIENT : to;
  if (SAFE_MODE) {
    console.log(`[SAFE MODE] Actual recipient (${to}) redirected to test email (${recipient})`);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  });

  let subject, html;
  const cta_url = process.env.DANCERSBIO_URL || 'https://dancers-bio.vercel.app';

  if (type === 'welcome') {
    subject = '[그리고 엔터테인먼트] 프로필 검토가 완료되었습니다';
    html = renderTemplate(WELCOME_TEMPLATE, { ...data, cta_url });
  } else if (type === 'project') {
    subject = '[그리고 엔터테인먼트] 새로운 프로젝트 소식이 있습니다';
    html = renderTemplate(PROJECT_NOTIFY_TEMPLATE, { ...data, cta_url });
  } else {
    throw new Error(`Unknown email type: ${type}`);
  }

  const result = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || '그리고 엔터테인먼트'}" <${process.env.EMAIL_SMTP_USER}>`,
    to: recipient,
    subject,
    html,
  });

  console.log('Email sent successfully:', result.messageId);
  return result;
}

module.exports = { sendEmail, renderTemplate, WELCOME_TEMPLATE, PROJECT_NOTIFY_TEMPLATE };
