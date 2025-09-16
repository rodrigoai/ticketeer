#!/bin/bash

# Example curl commands for testing the checkout webhook endpoint
# Make sure the server is running: yarn start

SERVER_URL="http://localhost:3000"
WEBHOOK_ENDPOINT="/api/webhooks/checkout"

echo "🚀 Testing Checkout Webhook Endpoint"
echo "======================================"
echo ""

# Test 1: Single ticket purchase (successful case)
echo "📝 Test 1: Single ticket purchase (with table number)"
curl -X POST "${SERVER_URL}${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'

echo -e "\n\n"

# Test 2: Single ticket purchase without table number
echo "📝 Test 2: Single ticket purchase (no table number)"
curl -X POST "${SERVER_URL}${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": 7931,
      "date": "2025-09-16T09:07:09-03:00",
      "meta": {
        "_fbp": "fb.1.1745938412499.233098240965998130",
        "tickets": "[\"33\"]",
        "_user_ip": "18.68.37.44",
        "_user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/3724cee5-2bc7-469c-9aad-9a0c31b181e8/payment?meta.tickets=33"
      },
      "utms": {},
      "items": [
        {
          "total": 44.9,
          "value": 44.9,
          "quantity": 1.0,
          "unit_name": "UN",
          "product_id": 45,
          "product_name": "Ingresso: Individual"
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
          "tickets": "[\"33\"]",
          "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/3724cee5-2bc7-469c-9aad-9a0c31b181e8?meta.tickets=33"
        },
        "name": "Ana Silva",
        "utms": {
          "utm_id": "12336",
          "utm_term": "individual",
          "utm_medium": "email",
          "utm_source": "Newsletter",
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
          "amount": 44.9,
          "status": "paid",
          "company": "NOVA MONEY",
          "interest": 0.0,
          "created_at": "2025-09-16T09:07:08-03:00",
          "gateway_id": "ch_c8of4ymhqMerq7QB",
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
  }'

echo -e "\n\n"

# Test 3: Multi-ticket purchase (with table number)
echo "📝 Test 3: Multi-ticket purchase (with table number)"
curl -X POST "${SERVER_URL}${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": 7932,
      "date": "2025-09-16T09:07:09-03:00",
      "meta": {
        "_fbp": "fb.1.1745938412499.233098240965998130",
        "tickets": "[\"31\",\"32\"]",
        "_user_ip": "18.68.37.44",
        "_user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "tableNumber": "2",
        "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/3724cee5-2bc7-469c-9aad-9a0c31b181e8/payment?meta.tickets=31,32&meta.tableNumber=2"
      },
      "utms": {},
      "items": [
        {
          "total": 89.8,
          "value": 44.9,
          "quantity": 2.0,
          "unit_name": "UN",
          "product_id": 45,
          "product_name": "Ingresso: Formas Espaciais"
        }
      ],
      "total": 89.8,
      "seller": {
        "name": null
      },
      "status": "paid",
      "deal_id": null,
      "customer": {
        "meta": {
          "tickets": "[\"31\",\"32\"]",
          "tableNumber": "2",
          "_checkout_url": "https://coyo.staging.pay.nova.money/pt-BR/checkout/3724cee5-2bc7-469c-9aad-9a0c31b181e8?meta.tickets=31,32&meta.tableNumber=2"
        },
        "name": "Maria Silva",
        "utms": {
          "utm_id": "12335",
          "utm_term": "evento",
          "utm_medium": "social",
          "utm_source": "Facebook",
          "utm_content": "promo",
          "utm_campaign": "social"
        },
        "email": "maria@example.com",
        "phone": "+5511987654321",
        "address": {
          "city": "São Paulo",
          "state": "SP",
          "number": "100",
          "street": "Rua das Flores",
          "zipcode": "01234567",
          "neighborhood": "Centro"
        },
        "identification": "12345678901"
      },
      "discount": 0.0,
      "invoices": [],
      "payments": [
        {
          "type": "credit_card",
          "amount": 89.8,
          "status": "paid",
          "company": "NOVA MONEY",
          "interest": 0.0,
          "created_at": "2025-09-16T10:15:08-03:00",
          "gateway_id": "ch_b7nf3xlgpLdqp6PA",
          "installments": 1,
          "installation_value": 89.8
        }
      ],
      "seller_id": null,
      "created_at": "2025-09-16T10:15:04-03:00",
      "coupon_code": null,
      "observation": "",
      "checkout_page_id": "3724cee5-2bc7-469c-9aad-9a0c31b181e8"
    }
  }'

echo -e "\n\n"

# Test 4: Invalid payload (missing meta.tickets)
echo "📝 Test 4: Invalid payload (should fail)"
curl -X POST "${SERVER_URL}${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": 7933,
      "date": "2025-09-16T09:07:09-03:00",
      "meta": {
        "_fbp": "fb.1.1745938412499.233098240965998130",
        "tableNumber": "3"
      },
      "total": 44.9,
      "status": "paid"
    }
  }'

echo -e "\n\n"

# Test 5: Wrong event type (should be acknowledged but not processed)
echo "📝 Test 5: Wrong event type"
curl -X POST "${SERVER_URL}${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.refunded",
    "payload": {
      "id": 7934,
      "date": "2025-09-16T09:07:09-03:00",
      "meta": {
        "_fbp": "fb.1.1745938412499.233098240965998130",
        "tickets": "[\"30\"]",
        "tableNumber": "1"
      },
      "total": 44.9,
      "status": "refunded"
    }
  }'

echo -e "\n\n"

echo "✅ All webhook tests completed!"
echo ""
echo "Expected results:"
echo "• Test 1: Should succeed if ticket 30 exists and is available (WITH table assignment)"
echo "• Test 2: Should succeed if ticket 33 exists and is available (WITHOUT table assignment)"
echo "• Test 3: Should succeed if tickets 31,32 exist and are available (WITH table assignment)"
echo "• Test 4: Should fail with 'missing meta.tickets' error"
echo "• Test 5: Should acknowledge but not process refund event"
