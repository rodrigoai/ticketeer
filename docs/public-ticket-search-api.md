# Public Ticket Search API Documentation

## Overview

The Public Ticket Search API provides a **public endpoint** (no authentication required) that allows external systems to search for tickets by providing both `userId` and `eventId` parameters. This endpoint maintains privacy protection by excluding all buyer information from the response.

## Endpoint Details

### 🌐 **Endpoint URL**
```
GET /api/public/tickets/search
```

### 🔓 **Authentication**
- **No authentication required** - This is a public endpoint
- **User validation** is performed against the database using the provided `userId`

## Parameters

### 📋 **Required Query Parameters**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `userId` | string | The user ID that owns the event and tickets | `google-oauth2\|user123` |
| `eventId` | integer | The ID of the event to search tickets for | `5` |

### 🔧 **Optional Query Parameters**

| Parameter | Type | Description | Default | Values |
|-----------|------|-------------|---------|--------|
| `available` | string | Filter to show only available tickets | `false` | `"true"`, `"false"` |

## Request Examples

### ✅ **Basic Search - All Tickets**
```bash
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=google-oauth2%7Cuser123&eventId=5"
```

### 🎯 **Search Available Tickets Only**
```bash
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=google-oauth2%7Cuser123&eventId=5&available=true"
```

### 📊 **Search All Tickets (Explicit)**
```bash
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=google-oauth2%7Cuser123&eventId=5&available=false"
```

### 🚀 **Production Example**
```bash
curl -X GET "https://ticketeer.vercel.app/api/public/tickets/search?userId=auth0%7C123456789&eventId=42&available=true" \
  -H "Accept: application/json"
```

## Response Format

### ✅ **Success Response**
```json
{
  "success": true,
  "tickets": [
    {
      "id": 15,
      "eventId": 5,
      "description": "General Admission",
      "identificationNumber": 1,
      "location": "Main Floor",
      "table": null,
      "price": 25.00,
      "order": null,
      "salesEndDateTime": "2024-12-31T23:59:59.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 16,
      "eventId": 5,
      "description": "VIP Section",
      "identificationNumber": 2,
      "location": "VIP Area",
      "table": 3,
      "price": 75.50,
      "order": "order_abc123",
      "salesEndDateTime": null,
      "created_at": "2024-01-15T10:31:00.000Z",
      "updated_at": "2024-01-15T14:20:00.000Z"
    }
  ],
  "count": 2,
  "eventId": 5,
  "userId": "google-oauth2|user123",
  "filter": {
    "available": false
  }
}
```

## Privacy Protection

### 🔒 **Excluded Fields**
The following buyer information fields are **automatically excluded** for privacy protection:
- `buyer` - Customer name
- `buyerDocument` - Customer identification document
- `buyerEmail` - Customer email address

### ✅ **Included Fields**
All other ticket information remains accessible:
- Basic ticket info: `id`, `eventId`, `description`, `identificationNumber`
- Location info: `location`, `table`  
- Pricing: `price`
- Status: `order` (indicates if sold, but not to whom)
- Timing: `salesEndDateTime`
- Metadata: `created_at`, `updated_at`

## Error Responses

### ❌ **Missing userId Parameter**
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "userId parameter is required"
}
```

### ❌ **Missing eventId Parameter**
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "eventId parameter is required"
}
```

### ❌ **Invalid eventId (Not a Number)**
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "eventId must be a valid number"
}
```

### ❌ **Invalid Available Parameter**
**Status Code:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Available parameter must be \"true\" or \"false\""
}
```

### ❌ **User Not Found**
**Status Code:** `404 Not Found`
```json
{
  "success": false,
  "error": "User not found",
  "message": "User with ID 'invalid-user' does not exist or has no events"
}
```

### ❌ **Event Not Found or Access Denied**
**Status Code:** `404 Not Found`
```json
{
  "success": false,
  "error": "Event not found",
  "message": "Event not found or does not belong to user 'google-oauth2|user123'"
}
```

### ❌ **Internal Server Error**
**Status Code:** `500 Internal Server Error`
```json
{
  "success": false,
  "error": "Failed to search tickets",
  "message": "Database connection error"
}
```

## Filtering Logic

