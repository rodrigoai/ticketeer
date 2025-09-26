# Webhook API - Quantity & Table-Based Selection

## Overview

The checkout webhook has been completely redesigned to support **quantity-based** and **table-based** ticket selection, removing dependency on `meta.ticketIds` and implementing smarter ticket allocation logic.

## New Behavior

### 🔄 **Selection Logic:**

The webhook now uses two different selection methods based on the payload content:

1. **🔢 Quantity-Based Selection** (when `meta.tableNumber` is NOT present)
2. **🍽️ Table-Based Selection** (when `meta.tableNumber` IS present)

---

## 🔢 Quantity-Based Selection

### **Trigger Condition:**
- Payload does NOT contain `meta.tableNumber`
- OR `meta.tableNumber` is null/empty

### **Logic:**
1. **Calculate Quantity:** Sum all `quantity` values from `payload.items` array
2. **Find Available Tickets:** Query for tickets that:
   - Belong to events owned by the specified `userId`
   - Have NO table number assigned (`table` is null or 0)
   - Have NO order assigned (`order` is null or empty)
   - Are ordered by `identificationNumber` ascending (first-come, first-served)
3. **Select N Tickets:** Take exactly the calculated quantity of tickets
4. **Update:** Assign order ID and buyer information to selected tickets

### **Example Request:**
```bash
curl -X POST "https://ticketeer.vercel.app/api/webhooks/checkout/google-oauth2|user123" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "order_12345",
      "items": [
        {
          "quantity": 2.0,
          "product_name": "General Admission"
        }
      ],
      "customer": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "meta": {}
    }
  }'
```

### **Example Response:**
```json
{
  "success": true,
  "message": "Successfully processed 2 ticket(s) using quantity-based selection",
  "userId": "google-oauth2|user123",
  "data": {
    "orderId": "order_12345",
    "tableNumber": null,
    "ticketIds": [15, 16],
    "buyerAssigned": true,
    "processedTickets": 2
  }
}
```

---

## 🍽️ Table-Based Selection

### **Trigger Condition:**
- Payload contains `meta.tableNumber` with a valid table number

### **Logic:**
1. **Ignore Quantity:** The `items` quantity is completely ignored
2. **Find Table Tickets:** Query for ALL tickets that:
   - Belong to events owned by the specified `userId`
   - Have `table` field matching the specified `tableNumber`
   - Are ordered by `identificationNumber` ascending
3. **Select ALL Tickets:** Take every ticket assigned to that table
4. **Update:** Assign order ID and buyer information to all table tickets

### **Example Request:**
```bash
curl -X POST "https://ticketeer.vercel.app/api/webhooks/checkout/google-oauth2|user123" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "order_67890",
      "items": [
        {
          "quantity": 4.0,
          "product_name": "Table Reservation"
        }
      ],
      "customer": {
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "meta": {
        "tableNumber": "5"
      }
    }
  }'
```

### **Example Response:**
```json
{
  "success": true,
  "message": "Successfully processed 8 ticket(s) using table-based selection",
  "userId": "google-oauth2|user123",
  "data": {
    "orderId": "order_67890",
    "tableNumber": 5,
    "ticketIds": [20, 21, 22, 23, 24, 25, 26, 27],
    "buyerAssigned": true,
    "processedTickets": 8
  }
}
```

---

## 🔒 Security & Validation

### **User Validation:**
- ✅ `userId` must exist in database (have created events)
- ✅ Only tickets from user's events can be processed
- ✅ Cross-user ticket access is blocked

### **Ticket Validation:**
- ✅ **Quantity-based:** Only unsold tickets (`order` is null/empty)
- ✅ **Table-based:** All table tickets (regardless of sold status)
- ✅ **Ownership:** All tickets must belong to user's events

### **Payload Validation:**
- ✅ `payload.id` (order ID) is required
- ✅ `payload.items` must be valid array with `quantity` values
- ✅ `meta.tableNumber` must be valid integer if present

---

## 🔄 Database Transaction

