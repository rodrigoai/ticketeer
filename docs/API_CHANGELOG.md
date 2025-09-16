# Ticketeer API Changelog

This document tracks all changes made to the Ticketeer API and its documentation.

## Version 1.2.0 - September 10, 2025

### ✨ Features Added
- **Ticket Search API**: Added new privacy-protected ticket search endpoint
  - New endpoint: `GET /events/:eventId/tickets/search`
  - Optional `available` query parameter for filtering
  - Privacy protection: excludes buyer information from results
  - Returns reduced dataset with only non-sensitive ticket data
  - Results sorted by identification number (ASC)
  - Supports authentication-based access control

### 📝 API Changes
- **GET** `/api/events/:eventId/tickets/search` - New privacy-protected search endpoint
  - Query parameter `available` (boolean, optional):
    - `true`: Returns only available tickets (no order + sales not ended)
    - `false` or omitted: Returns all tickets
  - Response excludes buyer information (buyer, buyerDocument, buyerEmail)
  - Maintains all other ticket fields including order field

### 🔒 Privacy & Security Features
- **Data Protection**: Automatic exclusion of sensitive buyer information
- **Authentication Required**: JWT token validation for all requests
- **Ownership Validation**: Users can only search tickets from their own events
- **Parameter Validation**: Proper validation with meaningful error messages

### 🗄️ Database Changes
- **Service Layer**: Added `searchTicketsByEvent` method in TicketService
- **Query Optimization**: Efficient filtering using Prisma select statements
- **Time-based Filtering**: Real-time comparison of sales end dates

### 📚 Documentation Updates
- Updated Postman collection to v1.2.0 with new search endpoint
- Added comprehensive examples for both available=true and available=false
- Documented privacy rules and parameter validation
- Added error response examples
- Enhanced collection description with search capabilities

### 🧪 Testing
- Created comprehensive test coverage for search functionality
- Verified privacy protection (no buyer data leaks)
- Tested availability filtering logic
- Validated parameter validation and error handling
- Confirmed authentication and authorization

---

## Version 1.1.0 - September 10, 2025

### ✨ Features Added
- **Sales End DateTime Field**: Added `salesEndDateTime` field to ticket model
  - Added to all ticket endpoints (create, update, get, list)
  - Included in both single and batch ticket operations
  - Optional field to control when ticket sales should end
  - Accepts ISO 8601 datetime format (e.g., "2025-11-30T23:59:59.000Z")

### 📝 API Changes
- **POST** `/api/events/:eventId/tickets` - Added `salesEndDateTime` field
- **POST** `/api/events/:eventId/tickets/batch` - Added `salesEndDateTime` field  
- **PUT** `/api/tickets/:id` - Added `salesEndDateTime` field
- **GET** `/api/events/:eventId/tickets` - Response includes `salesEndDateTime`
- **GET** `/api/tickets/:id` - Response includes `salesEndDateTime`

### 🗄️ Database Changes
- Added `salesEndDateTime` column to tickets table
- Created Prisma migration for salesEndDateTime field
- Updated Prisma client generation

### 🎨 Frontend Changes
- Added Sales End Date & Time input fields to ticket creation forms
- Added Sales End Date column to ticket display table
- Updated Vue.js components to handle datetime-local input type

### 📚 Documentation Updates
- Updated all ticket-related Postman examples to include `salesEndDateTime`
- Added salesEndDateTime to data model examples
- Updated API documentation with new field requirements
- Updated Postman collection to version 1.1.0
- Enhanced field descriptions with ISO 8601 format guidance

### 🧪 Testing
- Created comprehensive tests for salesEndDateTime functionality
- Verified database-level operations (create, read, update)
- Tested service layer integration
- Validated API endpoint behavior

---

## Version 1.0.1 - September 10, 2025

### ✨ Features Added
- **Buyer Email Field**: Added `buyerEmail` field to ticket model
  - Added to all ticket endpoints (create, update, get, list)
  - Included in both single and batch ticket operations
  - Optional field with email validation on frontend

### 📝 API Changes
- **POST** `/api/events/:eventId/tickets` - Added `buyerEmail` field
- **POST** `/api/events/:eventId/tickets/batch` - Added `buyerEmail` field  
- **PUT** `/api/tickets/:id` - Added `buyerEmail` field
- **GET** `/api/events/:eventId/tickets` - Response includes `buyerEmail`
- **GET** `/api/tickets/:id` - Response includes `buyerEmail`

### 🗄️ Database Changes
- Added `buyerEmail` column to tickets table
- Created Prisma migration `20250910173905_add_buyer_email_to_tickets`

### 📚 Documentation Updates
- Updated all ticket-related Postman examples to include `buyerEmail`
- Added buyerEmail to data model examples
- Updated API documentation with new field requirements

---

## Version 1.0.0 - September 10, 2025

### 🎉 Initial Release
- **Complete API Documentation**: Created comprehensive Postman collection
- **16 Total Endpoints**: Documented all current API endpoints
- **Authentication**: Auth0 JWT authentication system
- **Event Management**: Full CRUD operations for events
- **Ticket Management**: Full CRUD operations with batch support

### 📋 Endpoints Documented

#### Health & Test Endpoints (3)
- `GET /api/health` - Server health check
- `GET /api/test/simple` - Basic connectivity test  
- `GET /api/test/protected` - JWT authentication test

#### Event Management (5)
- `GET /api/events` - List all user events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

#### Ticket Management (8)
- `GET /api/events/:eventId/tickets` - List event tickets
- `GET /api/events/:eventId/tickets/stats` - Get ticket statistics
- `POST /api/events/:eventId/tickets` - Create single ticket
- `POST /api/events/:eventId/tickets/batch` - Create batch tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete single ticket
- `DELETE /api/tickets/batch` - Delete multiple tickets

### 🔐 Security Features
- Auth0 JWT Bearer token authentication
- Protected routes with proper error handling
- User ownership validation for all resources

### 🧪 Testing Features
- Automated test scripts for all endpoints
- Pre-request scripts for setup validation
- Environment variables for portability
- Comprehensive response examples

### 📖 Documentation Features
- Complete request/response examples
- Field validation documentation
- Error response examples
- Maintenance guidelines
- Version tracking system
- Troubleshooting guide

---

## How to Update This Changelog

When making API changes, always update this changelog with:

1. **Version number** (increment based on change type)
2. **Date** of the change
3. **Type of change**:
   - ✨ **Features Added** - New functionality
   - 🔄 **Changes Made** - Modified existing functionality  
   - 🐛 **Bugs Fixed** - Bug fixes
   - 🗄️ **Database Changes** - Schema modifications
   - 📝 **API Changes** - Endpoint modifications
   - 📚 **Documentation Updates** - Doc improvements
   - ⚠️ **Breaking Changes** - Backward incompatible changes

4. **Detailed description** of what changed
5. **Impact on API consumers** (if any)

### Version Numbering

Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes that require API consumers to modify their code
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes and small improvements that don't affect API contract

### Template for New Entries

```markdown
## Version X.Y.Z - Month DD, YYYY

### ✨ Features Added
- Description of new features

### 🔄 Changes Made  
- Description of modifications

### 🐛 Bugs Fixed
- Description of bug fixes

### 📝 API Changes
- List specific endpoint changes

### 🗄️ Database Changes
- List schema modifications

### 📚 Documentation Updates
- List documentation improvements

### ⚠️ Breaking Changes
- List any breaking changes (if MAJOR version)
```
