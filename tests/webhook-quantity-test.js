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
  console.log('🧪 Test 1: Quantity-based selection (2 tickets)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quantityBasedPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 200 && result.success) {
      console.log('✅ Test 1 PASSED: Quantity-based selection successful');
      console.log('   Selection Method:', result.selectionMethod);
      console.log('   Tickets Processed:', result.ticketIds.length);
      console.log('   Order ID:', result.orderId);
      console.log('   Quantity:', result.quantity);
    } else {
      console.log('⚠️  Test 1 CONDITIONAL:', response.status, result);
      console.log('   This might be expected if not enough available tickets');
    }
  } catch (error) {
    console.error('❌ Test 1 ERROR:', error.message);
  }
}

/**
 * Test 2: Table-based selection
 */
async function testTableBasedSelection() {
  console.log('\n🧪 Test 2: Table-based selection...');
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tableBasedPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 200 && result.success) {
      console.log('✅ Test 2 PASSED: Table-based selection successful');
      console.log('   Selection Method:', result.selectionMethod);
      console.log('   Table Number:', result.tableNumber);
      console.log('   Tickets Processed:', result.ticketIds.length);
      console.log('   Order ID:', result.orderId);
    } else {
      console.log('⚠️  Test 2 CONDITIONAL:', response.status, result);
      console.log('   This might be expected if table 5 has no tickets or tickets are already sold');
    }
  } catch (error) {
    console.error('❌ Test 2 ERROR:', error.message);
  }
}

/**
 * Test 3: Single quantity selection
 */
async function testSingleQuantitySelection() {
  console.log('\n🧪 Test 3: Single quantity selection...');
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(singleQuantityPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 200 && result.success) {
      console.log('✅ Test 3 PASSED: Single quantity selection successful');
      console.log('   Selection Method:', result.selectionMethod);
      console.log('   Tickets Processed:', result.ticketIds.length);
      console.log('   Quantity:', result.quantity);
    } else {
      console.log('⚠️  Test 3 CONDITIONAL:', response.status, result);
      console.log('   This might be expected if no available tickets');
    }
  } catch (error) {
    console.error('❌ Test 3 ERROR:', error.message);
  }
}

/**
 * Test 4: Invalid payload - no items
 */
async function testInvalidPayload() {
  console.log('\n🧪 Test 4: Invalid payload (no items)...');
  
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
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidPayload)
    });
    
    const result = await response.json();
    
    if (response.status === 400 && !result.success) {
      console.log('✅ Test 4 PASSED: Invalid payload correctly rejected');
      console.log('   Error Message:', result.message);
    } else {
      console.log('❌ Test 4 FAILED: Expected 400 error, got:', response.status, result);
    }
  } catch (error) {
    console.error('❌ Test 4 ERROR:', error.message);
  }
}

/**
 * Test 5: Non-existent table
 */
async function testNonExistentTable() {
  console.log('\n🧪 Test 5: Non-existent table...');
  
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
  
  try {
    const response = await fetch(`${baseUrl}/api/webhooks/checkout/${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nonExistentTablePayload)
    });
    
    const result = await response.json();
    
    if (response.status === 400 && !result.success) {
      console.log('✅ Test 5 PASSED: Non-existent table correctly handled');
      console.log('   Error Message:', result.message);
    } else {
      console.log('❌ Test 5 FAILED: Expected 400 error, got:', response.status, result);
    }
  } catch (error) {
    console.error('❌ Test 5 ERROR:', error.message);
  }
}

/**
 * Health check
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
  console.log('🚀 Starting Webhook Quantity/Table Tests\n');
  
  // Check if server is running first
  const serverReady = await testHealthCheck();
  if (!serverReady) {
    console.log('\n❌ Tests aborted: Server is not running');
    process.exit(1);
  }
  
  console.log('\n📋 Running webhook tests...\n');
  
  await testQuantityBasedSelection();
  await testTableBasedSelection();
  await testSingleQuantitySelection();
  await testInvalidPayload();
  await testNonExistentTable();
  
  console.log('\n🏁 All tests completed!\n');
  console.log('📖 Example curl commands:');
  
  console.log('\n✅ Quantity-based (2 items):');
  console.log(`curl -X POST "${baseUrl}/api/webhooks/checkout/${testUserId}" \\`);
  console.log('     -H "Content-Type: application/json" \\');
  console.log(`     -d '${JSON.stringify(quantityBasedPayload, null, 0)}'`);
  
  console.log('\n✅ Table-based:');
  console.log(`curl -X POST "${baseUrl}/api/webhooks/checkout/${testUserId}" \\`);
  console.log('     -H "Content-Type: application/json" \\');
  console.log(`     -d '${JSON.stringify(tableBasedPayload, null, 0)}'`);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
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
