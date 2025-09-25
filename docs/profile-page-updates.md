# Profile Page Updates - User ID Display

## Overview

The Profile page has been enhanced to prominently display the **User ID** and **Webhook URL**, making it easy for users to access their unique identifiers and configure webhooks.

## New Features Added

### 1. **User ID Display in Header**
- Added User ID badge next to email in the profile header
- Includes copy button for quick copying
- Uses monospace font for better readability

### 2. **Dedicated User Identity & Webhook Configuration Card**
- **User ID Section:**
  - Large input field showing the full User ID
  - Copy button with clipboard functionality
  - Explanatory text about webhook usage

- **Webhook URL Section:**
  - Auto-generated webhook URL using current domain
  - Format: `{domain}/api/webhooks/checkout/{userId}`
  - Copy button for easy webhook configuration
  - Helpful description for payment integration

### 3. **Webhook Information Panel**
- Blue alert box explaining webhook functionality
- Security information about ticket validation
- Clear explanation of public endpoint behavior

### 4. **Enhanced User Experience**
- **Copy to Clipboard:** All copy buttons use the modern `navigator.clipboard` API
- **Visual Feedback:** Console logs when items are copied successfully
- **Responsive Design:** Works on mobile and desktop
- **Accessible:** Proper labels, titles, and keyboard navigation

## Technical Implementation

### Components Updated
- **File:** `src/views/Profile.vue`
- **Imports Added:** `computed` from Vue 3
- **New Computed Properties:**
  - `webhookUrl` - Dynamically generates webhook URL based on current domain and user ID
- **New Functions:**
  - `copyUserId()` - Copies user ID to clipboard
  - `copyWebhookUrl()` - Copies webhook URL to clipboard

### User Composable Integration
- Uses existing `userId` from `useUser()` composable
- Leverages Auth0 user data (`user.sub` field)
- No additional API calls required

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Profile Picture] │ John Doe                            │
│                   │ john@example.com                    │
│                   │ [User ID] google-oauth2|123456 [📋] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 User Identity & Webhook Configuration               │
├─────────────────────┬───────────────────────────────────┤
│ 🆔 User ID          │ 🔗 Webhook URL                   │
│ [Input + Copy Btn]  │ [Input + Copy Button]            │
│ "For webhook URLs"  │ "For payment webhooks"            │
├─────────────────────┴───────────────────────────────────┤
│ ℹ️  Webhook Information                                │
│ • Public endpoint for payment confirmations             │
│ • Validates ticket ownership automatically              │
└─────────────────────────────────────────────────────────┘
```

## Usage Instructions for Users

### For Webhook Configuration:
1. **Copy User ID:** Click the copy button next to your User ID
2. **Copy Webhook URL:** Click the copy button next to the generated webhook URL
3. **Configure Payment System:** Use the webhook URL in your payment provider settings
4. **Test:** Payment confirmations will be processed through your unique webhook URL

### Security Benefits:
- **User Validation:** Only valid user IDs can process webhooks
- **Ticket Ownership:** Only tickets from your events can be processed
- **No Authentication Required:** Public endpoint for payment providers
- **Error Handling:** Clear error messages for invalid requests

## Example Values

```javascript
// User ID (from Auth0)
userId: "google-oauth2|105839926261154439781"

// Generated Webhook URL (production)
webhookUrl: "https://ticketeer.vercel.app/api/webhooks/checkout/google-oauth2%7C105839926261154439781"

// Generated Webhook URL (development)  
webhookUrl: "http://localhost:3000/api/webhooks/checkout/google-oauth2%7C105839926261154439781"
```

## Integration with Webhook API

This profile page enhancement directly supports the new **Public Webhook API** that was recently implemented:

- **Endpoint:** `POST /api/webhooks/checkout/:userId`
- **Security:** User ID validation + ticket ownership verification
- **Usage:** Payment providers can call the webhook URL shown on this profile page
- **Benefits:** Users can easily configure their payment systems without technical complexity

## Future Enhancements

Potential improvements for future versions:
- **Toast Notifications:** Visual feedback when items are copied
- **QR Code:** Generate QR code for webhook URL
- **Webhook Testing:** Built-in webhook testing tool
- **Usage Statistics:** Show webhook call statistics
- **Multiple Environments:** Support for dev/staging/production webhook URLs