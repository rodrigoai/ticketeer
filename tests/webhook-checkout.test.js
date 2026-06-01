const http = require('http');
const fs = require('fs');
const path = require('path');

test.skip('manual checkout webhook integration script', () => {});

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const WEBHOOK_ENDPOINT = '/api/webhooks/checkout';

// Test data
const validSingleTicketPayload = {
  "event": "order.paid",
  "payload": {
    "id": 7931,
    "date": "2025-09-16T09:07:09-03:00",
    "meta": {
      "_fbp": "fb.1.1745938412499.233098240965998130",
      "tickets": "[\"30\"]",
      "_user_ip": "18.68.37.44",
      "_user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "tableNumber": "1",
      "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/3724cee5-2bc7-469c-9aad-9a0c31b181e8/payment?meta.tickets=30&meta.tableNumber=1"
    },
    "utms": {},
    "items": [
      {
        "total": 44.9,
        "value": 44.9,
        "quantity": 1.0,
        "unit_name": "UN",
        "product_id": 45,
        "product_name": "Ingresso: Formas Espaciais"
      }
    ],
    "total": 44.9,
    "seller": {
      "name": null
    },
    "status": "paid",
    "deal_id": null,
    "customer": {
      "meta": {
        "tickets": "[\"30\"]",
        "tableNumber": "1",
        "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/3724cee5-2bc7-469c-9aad-9a0c31b181e8?meta.tickets=30&meta.tableNumber=1"
      },
      "name": "Rodrigo Lima",
      "utms": {
        "utm_id": "12334",
        "utm_term": "curso",
        "utm_medium": "adwords",
        "utm_source": "GoogleAds",
        "utm_content": "lastOp",
        "utm_campaign": "lastCall"
      },
      "email": "rodrigo@coyo.com.br",
      "phone": "+5512998833382",
      "address": {
        "city": "São José dos Campos",
        "state": "SP",
        "number": "319",
        "street": "Av Cassiano Ricardo",
        "zipcode": "12230083",
        "neighborhood": "Jd Aquarius"
      },
      "identification": "44010729015"
    },
    "discount": 0.0,
    "invoices": [],
    "payments": [
      {
        "type": "pix",
        "amount": 44.9,
        "status": "paid",
        "company": "NOVA MONEY",
        "interest": 0.0,
        "created_at": "2025-09-16T09:07:08-03:00",
        "gateway_id": "ch_a6me2wlfoKcop5OZ",
        "installments": 1,
        "installation_value": 44.9
      }
    ],
    "seller_id": null,
    "created_at": "2025-09-16T09:07:04-03:00",
    "coupon_code": null,
    "observation": "",
    "checkout_page_id": "3724cee5-2bc7-469c-9aad-9a0c31b181e8"
  }
};

const validMultiTicketPayload = {
  ...validSingleTicketPayload,
  payload: {
    ...validSingleTicketPayload.payload,
    id: 7932,
    meta: {
      ...validSingleTicketPayload.payload.meta,
      tickets: "[\"31\",\"32\"]"
    },
    customer: {
      ...validSingleTicketPayload.payload.customer,
      meta: {
        ...validSingleTicketPayload.payload.customer.meta,
        tickets: "[\"31\",\"32\"]"
      }
    }
  }
};

