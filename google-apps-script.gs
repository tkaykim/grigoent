// Google Apps Script for Contact Form Webhook
// 배포 후 웹 앱 URL을 복사해서 사용하세요

function doPost(e) {
  try {
    // CORS 헤더 설정
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);
    console.log('Received data:', JSON.stringify(data));
    console.log('Data type:', data.type);
    console.log('Required fields check:');
    console.log('- client_name:', !!data.client_name);
    console.log('- client_email:', !!data.client_email);
    console.log('- title:', !!data.title);
    console.log('- description:', !!data.description);
    
    // 문의 유형에 따른 처리
    let subject, body;
    
    if (data.type === 'contact') {
      // Contact 섹션 문의
      if (!data.name || !data.contact || !data.inquiry) {
        console.log('Missing required fields for contact');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      
      subject = `[그리고 엔터테인먼트] 새로운 문의 - ${data.name}`;
      body = `
새로운 문의가 접수되었습니다.

📋 문의 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 이름: ${data.name}
• 연락처: ${data.contact}
• 문의일시: ${new Date().toLocaleString('ko-KR')}

📝 문의 내용
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.inquiry}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이 메일은 grigoent.co.kr 웹사이트를 통해 자동으로 발송되었습니다.
      `.trim();
      
    } else if (data.type === 'artist_proposal') {
      // 아티스트 섭외 제안
      if (!data.client_name || !data.client_email || !data.title || !data.description) {
        console.log('Missing required fields for artist proposal');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      
      subject = `[그리고 엔터테인먼트] 아티스트 섭외 제안 - ${data.client_name}`;
      body = `
새로운 아티스트 섭외 제안이 접수되었습니다.

📋 제안 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 클라이언트: ${data.client_name}
• 이메일: ${data.client_email}
• 전화번호: ${data.client_phone || '미입력'}
• 아티스트: ${data.artist_name}
• 제안일시: ${new Date().toLocaleString('ko-KR')}

📝 프로젝트 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 제목: ${data.title}
• 유형: ${data.project_type}
• 설명: ${data.description}
• 예산: ${data.budget_min ? data.budget_min + '원' : '미정'} ~ ${data.budget_max ? data.budget_max + '원' : '미정'}
• 기간: ${data.start_date || '미정'} ~ ${data.end_date || '미정'}
• 장소: ${data.location || '미정'}
• 요구사항: ${data.requirements || '없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이 메일은 grigoent.co.kr 웹사이트를 통해 자동으로 발송되었습니다.
      `.trim();
      
    } else if (data.type === 'team_proposal') {
      // 팀 섭외 제안
      if (!data.client_name || !data.client_email || !data.title || !data.description) {
        console.log('Missing required fields for team proposal');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      
      subject = `[그리고 엔터테인먼트] 팀 섭외 제안 - ${data.client_name}`;
      body = `
새로운 팀 섭외 제안이 접수되었습니다.

📋 제안 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 클라이언트: ${data.client_name}
• 이메일: ${data.client_email}
• 전화번호: ${data.client_phone || '미입력'}
• 팀: ${data.team_name}
• 제안일시: ${new Date().toLocaleString('ko-KR')}

📝 프로젝트 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 제목: ${data.title}
• 유형: ${data.project_type}
• 설명: ${data.description}
• 예산: ${data.budget_min ? data.budget_min + '원' : '미정'} ~ ${data.budget_max ? data.budget_max + '원' : '미정'}
• 기간: ${data.start_date || '미정'} ~ ${data.end_date || '미정'}
• 장소: ${data.location || '미정'}
• 요구사항: ${data.requirements || '없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이 메일은 grigoent.co.kr 웹사이트를 통해 자동으로 발송되었습니다.
      `.trim();
      
    } else if (data.type === 'general_proposal') {
      // 일반 의뢰
      if (!data.client_name || !data.client_email || !data.title || !data.description) {
        console.log('Missing required fields for general proposal');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      
      subject = `[그리고 엔터테인먼트] 일반 의뢰 - ${data.client_name}`;
      body = `
새로운 일반 의뢰가 접수되었습니다.

📋 의뢰 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 클라이언트: ${data.client_name}
• 이메일: ${data.client_email}
• 전화번호: ${data.client_phone || '미입력'}
• 의뢰일시: ${new Date().toLocaleString('ko-KR')}

📝 프로젝트 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 제목: ${data.title}
• 유형: ${data.project_type}
• 설명: ${data.description}
• 예산: ${data.budget_min ? data.budget_min + '원' : '미정'} ~ ${data.budget_max ? data.budget_max + '원' : '미정'}
• 기간: ${data.start_date || '미정'} ~ ${data.end_date || '미정'}
• 장소: ${data.location || '미정'}
• 요구사항: ${data.requirements || '없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이 메일은 grigoent.co.kr 웹사이트를 통해 자동으로 발송되었습니다.
      `.trim();
      
    } else if (data.type === 'dancer_application') {
      // 댄서 에이전시 풀 / 지원 신청
      var hasPortfolio = (data.portfolio_url && String(data.portfolio_url).trim()) || data.portfolio_file_path;
      if (!data.full_name || !data.stage_name || !data.birth_date || !data.instagram_handle ||
          !data.careers || !Array.isArray(data.careers) || data.careers.length < 1 ||
          !data.phone || !data.gender || data.height_cm === undefined || data.height_cm === null ||
          !hasPortfolio || !data.nationality || data.is_korean_national === undefined ||
          data.privacy_consent !== true) {
        console.log('Missing required fields for dancer_application');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      if (!data.is_korean_national && (data.has_visa === undefined || data.has_visa === null)) {
        console.log('Missing visa flag for foreign national dancer_application');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      if (!data.is_korean_national && data.has_visa === true && !data.visa_details) {
        console.log('Missing visa_details for dancer_application');
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Missing required fields' }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(headers);
      }
      
      var careersLines = '';
      if (Array.isArray(data.careers)) {
        careersLines = data.careers.map(function(c, i) { return (i + 1) + '. ' + c; }).join('\n');
      } else {
        careersLines = String(data.careers);
      }
      
      var genderKo = { male: '남성', female: '여성', other: '기타', prefer_not: '비공개' };
      var genderLabel = genderKo[data.gender] || data.gender;
      var visaLine = '';
      if (data.is_korean_national) {
        visaLine = '• 비자: 해당 없음 (대한민국 국적)';
      } else {
        visaLine = '• 비자 유무: ' + (data.has_visa ? '있음' : '없음');
        if (data.has_visa && data.visa_details) {
          visaLine += '\n• 비자 정보·만료일: ' + data.visa_details;
        }
      }
      
      subject = '[그리고 엔터테인먼트] 에이전시 풀 지원 - ' + data.stage_name;
      body = [
        '에이전시 풀 지원이 접수되었습니다.',
        '',
        '지원자 정보',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '• 이름: ' + data.full_name,
        '• 활동명: ' + data.stage_name,
        '• 연락처: ' + data.phone,
        '• 생년월일: ' + data.birth_date,
        '• 성별: ' + genderLabel,
        '• 키: ' + data.height_cm + ' cm',
        '• 포트폴리오 URL: ' + (data.portfolio_url && String(data.portfolio_url).trim() ? data.portfolio_url : '(없음)'),
        '• 포트폴리오 파일(Storage 경로): ' + (data.portfolio_file_path || '(없음)'),
        '• 인스타그램: @' + data.instagram_handle,
        '• 소속사: ' + (data.agency_name || '없음'),
        '• 국적: ' + data.nationality,
        visaLine,
        '• 개인정보 동의: 동의함',
        '• 접수일시: ' + new Date().toLocaleString('ko-KR'),
        '',
        '주요 경력',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        careersLines,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '이 메일은 grigoent.co.kr 웹사이트를 통해 자동으로 발송되었습니다.'
      ].join('\n');
      
    } else {
      console.log('Invalid inquiry type:', data.type);
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Invalid inquiry type' }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }
    
    console.log('Preparing to send email with subject:', subject);
    
    // Gmail로 전송
    GmailApp.sendEmail(
      'contact@grigoent.co.kr', // 받는 사람 이메일
      subject,
      body,
      {
        name: '그리고 엔터테인먼트 웹사이트',
        replyTo: data.client_email || data.contact || 'contact@grigoent.co.kr'
      }
    );
    
    console.log('Email sent successfully');
    
    // 성공 응답
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: '문의가 성공적으로 전송되었습니다.' 
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
      
  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Error details:', error.toString());
    console.error('Error stack:', error.stack);
    
    // 에러 응답
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: '문의 처리 중 오류가 발생했습니다.',
        details: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  }
}

// GET 요청 처리 (테스트용)
function doGet(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      message: 'Contact form webhook is active',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

// OPTIONS 요청 처리 (CORS preflight)
function doOptions(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
} 