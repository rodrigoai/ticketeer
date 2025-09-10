# Ticketeer API Documentation

This directory contains comprehensive API documentation for the Ticketeer ticket sales management system.

## 📋 Files Overview

- **`ticketeer-api.postman_collection.json`** - Complete Postman collection with all API endpoints
- **`API_DOCUMENTATION.md`** - This file with usage instructions and maintenance guidelines
- **`API_CHANGELOG.md`** - Version history and change tracking for the API

## 🚀 Quick Start

### 1. Import the Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **Upload Files** tab
4. Choose `ticketeer-api.postman_collection.json`
5. Click **Import**

### 2. Set Up Environment Variables

The collection uses the following variables:

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `baseUrl` | API base URL | `http://localhost:3000` | ✅ |
| `auth_token` | Auth0 JWT Bearer token | `{{AUTH0_JWT_TOKEN}}` | ✅ (for protected routes) |

**To set variables:**
1. Click the collection name in Postman
2. Go to **Variables** tab
3. Set the `Current value` for each variable

### 3. Get Auth0 JWT Token

Most endpoints require Auth0 authentication. To get a token:

1. **Option 1: Via Auth0 Dashboard**
   - Go to your Auth0 Dashboard
   - Navigate to Applications → APIs → Test
   - Copy the JWT token

2. **Option 2: Via Frontend Login**
   - Start the Ticketeer app: `yarn dev`
   - Navigate to `http://localhost:3000`
   - Login with your Auth0 account
   - Extract JWT from browser developer tools

3. **Option 3: Use the Test Endpoint**
   - Use the "Protected Test (Auth Required)" endpoint
   - This will validate your token is working

## 📚 API Endpoints Overview

### Health & Test Endpoints (3 endpoints)
- **GET** `/api/health` - Server health check (public)
- **GET** `/api/test/simple` - Basic connectivity test (public)
- **GET** `/api/test/protected` - JWT authentication test (protected)

### Event Management (5 endpoints)
- **GET** `/api/events` - List all user events (protected)
- **GET** `/api/events/:id` - Get event by ID (protected)
- **POST** `/api/events` - Create new event (protected)
- **PUT** `/api/events/:id` - Update event (protected)
- **DELETE** `/api/events/:id` - Delete event (protected)

### Ticket Management (8 endpoints)
- **GET** `/api/events/:eventId/tickets` - List event tickets (protected)
- **GET** `/api/events/:eventId/tickets/stats` - Get ticket statistics (protected)
- **POST** `/api/events/:eventId/tickets` - Create single ticket (protected)
- **POST** `/api/events/:eventId/tickets/batch` - Create batch tickets (protected)
- **GET** `/api/tickets/:id` - Get ticket by ID (protected)
- **PUT** `/api/tickets/:id` - Update ticket (protected)
- **DELETE** `/api/tickets/:id` - Delete single ticket (protected)
- **DELETE** `/api/tickets/batch` - Delete multiple tickets (protected)

## 🔐 Authentication

The API uses Auth0 JWT Bearer token authentication:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...
```

**Auth0 Configuration:**
- **Domain:** `novamoney.us.auth0.com`
- **Audience:** `https://ticket.nova.money`

## 📊 Data Models

### Event Model
```json
{
  "id": 1,
  "title": "Summer Concert 2025",
  "name": "Summer Concert 2025",
  "description": "Annual summer concert featuring local artists",
  "date": "2025-07-15T19:00:00.000Z",
  "opening_datetime": "2025-07-15T19:00:00.000Z",
  "closing_datetime": "2025-07-15T23:00:00.000Z",
  "venue": "Central Park Amphitheater",
  "status": "active",
  "created_by": "auth0|123456789",
  "created_at": "2025-09-10T18:30:00.000Z",
  "updated_at": "2025-09-10T18:30:00.000Z"
}
```

### Ticket Model
```json
{
  "id": 1,
  "eventId": 1,
  "description": "VIP Ticket",
  "identificationNumber": 1,
  "location": "VIP Section",
  "table": 1,
  "price": 75.50,
  "order": "VIP-001",
  "buyer": "Jane Smith",
  "buyerDocument": "987654321",
  "buyerEmail": "jane.smith@example.com",
  "created_at": "2025-09-10T18:30:00.000Z",
  "updated_at": "2025-09-10T18:30:00.000Z"
}
```

### Statistics Model
```json
{
  "totalTickets": 10,
  "totalRevenue": 250.00,
  "averagePrice": 25.00,
  "minPrice": 15.00,
  "maxPrice": 50.00
}
```

## 🧪 Testing with Postman