const validSingleTicketNoTablePayload = {
  "event": "order.paid",
  "payload": {
    "id": 7933,
    "date": "2025-09-16T09:07:09-03:00",
    "meta": {
      "_fbp": "fb.1.1745938412499.233098240965998130",
      "tickets": "[\"33\"]",
      "_user_ip": "18.68.37.44",
      "_user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/no-table-example"
    },
    "utms": {},
    "items": [
      {
        "total": 75.0,
        "value": 75.0,
        "quantity": 1.0,
        "unit_name": "UN",
        "product_id": 46,
        "product_name": "Ingresso Individual"
      }
    ],
    "total": 75.0,
    "seller": {
      "name": null
    },
    "status": "paid",
    "deal_id": null,
    "customer": {
      "meta": {
        "tickets": "[\"33\"]",
        "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/no-table-example"
      },
      "name": "Ana Silva",
      "utms": {
        "utm_id": "12336",
        "utm_term": "individual",
        "utm_medium": "email",
        "utm_source": "newsletter",
        "utm_content": "individual",
        "utm_campaign": "individual"
      },
      "email": "ana@example.com",
      "phone": "+5511888777666",
      "address": {
        "city": "Rio de Janeiro",
        "state": "RJ",
        "number": "500",
        "street": "Av Copacabana",
        "zipcode": "22070001",
        "neighborhood": "Copacabana"
      },
      "identification": "98765432100"
    },
    "discount": 0.0,
    "invoices": [],
    "payments": [
      {
        "type": "credit_card",
        "amount": 75.0,
        "status": "paid",
        "company": "NOVA MONEY",
        "interest": 0.0,
        "created_at": "2025-09-16T11:30:08-03:00",
        "gateway_id": "ch_c8of4ymhqMerq7QB",
        "installments": 1,
        "installation_value": 75.0
      }
    ],
    "seller_id": null,
    "created_at": "2025-09-16T11:30:04-03:00",
    "coupon_code": null,
    "observation": "",
    "checkout_page_id": "3724cee5-2bc7-469c-9aad-9a0c31b181e8"
  }
};

const validMultiTicketNoTablePayload = {
  ...validMultiTicketPayload,
  payload: {
    ...validMultiTicketPayload.payload,
    id: 7934,
    meta: {
      ...validMultiTicketPayload.payload.meta,
      tickets: "[\"34\",\"35\"]"
    },
    customer: {
      ...validMultiTicketPayload.payload.customer,
      meta: {
        tickets: "[\"34\",\"35\"]",
        "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/no-table-multi"
      }
    }
  }
};

// Remove tableNumber from the no-table payloads
delete validSingleTicketNoTablePayload.payload.meta.tableNumber;
delete validMultiTicketNoTablePayload.payload.meta.tableNumber;

// Test helper functions
function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlParsed = new URL(url);
    
    const options = {
      hostname: urlParsed.hostname,
      port: urlParsed.port,
      path: urlParsed.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function checkServerHealth() {
  try {
    const response = await makeRequest('GET', `${SERVER_URL}/api/health`);
    return response.statusCode === 200;
  } catch (error) {
    return false;
  }
}

// Test suite
async function runTests() {

  // Check if server is running
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Valid single ticket purchase
  try {
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, validSingleTicketPayload);
    
    if (response.statusCode === 200 && response.body.success) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test 2: Valid multi-ticket purchase
  try {
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, validMultiTicketPayload);
    
    if (response.statusCode === 200 && response.body.success) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test 3: Single ticket purchase without table number
  try {
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, validSingleTicketNoTablePayload);
    
    if (response.statusCode === 200 && response.body.success) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test 4: Multi-ticket purchase without table number
  try {
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, validMultiTicketNoTablePayload);
    
    if (response.statusCode === 200 && response.body.success) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test 5: Invalid payload - missing meta
  try {
    const invalidPayload = {
      event: "order.paid",
      payload: {
        id: 123,
        // missing meta object
      }
    };
    
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, invalidPayload);
    
    if (response.statusCode === 400 && !response.body.success) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test 6: Wrong event type
  try {
    const wrongEventPayload = {
      ...validSingleTicketPayload,
      event: "order.refunded"
    };
    
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, wrongEventPayload);
    
    if (response.statusCode === 200 && response.body.success && response.body.message.includes('acknowledged but not processed')) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test 7: Missing tickets in meta
  try {
    const missingTicketsPayload = {
      ...validSingleTicketPayload,
      payload: {
        ...validSingleTicketPayload.payload,
        meta: {
          ...validSingleTicketPayload.payload.meta,
          tableNumber: "1"
          // missing tickets field
        }
      }
    };
    delete missingTicketsPayload.payload.meta.tickets;
    
    const response = await makeRequest('POST', `${SERVER_URL}${WEBHOOK_ENDPOINT}`, missingTicketsPayload);
    
    if (response.statusCode === 400 && !response.body.success) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  } catch (error) {
    testsFailed++;
  }

  // Test summary
  
  if (testsFailed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch((error) => {
    process.exit(1);
  });
}

module.exports = {
  runTests,
  makeRequest,
  checkServerHealth
};
