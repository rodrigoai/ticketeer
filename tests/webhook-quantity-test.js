/**
 * Comprehensive test file for the updated webhook endpoint with quantity-based and table-based selection
 * Run with: node tests/webhook-quantity-test.js
 */

const assert = require('assert');

// Test configurations
const baseUrl = 'http://localhost:3000';
const testUserId = 'google-oauth2|114992913809995347976'; // User with available tickets

// Test payloads
const quantityBasedPayload = {
  event: 'order.paid',
  payload: {
    id: 'order_quantity_test_' + Date.now(),
    date: new Date().toISOString(),
    items: [
      {
        total: 50.0,
        value: 50.0,
        quantity: 2.0,
        unit_name: 'UN',
        product_id: 45,
        product_name: 'Test Ticket'
      }
    ],
    total: 100.0,
    status: 'paid',
    customer: {
      name: 'Quantity Test User',
      email: 'quantity@test.com',
      identification: '12345678901'
    },
    meta: {
      // No tableNumber - should trigger quantity-based selection
    }
  }
};

const tableBasedPayload = {
  event: 'order.paid',
  payload: {
    id: 'order_table_test_' + Date.now(),
    date: new Date().toISOString(),
    items: [
      {
        total: 200.0,
        value: 200.0,
        quantity: 4.0,
        unit_name: 'UN',
        product_id: 45,
        product_name: 'Table Ticket'
      }
    ],
    total: 200.0,
    status: 'paid',
    customer: {
      name: 'Table Test User',
      email: 'table@test.com',
      identification: '98765432109'
    },
    meta: {
      tableNumber: '5' // Should trigger table-based selection
    }
  }
};

const singleQuantityPayload = {
  event: 'order.paid',
  payload: {
    id: 'order_single_test_' + Date.now(),
    date: new Date().toISOString(),
    items: [
      {
        total: 25.0,
        value: 25.0,
        quantity: 1.0,
        unit_name: 'UN',
        product_id: 45,
        product_name: 'Single Ticket'
      }
    ],
    total: 25.0,
    status: 'paid',
    customer: {
      name: 'Single Test User',
      email: 'single@test.com',
      identification: '55555555555'
    },
    meta: {
      // No tableNumber - should select 1 ticket
    }
  }
};

/**
 * Test 1: Quantity-based selection (2 tickets)
 */
async function testQuantityBasedSelection() {
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(quantityBasedPayload)
  });

  await response.json();
}

/**
 * Test 2: Table-based selection
 */
async function testTableBasedSelection() {
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tableBasedPayload)
  });

  await response.json();
}

/**
 * Test 3: Single quantity selection
 */
async function testSingleQuantitySelection() {
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(singleQuantityPayload)
  });

  await response.json();
}

/**
 * Test 4: Invalid payload - no items
 */
async function testInvalidPayload() {
  const invalidPayload = {
    event: 'order.paid',
    payload: {
      id: 'order_invalid_test',
      customer: {
        name: 'Invalid Test'
      },
      meta: {}
      // Missing items array
    }
  };
  
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidPayload)
  });

  const result = await response.json();

  assert.strictEqual(response.status, 400);
  assert.strictEqual(result.success, false);
}

/**
 * Test 5: Non-existent table
 */
async function testNonExistentTable() {
  const nonExistentTablePayload = {
    event: 'order.paid',
    payload: {
      id: 'order_no_table_test',
      items: [{ quantity: 1 }],
      customer: { name: 'No Table Test' },
      meta: {
        tableNumber: '999' // Non-existent table
      }
    }
  };
  
  const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nonExistentTablePayload)
  });

  const result = await response.json();

  assert.strictEqual(response.status, 400);
  assert.strictEqual(result.success, false);
}

/**
 * Health check
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
  
  await testQuantityBasedSelection();
  await testTableBasedSelection();
  await testSingleQuantitySelection();
  await testInvalidPayload();
  await testNonExistentTable();
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(() => {
    process.exit(1);
  });
}

module.exports = {
  testQuantityBasedSelection,
  testTableBasedSelection,
  testSingleQuantitySelection,
  testInvalidPayload,
  testNonExistentTable,
  testHealthCheck,
  runTests
};
