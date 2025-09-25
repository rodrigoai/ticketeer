# Webhook API Examples

## Updated Public Checkout Webhook Endpoint

The checkout webhook has been updated to be a public API with userId parameter validation.

### Endpoint
```
POST /api/webhooks/checkout/:userId
```

### Security Requirements
- ✅ **No authentication required** (public API)
- ✅ **userId validation**: Must be a valid user with events in the database
- ✅ **Ticket ownership validation**: Tickets must belong to events owned by the specified userId
- ✅ **Returns 404** if userId doesn't exist or has no events

## Example Requests

### ✅ Valid Request - Success Case
```bash
curl -X POST "http://localhost:3000/api/webhooks/checkout/google-oauth2|105839926261154439781" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "order_12345",
      "customer": {
        "name": "John Doe",
        "email": "john@example.com",
        "identification": "12345678901"
      },
      "meta": {
        "tickets": "[1]",
        "tableNumber": "5"
      }
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 1 ticket(s)",
  "userId": "google-oauth2|105839926261154439781",
  "data": {
    "orderId": "order_12345",
    "tableNumber": 5,
    "ticketIds": [1],
    "buyerAssigned": true,
    "processedTickets": 1
  }
}
```

### ❌ Invalid userId - 404 Error
```bash
curl -X POST "http://localhost:3000/api/webhooks/checkout/invalidUser" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "order_12345",
      "meta": {
        "tickets": "[1]"
      }
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "User not found",
  "message": "User with ID 'invalidUser' does not exist or has no events"
}
```

### ❌ Wrong User's Tickets - Ownership Validation Error
```bash
curl -X POST "http://localhost:3000/api/webhooks/checkout/google-oauth2|114992913809995347976" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "order_12345",
      "meta": {
        "tickets": "[1]"
      }
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Failed to process webhook",
  "message": "Tickets do not belong to user google-oauth2|114992913809995347976: 1"
}
```

### ❌ Non-existent Tickets - Ticket Not Found Error
```bash
curl -X POST "http://localhost:3000/api/webhooks/checkout/google-oauth2|105839926261154439781" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.paid",
    "payload": {
      "id": "order_12345",
      "meta": {
        "tickets": "[999]"
      }
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Failed to process webhook",
  "message": "Tickets not found: 999"
}
```

## Test Results Summary

✅ **All Security Tests Passed:**
1. ✅ Valid userId processes webhook successfully
2. ✅ Invalid userId returns 404 with appropriate error message
3. ✅ Missing userId returns 404 (route not found)
4. ✅ Cross-user ticket validation prevents unauthorized access
5. ✅ Non-existent ticket validation works correctly

## Changes Made

### API Endpoint Changes
- **Before**: `POST /api/webhooks/checkout` (no authentication middleware, but no user validation)
- **After**: `POST /api/webhooks/checkout/:userId` (public API with userId validation)

### Security Enhancements
- ✅ **User validation**: Checks if userId exists in database by finding events
- ✅ **Ticket ownership**: Validates that all tickets belong to events owned by the specified user
- ✅ **Proper error handling**: Returns appropriate HTTP status codes and error messages

### Service Layer Updates
- Updated `processCheckoutWebhook()` to accept `userId` parameter
- Added ticket ownership validation in the service
- Fixed Prisma query structure (removed conflicting `select` and `include`)

## Production Deployment

The webhook endpoint is now ready for production use with:
- ✅ Public access (no authentication required)
- ✅ Secure user and ticket validation
- ✅ Proper error handling and logging
- ✅ Maintained backward compatibility for payload structure