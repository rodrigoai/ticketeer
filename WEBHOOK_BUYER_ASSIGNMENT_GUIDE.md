# Webhook API - Selective Buyer Assignment Guide

This document explains the updated checkout webhook behavior for buyer information assignment and provides examples for testing.

## 📋 Overview

### **New Behavior (Updated)**
When processing checkout webhooks, the system now implements **selective buyer assignment**:

- **All tickets** in a purchase receive the `order` field with the order ID
- **Only the first ticket** (sorted by `identificationNumber` ascending) receives buyer information (`buyer`, `buyerDocument`, `buyerEmail`)
- **Subsequent tickets** in the same purchase get only the `order` field, with buyer fields remaining `null`

### **Why This Change?**
This approach provides:
- **Privacy protection**: Buyer information is not duplicated across multiple tickets
- **Clear ownership**: The first ticket acts as the "primary" ticket with full buyer details
- **Data efficiency**: Reduces redundant buyer information storage
- **Consistent ordering**: Uses `identificationNumber` for predictable first-ticket selection

## 🔧 Implementation Details

### **Purchase Types Supported**

#### 1. **Quantity-Based Purchase**
- Finds N unsold tickets without table numbers
- Orders by `identificationNumber` ascending
- Updates the first N tickets found

#### 2. **Table-Based Purchase** 
- Finds all tickets for a specific table number
- Orders by `identificationNumber` ascending
- Updates all tickets for that table

### **Buyer Assignment Logic**
```javascript
// Pseudocode
for (let i = 0; i < ticketsToUpdate.length; i++) {
  const isFirstTicket = i === 0; // First by identificationNumber
  
  const updateData = {
    order: orderId // ALL tickets get order field
  };
  
  if (isFirstTicket && customer) {
    // Only first ticket gets buyer info
    updateData.buyer = customer.name;
    updateData.buyerDocument = customer.identification;
    updateData.buyerEmail = customer.email;
  }
  
  updateTicket(ticket[i].id, updateData);
}
```

## 📝 API Endpoint

**POST** `/api/webhooks/checkout/{userId}`

- **Path Parameter**: `userId` - User who owns the event/tickets
- **Body**: Webhook payload from payment system
- **Response**: Processing result with assignment details

## 🧪 Testing Examples

### **Example 1: Single Ticket Purchase**

#### Request
```bash
curl -X POST https://ticketeer.vercel.app/api/webhooks/checkout/auth0%7Ctestuser123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "data": {
      "order_id": "ORDER-SINGLE-001",
      "table_number": null,
      "ticket_ids": [],
      "buyer": {
        "name": "Alice Johnson",
        "email": "alice.johnson@example.com", 
        "document": "123.456.789-10"
      },
      "payment": {
        "amount": 75.00,
        "currency": "BRL",
        "method": "credit_card"
      }
    },
    "payload": {
      "id": "ORDER-SINGLE-001",
      "customer": {
        "name": "Alice Johnson",
        "email": "alice.johnson@example.com",
        "identification": "123.456.789-10"
      },
      "items": [
        {
          "name": "General Admission",
          "quantity": 1,
          "price": 75.00
        }
      ]
    }
  }'
```

#### Expected Database Result
```sql
-- Ticket ID 1 (identificationNumber: 1) - GETS BUYER INFO + ORDER
UPDATE tickets SET 
  order = 'ORDER-SINGLE-001',
  buyer = 'Alice Johnson',
  buyerDocument = '123.456.789-10',
  buyerEmail = 'alice.johnson@example.com'
WHERE id = 1;

-- Result: 1 ticket updated with full buyer information
```

#### Response
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-SINGLE-001 assigned to 1 tickets with 1 tickets updated.",
  "userId": "auth0|testuser123",
  "data": {
    "orderId": "ORDER-SINGLE-001",
    "tableNumber": null,
    "ticketIds": [1],
    "buyerAssigned": "Alice Johnson",
    "processedTickets": 1
  }
}
```

---

### **Example 2: Multi-Ticket Purchase (Quantity-Based)**

#### Request
```bash
curl -X POST https://ticketeer.vercel.app/api/webhooks/checkout/auth0%7Ctestuser123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid", 
    "payload": {
      "id": "ORDER-MULTI-002",
      "customer": {
        "name": "Bob Martinez",
        "email": "bob.martinez@example.com",
        "identification": "987.654.321-00"
      },
      "items": [
        {
          "name": "General Admission",
          "quantity": 3,
          "price": 75.00
        }
      ]
    }
  }'