### Automated Tests
Each request includes automated tests that validate:
- ✅ Status code is successful (200 or 201)
- ✅ Response has JSON content type
- ✅ Response has success field
- ✅ Error logging for failed requests

### Pre-request Scripts
- Automatically sets base URL if not configured
- Warns about missing authentication for protected routes
- Provides helpful setup guidance

### Running the Collection
1. **Individual Requests:** Click any request and hit Send
2. **Folder Testing:** Right-click a folder → Run collection
3. **Full Collection:** Collection → Run → Run Ticketeer API Collection

## 🔄 Maintaining Documentation

### When to Update

**⚠️ IMPORTANT:** Update the API documentation whenever you make changes to:

1. **New Endpoints:** Add new API routes
2. **Modified Endpoints:** Change request/response structure  
3. **Authentication Changes:** Update Auth0 configuration
4. **Data Model Changes:** Modify database schemas
5. **Validation Rules:** Change field requirements
6. **Error Responses:** Update error handling

### How to Update

#### 1. Update the Postman Collection

**For New Endpoints:**
```json
{
  "name": "New Endpoint Name",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{auth_token}}",
        "type": "text"
      },
      {
        "key": "Content-Type", 
        "value": "application/json",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"field\": \"value\"\n}",
      "options": {
        "raw": {
          "language": "json"
        }
      }
    },
    "url": {
      "raw": "{{baseUrl}}/api/new-endpoint",
      "host": ["{{baseUrl}}"],
      "path": ["api", "new-endpoint"]
    },
    "description": "Detailed description of what this endpoint does."
  },
  "response": [
    {
      "name": "Success Response",
      "status": "Created",
      "code": 201,
      "header": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": "{\n  \"success\": true,\n  \"data\": {...}\n}"
    }
  ]
}
```

**For Modified Endpoints:**
1. Update request body examples
2. Update response examples  
3. Update field descriptions
4. Add new validation error examples
5. Update parameter descriptions

#### 2. Version Control

Always update the version number in the collection info:

```json
{
  "info": {
    "name": "Ticketeer API Collection",
    "version": "1.1.0",  // Increment version
    "description": "Updated description with new features..."
  }
}
```

#### 3. Update Documentation

**Update this README file:**
- Add new endpoints to the overview table
- Update data models if schemas changed
- Add new authentication requirements
- Update environment variables if needed

**Update inline descriptions:**
- Keep endpoint descriptions current
- Update field requirements
- Update validation rules
- Update error response examples

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-09-10 | Initial API documentation with all endpoints |
| 1.0.1 | 2025-09-10 | Added buyerEmail field to ticket endpoints |

### Validation Checklist

Before finalizing documentation updates:

- [ ] All endpoints have working examples
- [ ] Authentication is properly documented
- [ ] Request/response examples match actual API behavior
- [ ] Field requirements are accurate
- [ ] Error responses are documented
- [ ] Variables are properly referenced
- [ ] Collection runs without errors
- [ ] Version number is incremented
- [ ] Change log is updated

## 🐛 Troubleshooting

### Common Issues

**1. "Unauthorized" responses**
- Check that `auth_token` variable is set with a valid JWT
- Ensure token is not expired
- Verify Auth0 configuration matches

**2. "Cannot connect" errors**
- Verify server is running: `yarn dev`
- Check `baseUrl` variable is correct
- Confirm port 3000 is not blocked

**3. "Validation failed" errors**
- Check required fields are included
- Verify data types match API expectations
- Review field validation rules in API code

**4. Collection won't import**
- Ensure JSON is valid (check for syntax errors)
- Use latest version of Postman
- Try importing via URL if file import fails

### Getting Help

1. Check server logs for detailed error messages
2. Use Postman Console (View → Show Postman Console) for debugging
3. Test individual endpoints before running full collection
4. Verify database is properly seeded if needed

## 📈 Best Practices

### For API Development
1. **Always update documentation** when changing endpoints
2. **Include comprehensive examples** for all use cases
3. **Document error responses** with proper HTTP status codes
4. **Use consistent naming conventions** across endpoints
5. **Validate request/response examples** against actual API

### For API Testing
1. **Test authentication flows** first
2. **Use variables** instead of hardcoded values
3. **Create test data systematically** (events before tickets)
4. **Clean up test data** after testing if needed
5. **Save successful responses** as examples for future reference

---

## 📝 Notes

- This documentation follows the Postman Collection Format v2.1.0
- All examples use realistic but fictional data
- The collection includes automated testing scripts
- Environment variables make the collection portable across environments
- Response examples reflect the actual API behavior

**Last Updated:** September 10, 2025  
**Next Review:** When API changes are made
