# Confirmation Hash Feature

## Overview

The confirmation hash feature allows event organizers to generate secure, shareable links for buyers to confirm their ticket information. This feature was added to enhance the user experience of the buyer confirmation process.

## How It Works

1. **Event organizers** can view their tickets in the Event Detail page
2. For tickets with an assigned **Order ID**, a **confirmation link button** appears
3. Clicking the link opens the buyer confirmation page where customers can fill in their information
4. The link uses a **secure hash** instead of exposing the order ID directly

## Technical Implementation

### Frontend Changes

**File: `/src/views/EventDetail.vue`**

- Added `getCachedConfirmationUrl()` method for generating confirmation URLs
- Implemented caching to avoid repeated API calls
- Added confirmation link button in the tickets table

### Backend Changes

**File: `/server.js`**

- Added new API endpoint: `GET /api/orders/:orderId/confirmation-hash`
- Endpoint is protected with JWT authentication
- Only event owners can get confirmation hashes for their orders

**File: `/services/orderService.js`**

- Added `getConfirmationHashByOrderId()` method
- Includes user permission checks
- Uses existing hash generation utilities

## API Usage

### Get Confirmation Hash

```bash
GET /api/orders/{orderId}/confirmation-hash
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "hash": "abc123def456...",
  "orderId": "ORDER123"
}
```

### Error Responses

- `400 Bad Request`: Invalid order ID format
- `403 Forbidden`: User doesn't have permission to access this order
- `404 Not Found`: Order not found
- `500 Internal Server Error`: Server error

## Security Features

1. **Authentication Required**: Only authenticated users can generate hashes
2. **Authorization Check**: Users can only get hashes for orders from events they created
3. **Hash-based Access**: Buyer confirmation page uses secure hash, not order ID
4. **No Sensitive Data**: Confirmation URLs don't expose internal IDs

## User Interface

### Event Detail Page

- **Order Column**: Shows order ID as a badge with confirmation link button
- **Confirmation Link**: Green button with external link icon
- **Tooltip**: "Open confirmation page"
- **Target**: Opens in new tab/window

### Caching Strategy

- **Client-side caching**: Avoids repeated API calls for same order
- **Fallback URLs**: Uses base64-encoded order ID while API call is pending
- **Reactive updates**: URL updates automatically when proper hash is retrieved

## Testing

Use the provided test script:

```bash
node test-confirmation-api.js <order-id> <auth-token>
```

**Example:**
```bash
node test-confirmation-api.js "ORDER123" "eyJhbGciOiJSUzI1NiIs..."
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Uses Vue 3 composition API
- Requires JavaScript enabled

## Future Enhancements

1. **Batch Hash Generation**: Generate hashes for multiple orders at once
2. **Hash Expiration**: Add time-limited access to confirmation links
3. **Custom URLs**: Allow custom confirmation page URLs
4. **Email Integration**: Automatically send confirmation links via email
5. **Analytics**: Track confirmation link usage and completion rates

## Related Files

- `/src/views/EventDetail.vue` - Main event management interface
- `/services/orderService.js` - Order management business logic
- `/utils/orderHash.js` - Hash generation utilities
- `/public/confirmation.html` - Buyer confirmation page
- `/public/confirmation.js` - Buyer confirmation logic
- `/public/confirmation.css` - Buyer confirmation styles

## Support

For technical support or questions about this feature, refer to the main project documentation or contact the development team.