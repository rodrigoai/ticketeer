#!/usr/bin/env node

/**
 * Simple test script for the new confirmation hash API endpoint
 * Usage: node test-confirmation-api.js <order-id> <auth-token>
 */

const https = require('https');
const http = require('http');

const orderId = process.argv[2];
const authToken = process.argv[3];

if (!orderId || !authToken) {
  console.log('Usage: node test-confirmation-api.js <order-id> <auth-token>');
  console.log('Example: node test-confirmation-api.js "ORDER123" "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."');
  process.exit(1);
}

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const url = new URL(`/api/orders/${encodeURIComponent(orderId)}/confirmation-hash`, baseUrl);

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
};

console.log(`Testing confirmation hash API endpoint:`);
console.log(`URL: ${url.toString()}`);
console.log(`Order ID: ${orderId}`);
console.log(`Auth Token: ${authToken.substring(0, 20)}...`);
console.log('');

const client = url.protocol === 'https:' ? https : http;

const req = client.request(url, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Headers:`, res.headers);
    console.log('');
    
    try {
      const jsonData = JSON.parse(data);
      console.log('Response Body (JSON):');
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.success && jsonData.hash) {
        const confirmationUrl = `${baseUrl}/confirmation/${jsonData.hash}`;
        console.log('');
        console.log(`✅ Success! Confirmation URL: ${confirmationUrl}`);
      } else {
        console.log('');
        console.log(`❌ Error: ${jsonData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log('Response Body (Raw):');
      console.log(data);
      console.log('');
      console.log(`❌ Failed to parse JSON response: ${error.message}`);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Request failed: ${error.message}`);
});

req.end();