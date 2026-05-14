/**
 * Grigoent Email Sender - Google Apps Script (Extended)
 * Deploy as Web App: POST /exec { type, to, data }
 *
 * Supports:
 * - welcome: 기존 웰컴 메일 (Grigoent 브랜딩)
 * - project: 기존 프로젝트 알림 (Grigoent 브랜딩)
 * - dancersbio-invite: DancersBio 온보딩 메일 (새 디자인)
 * - project-notification: DancersBio 프로젝트 알림 (새 디자인)
 *
 * Script Properties (set in Project Settings > Script Properties):
 * - SAFE_MODE: leave empty or set to "APPROVED_BY_CEO" for production
 * - TEST_RECIPIENT: test email address (default: tommy0621@naver.com)
 * - DANCERSBIO_URL: DancersBio platform URL
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var type = payload.type;
    var to = payload.to;
    var data = payload.data;

    // Safety guard
    var props = PropertiesService.getScriptProperties();
    var SAFE_MODE = props.getProperty('SAFE_MODE') !== 'APPROVED_BY_CEO';
    var TEST_RECIPIENT = props.getProperty('TEST_RECIPIENT') || 'tommy0621@naver.com';
    var recipient = SAFE_MODE ? TEST_RECIPIENT : to;

    if (SAFE_MODE) {
      console.log('[SAFE MODE] ' + to + ' -> ' + recipient);
    }

    var cta_url = props.getProperty('DANCERSBIO_URL') || 'https://dancers-bio.vercel.app';

    var subject, htmlBody;

    switch (type) {
      case 'welcome':
        subject = '[그리고 엔터테인먼트] 프로필 검토가 완료되었습니다';
        htmlBody = buildWelcomeHtml({ ...data, cta_url: cta_url });
        break;

      case 'project':
        subject = '[그리고 엔터테인먼트] 새로운 프로젝트 소식이 있습니다';
        htmlBody = buildProjectNotifyHtml({ ...data, cta_url: cta_url });
        break;

      case 'dancersbio-invite':
        subject = '[그리고 엔터테인먼트] DancersBio 프로필이 등록되었습니다';
        htmlBody = buildDancersBioInviteHtml(data);
        break;

      case 'project-notification':
        subject = '[DancersBio] 새 프로젝트: ' + (data.project_name || '새 프로젝트');
        htmlBody = buildProjectNotificationHtml(data);
        break;

      default:
        throw new Error('Unknown type: ' + type);
    }

    GmailApp.sendEmail(recipient, subject, '', { htmlBody: htmlBody });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, recipient: recipient }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('Email send error:', err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test endpoint (GET request for manual testing)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'Grigoent Email Service is running',
    supportedTypes: ['welcome', 'project', 'dancersbio-invite', 'project-notification'],
    usage: 'POST { type: "...", to: "email", data: {...} }'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Replace {{key}} placeholders with values
 */
function renderTemplate(template, vars) {
  var result = template;
  for (var key in vars) {
    if (vars.hasOwnProperty(key)) {
      result = result.split('{{' + key + '}}').join(vars[key] || '');
    }
  }
  return result;
}

// ============================================================
// EXISTING TEMPLATES (Grigoent branding)
// ============================================================

/**
 * Welcome Email HTML Template (existing)
 */
