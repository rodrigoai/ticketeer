# Ticketeer Public APIs - Postman Documentation

This document provides comprehensive instructions for using the Postman collection to test and interact with Ticketeer's public APIs.

## 📋 Overview

The `postman-public-apis.json` file contains a complete Postman collection documenting all public endpoints of the Ticketeer application. These endpoints do not require authentication and are designed for:

- **Public integration** - Third-party services can consume ticket data
- **Webhook processing** - Payment systems can send order confirmations
- **Health monitoring** - System status and health checks
- **Public ticket searches** - Browse available tickets without authentication

## 🚀 Getting Started

### Import the Collection

1. **Open Postman** (download from [postman.com](https://www.postman.com/downloads/) if needed)
2. **Import Collection**:
   - Click "Import" button in Postman
   - Select "File" tab
   - Choose `postman-public-apis.json` from your project directory
   - Click "Import"

### Environment Variables

The collection includes pre-configured variables:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `https://ticketeer.vercel.app` | Production API URL |
| `local_url` | `http://localhost:3000` | Local development URL |
| `sample_user_id` | `auth0|sample_user_123` | Sample user ID for testing |
| `sample_event_id` | `1` | Sample event ID for testing |

### Configure for Your Environment

**For Production Testing:**
- Use the default `base_url` variable
- Update `sample_user_id` with a real user ID
- Update `sample_event_id` with a real event ID

**For Local Development:**
- Change `base_url` to `{{local_url}}`
- Ensure your local server is running on port 3000
- Update user and event IDs with local test data

## 📁 Collection Structure

### 1. Health & Status
Monitor system health and basic functionality:

#### Health Check
- **Endpoint**: `GET /api/health`
- **Purpose**: Verify server status and authentication configuration
- **Response**: Server status, timestamp, and Auth0 configuration
- **Use Case**: System monitoring, uptime checks

#### Simple Test Endpoint
- **Endpoint**: `GET /api/test/simple`
- **Purpose**: Basic API functionality verification
- **Response**: Success confirmation with timestamp
- **Use Case**: API connectivity testing

### 2. Public Ticket Search
Search and retrieve ticket information without authentication:

#### Search Available Tickets
- **Endpoint**: `GET /api/public/tickets/search`
- **Parameters**:
  - `userId` (required): User who owns the event
  - `eventId` (required): Event ID to search
  - `available=true`: Filter for available tickets only
- **Purpose**: Find tickets available for purchase
- **Privacy**: Buyer information is protected

#### Search All Tickets
- **Endpoint**: `GET /api/public/tickets/search`
- **Parameters**:
  - `userId` (required): User who owns the event
  - `eventId` (required): Event ID to search
  - `available=false`: Show all tickets regardless of status
- **Purpose**: View complete ticket inventory
- **Privacy**: Buyer information is still protected

#### Search with Default Filter
- **Endpoint**: `GET /api/public/tickets/search`
- **Parameters**: Only `userId` and `eventId`
- **Purpose**: Default search behavior (shows all tickets)

### 3. Webhooks
Process external payment and order confirmations:

#### Checkout Webhook - Single Ticket Purchase
- **Endpoint**: `POST /api/webhooks/checkout/{userId}`
- **Purpose**: Process single ticket purchase with selective buyer assignment
- **Event Type**: `order.paid`
- **NEW BEHAVIOR**: Single ticket gets both order field and buyer information
- **Example**: 1 ticket purchased → 1 ticket updated with full buyer details

#### Checkout Webhook - Multi-Ticket Purchase  
- **Endpoint**: `POST /api/webhooks/checkout/{userId}`
- **Purpose**: Process multiple ticket purchase with selective buyer assignment
- **Event Type**: `order.paid`
- **NEW BEHAVIOR**: All tickets get order field, ONLY first ticket gets buyer information
- **Example**: 3 tickets purchased → 3 tickets get order, 1st ticket gets buyer details

#### Checkout Webhook - Table Purchase
- **Endpoint**: `POST /api/webhooks/checkout/{userId}`
- **Purpose**: Process table purchase with selective buyer assignment  
- **Event Type**: `order.paid`
- **NEW BEHAVIOR**: All table tickets get order field, ONLY first ticket (by identificationNumber) gets buyer information
- **Example**: Table with 4 tickets → 4 tickets get order, 1st ticket gets buyer details

#### Checkout Webhook - Other Events
- **Endpoint**: `POST /api/webhooks/checkout/{userId}`
- **Purpose**: Acknowledge other webhook events gracefully
- **Behavior**: Acknowledges but doesn't process non-`order.paid` events

## 🧪 Testing Guidelines

### Pre-Request Scripts
The collection includes global pre-request scripts that:
- Validate environment variables
- Log request details for debugging
- Set timestamps for tracking

### Test Scripts
Automated tests verify:
- Response status codes
- Response structure and data types
- Required fields presence
- Business logic validation

### Running Tests

**Individual Request Testing:**
1. Select any request from the collection
2. Update variables if needed
3. Click "Send"
4. Review response and test results

**Collection Testing:**
1. Right-click on "Ticketeer Public APIs" collection
2. Select "Run collection"
3. Choose specific requests or run all
4. Configure iterations and delays if needed
5. Click "Start Test"

## 📊 Response Examples

### Successful Ticket Search
```json
{
  "success": true,
  "tickets": [
    {
      "id": 1,
      "eventId": 1,
      "description": "VIP Section Ticket",
      "identificationNumber": "T001",
      "location": "Section A",
      "table": 5,
      "price": 150.00,
      "order": null,
      "salesEndDateTime": "2024-12-31T23:59:59.000Z",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 1,
  "eventId": 1,
  "userId": "auth0|sample_user_123",
  "filter": {
    "available": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "User not found",
  "message": "User with ID 'nonexistent_user' does not exist or has no events"
}
```

### Webhook Success Response - Single Ticket
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-SINGLE-001 assigned to 1 tickets with 1 tickets updated.",
  "userId": "auth0|sample_user_123",
  "orderId": "ORDER-SINGLE-001",
  "tableNumber": null,
  "ticketIds": [1],
  "buyerAssigned": "Alice Johnson",
  "processedTickets": 1
}
```

### Webhook Success Response - Multi-Ticket Purchase
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-MULTI-002 assigned to 3 tickets with 3 tickets updated.",
  "userId": "auth0|sample_user_123",
  "orderId": "ORDER-MULTI-002",
  "tableNumber": null,
  "ticketIds": [2, 3, 4],
  "buyerAssigned": "Bob Martinez",
  "processedTickets": 3
}
```

### Webhook Success Response - Table Purchase
```json
{
  "success": true,
  "message": "Checkout webhook processed successfully. Order ORDER-TABLE-003 assigned to table 7 with 4 tickets updated.",
  "userId": "auth0|sample_user_123",
  "orderId": "ORDER-TABLE-003",
  "tableNumber": 7,
  "ticketIds": [10, 11, 12, 13],
  "buyerAssigned": "Carol Davis",
  "processedTickets": 4
}
```

## 🔧 Customization

### Adding Custom Tests
You can add custom test scripts to any request:

```javascript
pm.test("Custom validation", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.tickets.length).to.be.at.least(0);
});
```

### Environment-Specific Variables
Create different environments in Postman:

1. **Production Environment**
   - `base_url`: `https://ticketeer.vercel.app`
   - Real user IDs and event IDs

2. **Staging Environment**
   - `base_url`: `https://ticketeer-staging.vercel.app`
   - Test user IDs and event IDs

3. **Local Development**
   - `base_url`: `http://localhost:3000`
   - Local test data

## 🚨 Important Notes

### Privacy and Security
- Public endpoints don't expose sensitive buyer information
- User validation ensures data belongs to existing users
- Webhook endpoints validate user existence before processing

### ⚠️ NEW: Selective Buyer Assignment (Updated Behavior)
- **All tickets** in a purchase receive the `order` field with the order ID
- **Only the first ticket** (sorted by `identificationNumber` ascending) receives buyer information (`buyer`, `buyerDocument`, `buyerEmail`)
- **Subsequent tickets** in the same purchase get only the `order` field, with buyer fields remaining `null`
- This applies to both quantity-based purchases and table-based purchases
- The "first ticket" is determined by the lowest `identificationNumber` in the selected set

### Rate Limiting
- No rate limiting currently implemented
- Consider implementing rate limiting for production use
- Monitor API usage through server logs

### Error Handling
All endpoints return consistent error formats:
```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error description"
}
```

### Data Validation
- User IDs must exist in the database
- Event IDs must be numeric and belong to the specified user
- Webhook payloads are validated for required fields

## 🔍 Troubleshooting

### Common Issues

**404 User Not Found**
- Verify the user ID exists in the system
- Check if user has created any events
- Ensure user ID format is correct (e.g., `auth0|username`)

**404 Event Not Found**
- Confirm event ID is numeric
- Verify event belongs to the specified user
- Check if event exists in the database

**400 Bad Request**
- Review required parameters (`userId`, `eventId`)
- Validate parameter formats and values
- Check request body structure for webhooks

**500 Internal Server Error**
- Check server logs for detailed error information
- Verify database connectivity
- Ensure all required services are running

### Debug Mode
Enable request/response logging:
1. Open Postman Console (View > Show Postman Console)
2. Run requests to see detailed logs
3. Check console output for debugging information

## 📞 Support

For additional support:

1. **Check Server Logs**: Review application logs for detailed error information
2. **Validate Data**: Ensure test data (users, events) exists in your database
3. **Environment**: Verify you're testing against the correct environment
4. **API Documentation**: Refer to the main API documentation for endpoint specifications

## 🔄 Updates

This Postman collection should be updated when:
- New public endpoints are added
- Existing endpoints change structure
- Response formats are modified
- New webhook events are supported

To update:
1. Export the updated collection from Postman
2. Replace `postman-public-apis.json` with the new version
3. Update this README with new endpoint documentation
4. Commit changes to version control

---

**Last Updated**: January 15, 2024  
**Collection Version**: 1.0.0  
**Compatible with**: Ticketeer API v1.0+