All ticket updates are performed within a **Prisma transaction** to ensure:
- ✅ **Atomicity:** All tickets are updated or none are updated
- ✅ **Consistency:** Prevents partial updates if errors occur
- ✅ **Isolation:** Concurrent requests don't interfere with each other

---

## 🚨 Error Handling

### **Common Error Scenarios:**

#### **❌ Invalid User:**
```json
{
  "success": false,
  "error": "User not found",
  "message": "User with ID 'invalid-user' does not exist or has no events"
}
```

#### **❌ No Available Tickets (Quantity-based):**
```json
{
  "success": false,
  "error": "Failed to process webhook",
  "message": "No available tickets without table numbers found for user google-oauth2|user123"
}
```

#### **❌ Insufficient Tickets (Quantity-based):**
```json
{
  "success": false,
  "error": "Failed to process webhook", 
  "message": "Not enough available tickets: requested 5, found 2"
}
```

#### **❌ Table Not Found (Table-based):**
```json
{
  "success": false,
  "error": "Failed to process webhook",
  "message": "No tickets found for table 10 belonging to user google-oauth2|user123"
}
```

#### **❌ Invalid Payload:**
```json
{
  "success": false,
  "error": "Failed to process webhook",
  "message": "Invalid webhook payload: no valid quantity found in items"
}
```

---

## 📊 Response Schema

### **Success Response:**
```typescript
{
  success: true,
  message: string,
  userId: string,
  data: {
    orderId: string,
    tableNumber: number | null,
    ticketIds: number[],
    buyerAssigned: boolean,
    processedTickets: number
  }
}
```

### **Error Response:**
```typescript
{
  success: false,
  error: string,
  message: string
}
```

---

## 🧪 Testing Examples

### **Test Quantity-Based Selection:**
```bash
# Test with 1 ticket
curl -X POST "http://localhost:3000/api/webhooks/checkout/your-user-id" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "test_order_1",
      "items": [{"quantity": 1}],
      "customer": {"name": "Test User"},
      "meta": {}
    }
  }'

# Test with multiple tickets
curl -X POST "http://localhost:3000/api/webhooks/checkout/your-user-id" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "test_order_2", 
      "items": [{"quantity": 3}],
      "customer": {"name": "Test User"},
      "meta": {}
    }
  }'
```

### **Test Table-Based Selection:**
```bash
# Reserve entire table
curl -X POST "http://localhost:3000/api/webhooks/checkout/your-user-id" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "test_table_order",
      "items": [{"quantity": 1}],
      "customer": {"name": "Table Guest"},
      "meta": {
        "tableNumber": "2"
      }
    }
  }'
```

---

## 🔍 Key Differences from Previous Version

| Feature | Before | After |
|---------|--------|-------|
| **Ticket Selection** | Used `meta.ticketIds` array | Uses `items.quantity` sum or `meta.tableNumber` |
| **Selection Logic** | Specific ticket IDs | Smart quantity-based or table-based selection |
| **Table Handling** | Single ticket assignment | All tickets in table assigned |
| **Validation** | Individual ticket validation | Bulk selection with ownership validation |
| **Transactions** | Individual updates | Atomic transaction for all tickets |
| **Error Handling** | Ticket-specific errors | Selection-method-specific errors |

---

## 🚀 Production Deployment

The updated webhook is ready for production with:
- ✅ **Backward compatibility** maintained for payload structure
- ✅ **Enhanced security** with user and ownership validation
- ✅ **Atomic transactions** prevent partial updates
- ✅ **Comprehensive error handling** with detailed messages
- ✅ **Performance optimized** with single database queries
- ✅ **Extensive testing** with automated test suite

---

## 📝 Migration Notes

### **For Payment Providers:**
- ✅ **No changes required** to webhook payload structure
- ✅ **Enhanced behavior** for table reservations
- ✅ **Improved error messages** for debugging

### **For Developers:**
- ✅ Remove any dependencies on `meta.ticketIds`
- ✅ Ensure `items` array contains accurate `quantity` values
- ✅ Use `meta.tableNumber` for table-based reservations
- ✅ Update error handling for new error messages