function buildWelcomeHtml(vars) {
  var template = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">' +
'</head>' +
'<body style="margin:0;padding:0;background:#f9f9f9;font-family:\'Noto Sans KR\',sans-serif;">' +
'  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;">' +
'    <tr><td align="center" style="padding:40px 16px;">' +
'      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">' +
'        <tr><td style="padding:48px 40px 32px;border-bottom:1px solid #e0e0e0;">' +
'          <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111;">GRIGO ENT.</div>' +
'        </td></tr>' +
'        <tr><td style="padding:40px 40px 32px;">' +
'          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.8;">안녕하세요, {{name}}님.</p>' +
'          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.8;">그리고 엔터테인먼트에 지원해 주셔서 감사합니다.<br>제출하신 프로필 검토가 완료되었습니다.</p>' +
'          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.8;">저희는 소속 아티스트들의 활동을 <strong>DancersBio</strong> 플랫폼을 통해 체계적으로 관리하고 있습니다.</p>' +
'          <div style="background:#fafafa;border:1px solid #e8e8e8;padding:24px;margin:0 0 32px;">' +
'            <p style="margin:0 0 12px;font-size:14px;font-weight:500;color:#111;">DancersBio에서 하실 수 있습니다:</p>' +
'            <p style="margin:4px 0;font-size:14px;color:#555;">• 나만의 댄서 프로필 페이지 관리</p>' +
'            <p style="margin:4px 0;font-size:14px;color:#555;">• 새로운 프로젝트 소식 실시간 수신</p>' +
'            <p style="margin:4px 0;font-size:14px;color:#555;">• 오디션·공연·광고 등 다양한 기회 연결</p>' +
'          </div>' +
'          <div style="text-align:center;margin:0 0 32px;">' +
'            <a href="{{cta_url}}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:16px 40px;font-size:15px;font-weight:500;letter-spacing:0.5px;border-radius:4px;">DancersBio 둘러보기 →</a>' +
'          </div>' +
'        </td></tr>' +
'        <tr><td style="padding:24px 40px;border-top:1px solid #e0e0e0;background:#fafafa;">' +
'          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111;letter-spacing:1px;">그리고 엔터테인먼트</p>' +
'          <p style="margin:0 0 4px;font-size:12px;color:#999;">서울 마포구 성지3길 55 | grigoent.com</p>' +
'          <p style="margin:16px 0 0;font-size:11px;color:#bbb;">이 메일은 그리고 엔터테인먼트 지원자분들께 발송됩니다.</p>' +
'        </td></tr>' +
'      </table>' +
'    </td></tr>' +
'  </table>' +
'</body>' +
'</html>';

  return renderTemplate(template, vars);
}

/**
 * Project Notification Email HTML Template (existing)
 */
function buildProjectNotifyHtml(vars) {
  var template = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">' +
'</head>' +
'<body style="margin:0;padding:0;background:#f9f9f9;font-family:\'Noto Sans KR\',sans-serif;">' +
'  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;">' +
'    <tr><td align="center" style="padding:40px 16px;">' +
'      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">' +
'        <tr><td style="padding:48px 40px 32px;border-bottom:1px solid #e0e0e0;">' +
'          <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111;">GRIGO ENT.</div>' +
'        </td></tr>' +
'        <tr><td style="padding:40px 40px 32px;">' +
'          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.8;">안녕하세요, {{name}}님.<br>새로운 프로젝트 소식을 전해드립니다.</p>' +
'          <div style="border:1px solid #e0e0e0;padding:28px;margin:0 0 32px;">' +
'            <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#111;">{{project_title}}</p>' +
'            <table width="100%" cellpadding="0" cellspacing="0">' +
'              <tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:12px;font-weight:500;color:#999;letter-spacing:1px;">일정</span></td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="font-size:14px;color:#333;">{{project_date}}</span></td></tr>' +
'              <tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;"><span style="font-size:12px;font-weight:500;color:#999;letter-spacing:1px;">장소</span></td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="font-size:14px;color:#333;">{{project_location}}</span></td></tr>' +
'              <tr><td style="padding:6px 0;"><span style="font-size:12px;font-weight:500;color:#999;letter-spacing:1px;">모집</span></td><td style="padding:6px 0;text-align:right;"><span style="font-size:14px;color:#333;">{{positions}}</span></td></tr>' +
'            </table>' +
'            <p style="margin:20px 0 0;font-size:14px;color:#555;line-height:1.7;">{{project_description}}</p>' +
'          </div>' +
'          <div style="text-align:center;margin:0 0 32px;">' +
'            <a href="{{cta_url}}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:16px 40px;font-size:15px;font-weight:500;letter-spacing:0.5px;border-radius:4px;">DancersBio에서 자세히 보기 →</a>' +
'          </div>' +
'          <p style="margin:0;font-size:14px;color:#666;line-height:1.8;text-align:center;">이 외에도 다양한 프로젝트가 DancersBio에 등록되어 있습니다.</p>' +
'        </td></tr>' +
'        <tr><td style="padding:24px 40px;border-top:1px solid #e0e0e0;background:#fafafa;">' +
'          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111;letter-spacing:1px;">그리고 엔터테인먼트</p>' +
'          <p style="margin:0 0 4px;font-size:12px;color:#999;">서울 마포구 성지3길 55 | grigoent.com</p>' +
'          <p style="margin:16px 0 0;font-size:11px;color:#bbb;">이 메일은 그리고 엔터테인먼트 지원자분들께 발송됩니다.</p>' +
'        </td></tr>' +
'      </table>' +
'    </td></tr>' +
'  </table>' +
'</body>' +
'</html>';

  return renderTemplate(template, vars);
}

