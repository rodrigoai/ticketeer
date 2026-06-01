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
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${validUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testWebhookPayload)
  });

  await response.json();
}

/**
 * Test 2: Invalid userId should return 404
 */
async function testInvalidUserId() {
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${invalidUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testWebhookPayload)
  });

  const result = await response.json();

  assert.strictEqual(response.status, 404);
  assert.strictEqual(result.success, false);
}

/**
 * Test 3: Missing userId should return 404 (route not found)
 */
async function testMissingUserId() {
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testWebhookPayload)
  });

  await response.json();

  assert.strictEqual(response.status, 404);
}

/**
 * Test 4: Health check to ensure server is running
 */
async function testHealthCheck() {
  
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const result = await response.json();
    
    if (response.status === 200 && result.status === 'OK') {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  
  // Check if server is running first
  const serverReady = await testHealthCheck();
  if (!serverReady) {
    process.exit(1);
  }
  
  await testValidUserId();
  await testInvalidUserId();
  await testMissingUserId();
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(() => {
    process.exit(1);
  });
}

module.exports = {
  testValidUserId,
  testInvalidUserId,
  testMissingUserId,
  testHealthCheck,
  runTests
};
