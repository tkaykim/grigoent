#!/usr/bin/env node
/**
 * DancersBio Invite Batch Sender
 * Sends onboarding emails to dancers from Grigoent's dancer_applications table
 *
 * ===== SAFETY NOTICE =====
 * By default, SAFE_MODE is ENABLED - all emails go to tommy0621@naver.com
 * To send to actual recipients, set EMAIL_SAFE_MODE=APPROVED_BY_CEO
 *
 * Usage:
 *   node scripts/send-dancersbio-invites.js --test                    # Send test email only
 *   node scripts/send-dancersbio-invites.js --dry-run                 # Show what would be sent (no actual sending)
 *   node scripts/send-dancersbio-invites.js --status=approved         # Filter by review_status
 *   node scripts/send-dancersbio-invites.js --limit=10                # Limit number of recipients
 *   node scripts/send-dancersbio-invites.js --delay=1000              # Delay between emails (ms)
 *
 * Environment Variables (required):
 *   GRIGOENT_SUPABASE_URL     - Grigoent Supabase project URL
 *   GRIGOENT_SUPABASE_ANON_KEY - Grigoent Supabase anon key
 *
 * Environment Variables (email - at least one method required):
 *   EMAIL_MODE=appscript | smtp
 *   APPSCRIPT_WEBHOOK_URL     - Google Apps Script Web App URL (for appscript mode)
 *   EMAIL_SMTP_USER           - Gmail address (for smtp mode)
 *   EMAIL_SMTP_PASS           - Gmail App Password (for smtp mode)
 *
 * Safety Variables:
 *   EMAIL_SAFE_MODE=APPROVED_BY_CEO  - Required to send to actual recipients
 *   TEST_RECIPIENT=tommy0621@naver.com - Test email address
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.email') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { sendDancersBioInvite, getConfigSummary } = require('../emails/dancersbio/send-invite');

// ===== Configuration =====
const SAFE_MODE = process.env.EMAIL_SAFE_MODE !== 'APPROVED_BY_CEO';
const TEST_RECIPIENT = process.env.TEST_RECIPIENT || 'tommy0621@naver.com';
const DANCERSBIO_URL = process.env.DANCERSBIO_URL || 'https://dancers-bio.vercel.app';
const DEFAULT_DELAY_MS = 500; // Rate limit protection

// ===== Parse CLI Arguments =====
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    test: false,
    dryRun: false,
    status: null,
    limit: null,
    delay: DEFAULT_DELAY_MS,
  };

  for (const arg of args) {
    if (arg === '--test') {
      options.test = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--status=')) {
      options.status = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
DancersBio Invite Batch Sender
==============================

Usage:
  node scripts/send-dancersbio-invites.js [options]

Options:
  --test              Send a single test email to TEST_RECIPIENT (tommy0621@naver.com)
  --dry-run           Show what would be sent without actually sending
  --status=<status>   Filter by review_status (e.g., approved, pending)
  --limit=<n>         Limit number of recipients
  --delay=<ms>        Delay between emails in milliseconds (default: 500)
  --help, -h          Show this help message

Environment Variables:
  GRIGOENT_SUPABASE_URL       Grigoent Supabase project URL
  GRIGOENT_SUPABASE_ANON_KEY  Grigoent Supabase anon key
  EMAIL_MODE                  Email sending mode: 'appscript' or 'smtp' (default: appscript)
  APPSCRIPT_WEBHOOK_URL       Google Apps Script Web App URL
  EMAIL_SMTP_USER             Gmail address for SMTP
  EMAIL_SMTP_PASS             Gmail App Password for SMTP
  EMAIL_SAFE_MODE             Set to 'APPROVED_BY_CEO' to send to real recipients
  TEST_RECIPIENT              Test email address (default: tommy0621@naver.com)
  DANCERSBIO_URL              DancersBio platform URL

Safety:
  By default, SAFE_MODE is ENABLED - all emails are redirected to TEST_RECIPIENT.
  This prevents accidental mass emails to real users.

Examples:
  # Test email (always safe)
  node scripts/send-dancersbio-invites.js --test

  # Preview what would be sent
  node scripts/send-dancersbio-invites.js --dry-run --status=approved --limit=10

  # Send to approved dancers (requires SAFE_MODE disabled or uses test recipient)
  node scripts/send-dancersbio-invites.js --status=approved --limit=5
`);
}

// ===== Sleep utility =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== Main =====
async function main() {
  const options = parseArgs();

  console.log('='.repeat(60));
  console.log('DancersBio Invite Batch Sender');
  console.log('='.repeat(60));

  // Show current configuration
  const config = getConfigSummary();
  console.log('\nConfiguration:');
  console.log(JSON.stringify(config, null, 2));

  if (SAFE_MODE) {
    console.log('\n[SAFE MODE ACTIVE] All emails will be sent to:', TEST_RECIPIENT);
  } else {
    console.log('\n[PRODUCTION MODE] Emails will be sent to actual recipients!');
  }

  // Test mode: send single test email
  if (options.test) {
    console.log('\n--- Test Mode ---');
    console.log(`Sending test email to: ${TEST_RECIPIENT}`);

    try {
      const result = await sendDancersBioInvite({
        email: TEST_RECIPIENT,
        name: '테스트 댄서',
        profileUrl: `${DANCERSBIO_URL}/dancers/test`,
      });

      console.log('\nTest email sent successfully!');
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('\nTest email failed:', err.message);
      process.exit(1);
    }

    return;
  }

  // Validate Supabase configuration
  const supabaseUrl = process.env.GRIGOENT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.GRIGOENT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('\nError: Supabase configuration missing');
    console.error('Required: GRIGOENT_SUPABASE_URL and GRIGOENT_SUPABASE_ANON_KEY');
    console.error('Or: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Build query
  console.log('\nFetching dancers from dancer_applications...');
  let query = supabase.from('dancer_applications').select('email, full_name, stage_name');

  if (options.status) {
    console.log(`Filtering by review_status: ${options.status}`);
    query = query.eq('review_status', options.status);
  }

  if (options.limit) {
    console.log(`Limiting to ${options.limit} recipients`);
    query = query.limit(options.limit);
  }

  const { data: dancers, error } = await query;

  if (error) {
    console.error('\nSupabase query error:', error.message);
    process.exit(1);
  }

  if (!dancers || dancers.length === 0) {
    console.log('\nNo dancers found matching criteria.');
    return;
  }

  console.log(`\nFound ${dancers.length} dancers:`);

  // Filter out entries without email
  const validDancers = dancers.filter((d) => d.email);
  const skippedCount = dancers.length - validDancers.length;

  if (skippedCount > 0) {
    console.log(`Skipping ${skippedCount} dancers without email`);
  }

  // Dry run: just show what would be sent
  if (options.dryRun) {
    console.log('\n--- Dry Run Mode (no emails will be sent) ---');
    validDancers.forEach((dancer, i) => {
      const displayName = dancer.stage_name || dancer.full_name || 'Unknown';
      console.log(`${i + 1}. ${displayName} <${dancer.email}>`);
    });
    console.log(`\nTotal: ${validDancers.length} emails would be sent`);
    return;
  }

  // Send emails
  console.log(`\nSending emails (delay: ${options.delay}ms between each)...`);
  console.log('-'.repeat(60));

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (let i = 0; i < validDancers.length; i++) {
    const dancer = validDancers[i];
    const displayName = dancer.stage_name || dancer.full_name || 'Unknown';

    console.log(`\n[${i + 1}/${validDancers.length}] Sending to: ${displayName} <${dancer.email}>`);

    try {
      const result = await sendDancersBioInvite({
        email: dancer.email,
        name: displayName,
        profileUrl: DANCERSBIO_URL,
      });

      console.log(`  -> Success (${result.method})`);
      successCount++;
      results.push({ email: dancer.email, name: displayName, status: 'success', ...result });
    } catch (err) {
      console.error(`  -> Failed: ${err.message}`);
      failCount++;
      results.push({ email: dancer.email, name: displayName, status: 'failed', error: err.message });
    }

    // Rate limit delay (except for last email)
    if (i < validDancers.length - 1) {
      await sleep(options.delay);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total attempted: ${validDancers.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    console.log('\nFailed emails:');
    results
      .filter((r) => r.status === 'failed')
      .forEach((r) => {
        console.log(`  - ${r.name} <${r.email}>: ${r.error}`);
      });
  }

  if (SAFE_MODE && successCount > 0) {
    console.log(`\n[SAFE MODE] All ${successCount} emails were sent to: ${TEST_RECIPIENT}`);
  }
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