// ============================================================
// NEW TEMPLATES (DancersBio branding - designer's new design)
// ============================================================

/**
 * DancersBio Invite Email HTML Template (new design)
 */
function buildDancersBioInviteHtml(vars) {
  var template = '<!DOCTYPE html>' +
'<html lang="ko">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <meta http-equiv="X-UA-Compatible" content="IE=edge">' +
'  <title>DancersBio 프로필 등록 안내</title>' +
'</head>' +
'<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif;">' +
'  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;">' +
'    <tr>' +
'      <td align="center" style="padding:40px 20px;">' +
'        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
'          <tr>' +
'            <td style="padding:48px 40px 32px 40px;text-align:center;border-bottom:1px solid #e0e0e0;">' +
'              <h1 style="margin:0;font-size:24px;font-weight:700;color:#000000;letter-spacing:-0.5px;">GRIGO ENT.</h1>' +
'            </td>' +
'          </tr>' +
'          <tr>' +
'            <td style="padding:40px 40px 32px 40px;">' +
'              <p style="margin:0 0 24px 0;font-size:18px;font-weight:600;color:#000000;line-height:1.5;">' +
'                안녕하세요, {{name}}님.<br>그리고 엔터테인먼트입니다.' +
'              </p>' +
'              <p style="margin:0 0 32px 0;font-size:15px;color:#424242;line-height:1.7;">' +
'                지원해 주신 프로필을 저희 파트너 플랫폼 <strong style="color:#000000;">DancersBio</strong>에 등록해 드렸습니다.' +
'              </p>' +
'              <p style="margin:0 0 40px 0;font-size:15px;color:#424242;line-height:1.7;">' +
'                댄서 커뮤니티에서 더 많은 기회를 만나보세요.' +
'              </p>' +
'              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
'                <tr>' +
'                  <td align="center">' +
'                    <a href="{{profile_url}}" style="display:inline-block;padding:16px 48px;background-color:#000000;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:4px;letter-spacing:-0.3px;">내 프로필 확인하기</a>' +
'                  </td>' +
'                </tr>' +
'              </table>' +
'            </td>' +
'          </tr>' +
'          <tr>' +
'            <td style="padding:32px 40px;background-color:#fafafa;border-top:1px solid #e0e0e0;">' +
'              <p style="margin:0 0 12px 0;font-size:13px;color:#757575;line-height:1.6;text-align:center;">' +
'                © 그리고 엔터테인먼트' +
'              </p>' +
'              <p style="margin:0;font-size:13px;color:#757575;line-height:1.6;text-align:center;">' +
'                <a href="#" style="color:#757575;text-decoration:underline;">수신거부</a>' +
'              </p>' +
'            </td>' +
'          </tr>' +
'        </table>' +
'      </td>' +
'    </tr>' +
'  </table>' +
'</body>' +
'</html>';

  return renderTemplate(template, vars);
}

/**
 * DancersBio Project Notification Email HTML Template (new design)
 */