```

#### Expected Database Result
```sql
-- Ticket ID 2 (identificationNumber: 2) - GETS BUYER INFO + ORDER (FIRST TICKET)
UPDATE tickets SET 
  order = 'ORDER-MULTI-002',
  buyer = 'Bob Martinez',
  buyerDocument = '987.654.321-00',
  buyerEmail = 'bob.martinez@example.com'
WHERE id = 2;

-- Ticket ID 3 (identificationNumber: 3) - GETS ONLY ORDER
UPDATE tickets SET 
  order = 'ORDER-MULTI-002'
WHERE id = 3;

-- Ticket ID 4 (identificationNumber: 4) - GETS ONLY ORDER  
UPDATE tickets SET 
  order = 'ORDER-MULTI-002'
WHERE id = 4;

-- Result: 3 tickets updated, only first gets buyer info
```

#### Response
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-MULTI-002 assigned to 3 tickets with 3 tickets updated.",
  "userId": "auth0|testuser123", 
  "data": {
    "orderId": "ORDER-MULTI-002",
    "tableNumber": null,
    "ticketIds": [2, 3, 4],
    "buyerAssigned": "Bob Martinez",
    "processedTickets": 3
  }
}
```

---

### **Example 3: Table Purchase**

#### Request
```bash
curl -X POST https://ticketeer.vercel.app/api/webhooks/checkout/auth0%7Ctestuser123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "ORDER-TABLE-003",
      "customer": {
        "name": "Carol Davis",
        "email": "carol.davis@example.com",
        "identification": "456.789.123-45"
      },
      "meta": {
        "tableNumber": "7"
      },
      "items": [
        {
          "name": "Table 7 - VIP Section",
          "quantity": 4,
          "price": 600.00
        }
      ]
    }
  }'
```

#### Expected Database Result
```sql
-- All tickets for table 7, ordered by identificationNumber ASC

-- Ticket ID 10 (identificationNumber: 15, table: 7) - GETS BUYER INFO + ORDER (FIRST)
UPDATE tickets SET 
  order = 'ORDER-TABLE-003',
  buyer = 'Carol Davis',
  buyerDocument = '456.789.123-45',
  buyerEmail = 'carol.davis@example.com'
WHERE id = 10;

-- Ticket ID 11 (identificationNumber: 16, table: 7) - GETS ONLY ORDER
UPDATE tickets SET 
  order = 'ORDER-TABLE-003'
WHERE id = 11;

-- Ticket ID 12 (identificationNumber: 17, table: 7) - GETS ONLY ORDER
UPDATE tickets SET 
  order = 'ORDER-TABLE-003'  
WHERE id = 12;

-- Ticket ID 13 (identificationNumber: 18, table: 7) - GETS ONLY ORDER
UPDATE tickets SET 
  order = 'ORDER-TABLE-003'
WHERE id = 13;

-- Result: 4 tickets updated for table 7, only first gets buyer info
```

#### Response
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-TABLE-003 assigned to table 7 with 4 tickets updated.",
  "userId": "auth0|testuser123",
  "data": {
    "orderId": "ORDER-TABLE-003", 
    "tableNumber": 7,
    "ticketIds": [10, 11, 12, 13],
    "buyerAssigned": "Carol Davis",
    "processedTickets": 4
  }
}
```

---

### **Example 4: Purchase with No Customer Information**

#### Request
```bash
curl -X POST https://ticketeer.vercel.app/api/webhooks/checkout/auth0%7Ctestuser123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "ORDER-ANONYMOUS-004",
      "customer": null,
      "items": [
        {
          "name": "General Admission", 
          "quantity": 2,
          "price": 150.00
        }
      ]
    }
  }'
```

#### Expected Database Result
```sql
-- Ticket ID 5 (identificationNumber: 5) - GETS ONLY ORDER (no buyer info)
UPDATE tickets SET 
  order = 'ORDER-ANONYMOUS-004'
WHERE id = 5;

-- Ticket ID 6 (identificationNumber: 6) - GETS ONLY ORDER  
UPDATE tickets SET 
  order = 'ORDER-ANONYMOUS-004'
WHERE id = 6;

-- Result: 2 tickets updated, no buyer information assigned
```

#### Response
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-ANONYMOUS-004 assigned to 2 tickets with 2 tickets updated.",
  "userId": "auth0|testuser123",
  "data": {
    "orderId": "ORDER-ANONYMOUS-004",
    "tableNumber": null, 
    "ticketIds": [5, 6],
    "buyerAssigned": null,
    "processedTickets": 2
  }
}
```

## 🔍 Verification Queries

