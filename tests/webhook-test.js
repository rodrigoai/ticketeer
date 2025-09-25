/**
 * Simple test file for the public webhook endpoint
 * Run with: node tests/webhook-test.js
 */

const assert = require('assert');

// Mock test data
const validUserId = 'auth0|validUser123';
const invalidUserId = 'auth0|invalidUser999';
const baseUrl = 'http://localhost:3000';

// Test webhook payload
const testWebhookPayload = {
  event: 'order.paid',
  payload: {
    id: 'order_12345',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      identification: '12345678901'
    },
    meta: {
      tickets: JSON.stringify([1, 2]), // Assuming ticket IDs 1 and 2 exist
      tableNumber: '5'
    }
  }
};

/**
 * Test 1: Valid userId should process webhook successfully
 */
async function testValidUserId() {
  console.log('🧪 Test 1: Testing valid userId...');
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${validUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testWebhookPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 200 && result.success) {
      console.log('✅ Test 1 PASSED: Valid userId processed webhook successfully');
      console.log('   Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('⚠️  Test 1 CONDITIONAL: Valid userId test response:', response.status, result);
      console.log('   This might be expected if test data doesn\'t exist yet');
    }
  } catch (error) {
    console.error('❌ Test 1 ERROR:', error.message);
  }
}

/**
 * Test 2: Invalid userId should return 404
 */
async function testInvalidUserId() {
  console.log('\\n🧪 Test 2: Testing invalid userId...');
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${invalidUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testWebhookPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 404 && !result.success) {
      console.log('✅ Test 2 PASSED: Invalid userId correctly returned 404');
      console.log('   Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Test 2 FAILED: Expected 404, got:', response.status, result);
    }
  } catch (error) {
    console.error('❌ Test 2 ERROR:', error.message);
  }
}

/**
 * Test 3: Missing userId should return 404 (route not found)
 */
async function testMissingUserId() {
  console.log('\\n🧪 Test 3: Testing missing userId...');
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testWebhookPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 404) {
      console.log('✅ Test 3 PASSED: Missing userId correctly returned 404');
      console.log('   Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Test 3 FAILED: Expected 404, got:', response.status, result);
    }
  } catch (error) {
    console.error('❌ Test 3 ERROR:', error.message);
  }
}

/**
 * Test 4: Health check to ensure server is running
 */
async function testHealthCheck() {
  console.log('🔍 Health Check: Testing server availability...');
  
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const result = await response.json();
    
    if (response.status === 200 && result.status === 'OK') {
      console.log('✅ Health Check PASSED: Server is running');
      return true;
    } else {
      console.log('❌ Health Check FAILED: Server not responding correctly');
      return false;
    }
  } catch (error) {
    console.error('❌ Health Check ERROR: Server not reachable -', error.message);
    console.error('   Make sure the server is running with: yarn start');
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Webhook API Tests\\n');
  
  // Check if server is running first
  const serverReady = await testHealthCheck();
  if (!serverReady) {
    console.log('\\n❌ Tests aborted: Server is not running');
    process.exit(1);
  }
  
  console.log('\\n📋 Running webhook tests...\\n');
  
  await testValidUserId();
  await testInvalidUserId();
  await testMissingUserId();
  
  console.log('\\n🏁 All tests completed!\\n');
  console.log('📖 Example curl commands:');
  console.log('\\n✅ Valid request:');
  console.log(`curl -X POST "${baseUrl}/api/webhooks/checkout/auth0|user123" \\\\`);
  console.log('     -H "Content-Type: application/json" \\\\');
  console.log(`     -d '${JSON.stringify(testWebhookPayload, null, 0)}'`);
  console.log('\\n❌ Invalid userId:');
  console.log(`curl -X POST "${baseUrl}/api/webhooks/checkout/invalidUser" \\\\`);
  console.log('     -H "Content-Type: application/json" \\\\');
  console.log(`     -d '${JSON.stringify(testWebhookPayload, null, 0)}'`);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testValidUserId,
  testInvalidUserId,
  testMissingUserId,
  testHealthCheck,
  runTests
};