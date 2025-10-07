#!/usr/bin/env node

/**
 * AWS SES Test Script
 * Tests email sending functionality with your SES configuration
 */

require('dotenv').config();

async function testSESConfiguration() {
  console.log('🧪 Testing AWS SES Configuration...\n');

  // Check environment variables
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'FROM_EMAIL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease add these to your .env file and try again.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables present:');
  console.log(`   - AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
  console.log(`   - AWS_SECRET_ACCESS_KEY: ${'*'.repeat(20)}`);
  console.log(`   - AWS_REGION: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   - FROM_EMAIL: ${process.env.FROM_EMAIL}\n`);

  // Test email service
  try {
    const emailService = require('./services/emailService');
    
    // Get test email from user
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const testEmail = await new Promise((resolve) => {
      rl.question('Enter your email address to send a test email: ', (email) => {
        resolve(email);
        rl.close();
      });
    });

    console.log(`\n📧 Sending test confirmation email to: ${testEmail}`);

    const testEmailData = {
      eventName: 'SES Configuration Test Event',
      confirmationUrl: 'https://ticket.nova.money/confirmation/test-hash-123',
      orderId: 'TEST-ORDER-SES-001',
      totalTickets: 2
    };

    const result = await emailService.sendConfirmationEmail(testEmail, testEmailData);

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`   - Message ID: ${result.messageId}`);
      console.log(`   - Recipient: ${result.email}`);
      console.log('\n📬 Check your email inbox (and spam folder) for the test message.');
    } else {
      console.error('❌ Failed to send test email');
    }

  } catch (error) {
    console.error('❌ SES Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('Access Denied')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Verify AWS credentials are correct');
      console.error('   - Check IAM permissions for SES');
      console.error('   - Ensure SES service is available in your region');
    }
    
    if (error.message.includes('Email address not verified')) {
      console.error('\n💡 Email verification needed:');
      console.error('   - Verify your sending email address in AWS SES Console');
      console.error('   - Or verify your entire domain');
      console.error('   - Request production access if still in sandbox mode');
    }

    process.exit(1);
  }
}

// Run the test
testSESConfiguration().catch(console.error);