### **Check Order Assignment**
```sql
-- Verify all tickets in an order have the order field
SELECT id, identificationNumber, order, buyer, buyerDocument, buyerEmail
FROM tickets 
WHERE order = 'ORDER-MULTI-002'
ORDER BY identificationNumber ASC;

-- Expected Result:
-- id | identificationNumber | order           | buyer       | buyerDocument    | buyerEmail
-- 2  | 2                    | ORDER-MULTI-002 | Bob Martinez| 987.654.321-00   | bob.martinez@example.com
-- 3  | 3                    | ORDER-MULTI-002 | null        | null             | null  
-- 4  | 4                    | ORDER-MULTI-002 | null        | null             | null
```

### **Check Buyer Information Distribution**
```sql
-- Count tickets with buyer info per order
SELECT 
  order,
  COUNT(*) as total_tickets,
  COUNT(buyer) as tickets_with_buyer_info,
  COUNT(CASE WHEN buyer IS NOT NULL THEN 1 END) as buyer_info_count
FROM tickets 
WHERE order IS NOT NULL 
GROUP BY order;

-- Expected: Each order should have buyer_info_count = 1 (only first ticket)
```

### **Verify First Ticket Selection**
```sql
-- For each order, show which ticket got buyer info (should be lowest identificationNumber)
SELECT 
  order,
  MIN(identificationNumber) as first_identification_number,
  (SELECT id FROM tickets t2 WHERE t2.order = t1.order AND t2.buyer IS NOT NULL LIMIT 1) as ticket_with_buyer_info
FROM tickets t1 
WHERE order IS NOT NULL 
GROUP BY order;

-- The ticket_with_buyer_info should correspond to the first_identification_number
```

## ❌ Error Scenarios

### **Invalid User ID**
```bash
curl -X POST https://ticketeer.vercel.app/api/webhooks/checkout/invalid_user \
  -H "Content-Type: application/json" \
  -d '{"event": "order.paid", "payload": {"id": "ORDER-001"}}'
```

**Response (404):**
```json
{
  "success": false,
  "error": "User not found", 
  "message": "User with ID 'invalid_user' does not exist or has no events"
}
```

### **No Available Tickets**
```bash
# When requesting quantity but no unsold tickets available
curl -X POST https://ticketeer.vercel.app/api/webhooks/checkout/auth0%7Ctestuser123 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "ORDER-SOLD-OUT", 
      "items": [{"quantity": 5}]
    }
  }'
```

**Response (400):**
```json
{
  "success": false,
  "error": "Failed to process webhook",
  "message": "No available tickets without table numbers found for user auth0|testuser123"
}
```

## 🧪 Testing Your Implementation

### **Step 1: Set Up Test Data**
```sql
-- Create test event and tickets
INSERT INTO events (name, created_by, opening_datetime, closing_datetime) 
VALUES ('Test Event', 'auth0|testuser123', '2024-12-31 18:00:00', '2024-12-31 23:00:00');

-- Create tickets with different scenarios
INSERT INTO tickets (eventId, description, identificationNumber, table, price) VALUES
(1, 'General Admission', 1, null, 75.00),    -- For quantity-based
(1, 'General Admission', 2, null, 75.00),    -- For quantity-based  
(1, 'General Admission', 3, null, 75.00),    -- For quantity-based
(1, 'VIP Table Seat', 15, 7, 150.00),        -- For table-based
(1, 'VIP Table Seat', 16, 7, 150.00),        -- For table-based
(1, 'VIP Table Seat', 17, 7, 150.00),        -- For table-based
(1, 'VIP Table Seat', 18, 7, 150.00);        -- For table-based
```

### **Step 2: Run Test Cases**
1. Execute the curl commands above
2. Check database results match expectations  
3. Verify only first ticket gets buyer info
4. Confirm all tickets get order field

### **Step 3: Validate Results**
```sql
-- After running tests, verify the selective assignment worked
SELECT 
  id,
  identificationNumber,
  table,
  order,
  buyer,
  CASE WHEN buyer IS NOT NULL THEN 'HAS_BUYER_INFO' ELSE 'ORDER_ONLY' END as assignment_type
FROM tickets 
WHERE order IS NOT NULL
ORDER BY order, identificationNumber;
```

## 📚 Additional Notes

- **Order Uniqueness**: Each order ID should be unique across the system
- **Transaction Safety**: All ticket updates happen within a database transaction
- **Sorting Consistency**: Always sorted by `identificationNumber` ASC for predictable results
- **Error Handling**: Failed webhooks don't partially update tickets
- **Idempotency**: Re-sending the same webhook payload should be handled gracefully

## 🚀 Integration Tips

1. **Test with your payment system**: Use your actual webhook payloads
2. **Monitor logs**: Check server logs for detailed webhook processing information
3. **Validate data**: Ensure your payment system sends customer information in expected format
4. **Handle retries**: Payment systems may retry webhooks on failures
5. **Secure endpoints**: Consider webhook signature verification for production