function buildProjectNotificationHtml(vars) {
  var template = '<!DOCTYPE html>' +
'<html lang="ko">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <meta http-equiv="X-UA-Compatible" content="IE=edge">' +
'  <title>새 프로젝트 모집 알림</title>' +
'</head>' +
'<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif;">' +
'  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;">' +
'    <tr>' +
'      <td align="center" style="padding:40px 20px;">' +
'        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
'          <tr>' +
'            <td style="padding:48px 40px 32px 40px;text-align:center;border-bottom:1px solid #e0e0e0;">' +
'              <h1 style="margin:0;font-size:24px;font-weight:700;color:#000000;letter-spacing:-0.5px;">DancersBio</h1>' +
'            </td>' +
'          </tr>' +
'          <tr>' +
'            <td style="padding:40px 40px 32px 40px;">' +
'              <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#000000;line-height:1.5;">' +
'                안녕하세요, {{name}}님.' +
'              </p>' +
'              <p style="margin:0 0 40px 0;font-size:15px;color:#424242;line-height:1.7;">' +
'                새로운 프로젝트 모집이 시작되었습니다.' +
'              </p>' +
'              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;border:1px solid #e0e0e0;border-radius:4px;">' +
'                <tr>' +
'                  <td style="padding:32px 28px;">' +
'                    <h2 style="margin:0 0 16px 0;font-size:17px;font-weight:700;color:#000000;line-height:1.4;">{{project_name}}</h2>' +
'                    <p style="margin:0 0 20px 0;font-size:14px;color:#424242;line-height:1.6;">{{description}}</p>' +
'                    <p style="margin:0;font-size:13px;color:#757575;line-height:1.5;">' +
'                      <strong style="color:#000000;">마감일</strong> {{deadline}}' +
'                    </p>' +
'                  </td>' +
'                </tr>' +
'              </table>' +
'              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
'                <tr>' +
'                  <td align="center">' +
'                    <a href="{{project_url}}" style="display:inline-block;padding:16px 48px;background-color:#000000;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:4px;letter-spacing:-0.3px;">지원하러 가기</a>' +
'                  </td>' +
'                </tr>' +
'              </table>' +
'            </td>' +
'          </tr>' +
'          <tr>' +
'            <td style="padding:32px 40px;background-color:#fafafa;border-top:1px solid #e0e0e0;">' +
'              <p style="margin:0 0 12px 0;font-size:13px;color:#757575;line-height:1.6;text-align:center;">' +
'                © DancersBio' +
'              </p>' +
'              <p style="margin:0;font-size:13px;color:#757575;line-height:1.6;text-align:center;">' +
'                <a href="#" style="color:#757575;text-decoration:underline;">알림 설정</a> | <a href="#" style="color:#757575;text-decoration:underline;">수신거부</a>' +
'              </p>' +
'            </td>' +
'          </tr>' +
'        </table>' +
'      </td>' +
'    </tr>' +
'  </table>' +
'</body>' +
'</html>';

  return renderTemplate(template, vars);
}

// ============================================================
// TEST FUNCTIONS (run from Apps Script editor)
// ============================================================

function testDancersBioInvite() {
  var testPayload = {
    postData: {
      contents: JSON.stringify({
        type: 'dancersbio-invite',
        to: 'test@example.com',
        data: {
          name: '테스트 댄서',
          profile_url: 'https://dancers-bio.vercel.app/dancers/test123'
        }
      })
    }
  };

  var result = doPost(testPayload);
  console.log(result.getContent());
}

function testProjectNotification() {
  var testPayload = {
    postData: {
      contents: JSON.stringify({
        type: 'project-notification',
        to: 'test@example.com',
        data: {
          name: '테스트 댄서',
          project_name: '2024 Summer MV 촬영',
          description: '인기 아이돌 그룹의 신곡 뮤직비디오 백댄서 모집합니다.',
          deadline: '2024년 8월 15일',
          project_url: 'https://dancers-bio.vercel.app/projects/xyz789'
        }
      })
    }
  };

  var result = doPost(testPayload);
  console.log(result.getContent());
}
