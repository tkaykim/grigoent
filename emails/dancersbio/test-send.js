#!/usr/bin/env node
/**
 * DancersBio Email Test Script
 * Usage: node emails/dancersbio/test-send.js [invite|project]
 *
 * Before running, create .env.email in project root with email credentials
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.email') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const { sendDancersBioInvite, getConfigSummary: getInviteConfig } = require('./send-invite');
const { sendProjectNotification, getConfigSummary: getProjectConfig } = require('./send-project-notification');

const type = process.argv[2] || 'invite';
const TEST_RECIPIENT = process.env.TEST_RECIPIENT || 'tommy0621@naver.com';
const DANCERSBIO_URL = process.env.DANCERSBIO_URL || 'https://dancers-bio.vercel.app';

const testData = {
  invite: {
    email: TEST_RECIPIENT,
    name: '테스트 댄서',
    profileUrl: `${DANCERSBIO_URL}/dancers/test123`,
  },
  project: {
    recipient: {
      email: TEST_RECIPIENT,
      name: '테스트 댄서',
    },
    project: {
      projectName: '2024 Summer MV 촬영',
      description: '인기 아이돌 그룹의 신곡 뮤직비디오 백댄서 모집합니다. 경력 무관 지원 가능하며, 최종 선정 시 출연료가 지급됩니다.',
      deadline: '2024년 8월 15일',
      projectUrl: `${DANCERSBIO_URL}/projects/xyz789`,
    },
  },
};

async function main() {
  console.log('='.repeat(60));
  console.log('DancersBio Email Test');
  console.log('='.repeat(60));

  // Show current configuration
  console.log('\nConfiguration:');
  const config = type === 'invite' ? getInviteConfig() : getProjectConfig();
  console.log(JSON.stringify(config, null, 2));

  // Validate email type
  if (!testData[type]) {
    console.error(`\nUnknown email type: ${type}`);
    console.error('Available types: invite, project');
    process.exit(1);
  }

  // Validate email configuration
  if (config.mode === 'smtp' && !config.smtpConfigured) {
    console.error('\nError: SMTP mode selected but SMTP credentials not configured');
    console.error('Required: EMAIL_SMTP_USER, EMAIL_SMTP_PASS');
    process.exit(1);
  }

  if (config.mode === 'appscript' && !config.appScriptConfigured) {
    console.error('\nError: AppScript mode selected but webhook URL not configured');
    console.error('Required: APPSCRIPT_WEBHOOK_URL');
    process.exit(1);
  }

  console.log(`\nSending ${type} email...`);
  console.log('Test data:', JSON.stringify(testData[type], null, 2));

  try {
    let result;

    if (type === 'invite') {
      result = await sendDancersBioInvite(testData.invite);
    } else if (type === 'project') {
      result = await sendProjectNotification(testData.project.recipient, testData.project.project);
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS');
    console.log('='.repeat(60));
    console.log('Result:', JSON.stringify(result, null, 2));

    if (config.safeMode) {
      console.log(`\n[SAFE MODE] Email was sent to test recipient: ${TEST_RECIPIENT}`);
    }
  } catch (err) {
    console.error('\n' + '='.repeat(60));
    console.error('FAILED');
    console.error('='.repeat(60));
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