### 🎯 **Available Tickets (`available=true`)**
Returns tickets that meet **ALL** of the following criteria:
1. **No Order Assigned**: `order` field is `null` or empty string
2. **Sales Still Open**: `salesEndDateTime` is either:
   - `null` (no end date set)
   - A future date/time (sales haven't ended yet)

### 📋 **All Tickets (`available=false` or omitted)**
Returns **all tickets** for the specified event and user, regardless of:
- Order status (sold or unsold)
- Sales end date (past or future)

## Sorting

### 📊 **Default Sort Order**
All tickets are returned sorted by **`identificationNumber`** in **ascending order** (lowest to highest).

This ensures consistent, predictable ordering that matches the ticket creation sequence.

## URL Encoding

### 🔗 **Special Characters in userId**
When the `userId` contains special characters (like `|` in Auth0 IDs), ensure proper URL encoding:

**❌ Incorrect:**
```bash
curl "http://localhost:3000/api/public/tickets/search?userId=google-oauth2|user123&eventId=5"
```

**✅ Correct:**
```bash
curl "http://localhost:3000/api/public/tickets/search?userId=google-oauth2%7Cuser123&eventId=5"
```

**Encoding Reference:**
- `|` becomes `%7C`
- `@` becomes `%40`  
- `+` becomes `%2B`
- ` ` (space) becomes `%20`

## Testing Examples

### 🧪 **Local Development Testing**

#### Test 1: Basic Functionality
```bash
# Replace 'your-user-id' with actual user ID from your database
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=your-user-id&eventId=1" \
  -H "Content-Type: application/json" | jq '.'
```

#### Test 2: Available Tickets Only
```bash
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=your-user-id&eventId=1&available=true" \
  -H "Content-Type: application/json" | jq '.count'
```

#### Test 3: Parameter Validation
```bash
# This should return a 400 error
curl -X GET "http://localhost:3000/api/public/tickets/search?eventId=1" \
  -H "Content-Type: application/json" | jq '.error'
```

#### Test 4: User Not Found
```bash
# This should return a 404 error
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=nonexistent&eventId=1" \
  -H "Content-Type: application/json" | jq '.error'
```

### 📈 **Performance Testing**
```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s \
  "http://localhost:3000/api/public/tickets/search?userId=your-user-id&eventId=1"
```

**Create `curl-format.txt`:**
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

## Integration Examples

### 🌐 **JavaScript/Node.js**
```javascript
async function searchTickets(userId, eventId, availableOnly = false) {
  const params = new URLSearchParams({
    userId: userId,
    eventId: eventId.toString(),
    ...(availableOnly && { available: 'true' })
  });
  
  const response = await fetch(`/api/public/tickets/search?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.message}`);
  }
  
  return await response.json();
}

// Usage
try {
  const result = await searchTickets('google-oauth2|user123', 5, true);
  console.log(`Found ${result.count} available tickets`);
} catch (error) {
  console.error('Search failed:', error.message);
}
```

### 🐍 **Python**
```python
import requests
import urllib.parse

def search_tickets(user_id, event_id, available_only=False):
    base_url = "http://localhost:3000/api/public/tickets/search"
    
    params = {
        'userId': user_id,
        'eventId': str(event_id)
    }
    
    if available_only:
        params['available'] = 'true'
    
    response = requests.get(base_url, params=params)
    
    if response.status_code == 404:
        raise ValueError("User or event not found")
    elif response.status_code != 200:
        error_data = response.json()
        raise RuntimeError(f"API Error: {error_data.get('message', 'Unknown error')}")
    
    return response.json()

# Usage
try:
    result = search_tickets('google-oauth2|user123', 5, available_only=True)
    print(f"Found {result['count']} available tickets")
except Exception as e:
    print(f"Search failed: {e}")
```

### 📱 **React/Frontend**
```jsx
import { useState, useEffect } from 'react';

function TicketSearch({ userId, eventId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          userId,
          eventId: eventId.toString(),
          available: availableOnly.toString()
        });
        
        const response = await fetch(`/api/public/tickets/search?${params}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message);
        }
        
        setTickets(data.tickets);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (userId && eventId) {
      fetchTickets();
    }
  }, [userId, eventId, availableOnly]);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => setAvailableOnly(e.target.checked)}
        />
        Show only available tickets
      </label>
      
      {loading && <p>Loading tickets...</p>}
      {error && <p>Error: {error}</p>}
      {tickets && (
        <p>Found {tickets.length} tickets</p>
      )}
    </div>
  );
}
```

## Migration from Protected Endpoint

### 🔄 **Key Changes**
If migrating from the protected `/api/events/:eventId/tickets/search` endpoint:

**Before (Protected):**
```bash
curl -X GET "http://localhost:3000/api/events/5/tickets/search?available=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**After (Public):**
```bash
curl -X GET "http://localhost:3000/api/public/tickets/search?userId=your-user-id&eventId=5&available=true"
```

### 📝 **Migration Checklist**
- ✅ Remove JWT token/authentication headers
- ✅ Change endpoint URL from `/api/events/:eventId/tickets/search` to `/api/public/tickets/search`  
- ✅ Move `eventId` from path parameter to query parameter
- ✅ Add `userId` as required query parameter
- ✅ Update error handling for new 404 scenarios (user not found)
- ✅ Verify privacy protection (no buyer info in responses)

## Security Considerations

### 🔐 **Access Control**
- **User Validation**: The `userId` must exist in the database and have created events
- **Event Ownership**: Only tickets from events owned by the specified `userId` are returned
- **Cross-User Protection**: Users cannot access tickets from other users' events

### 🛡️ **Data Protection**
- **Privacy First**: All buyer information is automatically excluded from responses
- **Read-Only**: This endpoint only allows data retrieval, no modifications
- **Input Validation**: All parameters are validated before database queries

### ⚡ **Rate Limiting Recommendations**
For production use, consider implementing rate limiting:
```javascript
// Example using express-rate-limit
const rateLimit = require('express-rate-limit');

const publicSearchLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many search requests, please try again later'
});

app.get('/api/public/tickets/search', publicSearchLimit, /* handler */);
```