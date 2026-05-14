/**
 * Email Test Script
 * Usage: node emails/test/test-send.js [welcome|project]
 *
 * Before running, create .env.email in project root with SMTP credentials
 */

const path = require('path');

// Load environment variables from .env.email
require('dotenv').config({ path: path.join(__dirname, '../../.env.email') });

const { sendEmail } = require('../smtp/send-email');
const { validateConfig, getConfigSummary } = require('../smtp/config');

const type = process.argv[2] || 'welcome';

const testData = {
  welcome: {
    name: '테스트 댄서',
  },
  project: {
    name: '테스트 댄서',
    project_title: '2024 Summer Dance Showcase',
    project_date: '2024년 8월 15일 (목) 14:00',
    project_location: '서울 홍대 무대',
    positions: 'Street Dance 2명, Waacking 1명',
    project_description: '여름 시즌 쇼케이스 공연입니다. 경력 무관 지원 가능하며, 최종 선정 시 출연료가 지급됩니다.',
  },
};

async function main() {
  console.log('='.repeat(50));
  console.log('Grigoent Email Test');
  console.log('='.repeat(50));

  // Show current configuration
  console.log('\nConfiguration:');
  const config = getConfigSummary();
  console.log(JSON.stringify(config, null, 2));

  // Validate configuration
  try {
    validateConfig();
    console.log('\nConfiguration validation: PASSED');
  } catch (err) {
    console.error('\nConfiguration validation: FAILED');
    console.error(err.message);
    console.error('\nPlease create .env.email file with required variables.');
    console.error('See .env.email.example for reference.');
    process.exit(1);
  }

  // Validate email type
  if (!testData[type]) {
    console.error(`\nUnknown email type: ${type}`);
    console.error('Available types: welcome, project');
    process.exit(1);
  }

  console.log(`\nSending ${type} email...`);
  console.log('Test data:', JSON.stringify(testData[type], null, 2));

  try {
    const result = await sendEmail({
      type,
      to: process.env.TEST_RECIPIENT || 'tommy0621@naver.com',
      data: testData[type],
    });

    console.log('\n' + '='.repeat(50));
    console.log('SUCCESS');
    console.log('='.repeat(50));
    console.log('Message ID:', result.messageId);
    console.log('Recipient:', result.accepted?.[0] || 'N/A');
  } catch (err) {
    console.error('\n' + '='.repeat(50));
    console.error('FAILED');
    console.error('='.repeat(50));
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
