# QR Code Check-in Feature

## Overview
A mobile-optimized screen that allows event staff to scan participant QR codes using the device camera for fast check-in processing.

## Design
The design follows the existing check-in screens from Figma (node ID: 304:41 - "Checkin - Reading") with Portuguese labels and Bootstrap 5 styling.

### Visual Elements
- **Header Card**: White rounded card with green "CHECKIN" title and instruction text
- **QR Code Icon**: Animated phone-with-QR-code icon (206x206px) that pulses
- **Camera View**: Live camera preview with scanning frame overlay
- **Scan Button**: Large green button labeled "Ler QRCODE"
- **Back Button**: Top-left "Voltar" link to return to previous screen
- **Manual Entry**: Optional text link for manual code entry

### States
1. **Initial State**: Shows header, QR icon, and scan button
2. **Scanning State**: Camera preview with animated scan frame
3. **Error State**: Warning message if camera access fails
4. **Redirect**: Automatic transition to existing check-in page after successful scan

## Technical Implementation

### Component
- **File**: `/src/views/QRCodeCheckin.vue`
- **Route**: `/qr-checkin`
- **Framework**: Vue 3 Composition API
- **Styling**: Bootstrap 5 with custom CSS animations

### Dependencies
- `html5-qrcode` (v2.3.8): QR code scanning library
- `vue-router`: Navigation
- `bootstrap`: UI framework

### Key Features

#### Camera Integration
```javascript
import { Html5Qrcode } from 'html5-qrcode'

// Start camera with rear-facing preference
await html5QrCode.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: { width: 250, height: 250 } },
  onScanSuccess,
  onScanError
)
```

#### Hash Extraction
The scanner automatically extracts the hash from:
- Full URLs: `https://domain.com/checkin/{hash}`
- Direct hash values: `{hash}`
- URLs with query params: Strips `?` and everything after

#### Auto-Start on Mobile
```javascript
onMounted(() => {
  if (window.innerWidth < 768) {
    setTimeout(() => startScanning(), 300)
  }
})
```

#### Manual Entry Fallback
Modal dialog allows staff to paste ticket codes if camera scanning fails.

### Flow

1. **User accesses** `/qr-checkin`
2. **Component auto-starts** camera on mobile devices
3. **Staff scans** QR code from participant's email
4. **System validates** and extracts hash from QR code
5. **Auto-redirects** to `/checkin/{hash}` (existing TicketCheckin component)
6. **TicketCheckin shows** one of three states:
   - ✅ Valid ticket → Show confirmation
   - ✅ Already checked in → Show timestamp
   - ❌ Invalid hash → Show error

### Animations
- **Fade-in**: Smooth 0.3s entrance animation
- **Pulse**: QR icon opacity animation (2s loop)
- **Scan frame**: Border color animation (2s loop)

### Responsive Design
- Mobile-first layout (max-width: 24rem)
- Smaller QR icon on screens < 576px (180px)
- Auto-start camera on mobile viewports

## Usage

### For Event Staff
1. Navigate to `/qr-checkin`
2. Allow camera permissions when prompted
3. Point camera at participant's QR code
4. System automatically processes and redirects
5. Confirm check-in on next screen

### Alternative: Manual Entry
1. Click "Inserir código manualmente"
2. Paste ticket hash
3. Click "Confirmar"
4. System redirects to check-in page

## Integration with Existing System

### Routes
```javascript
// Added to /src/router/routes.js
{
  path: '/qr-checkin',
  name: 'QRCodeCheckin',
  component: QRCodeCheckin
  // Note: No authGuard - QR code scanning should be public
}
```

### Navigation Flow
```
QR Scanner (/qr-checkin)
    ↓ [Scan Success]
Manual Check-in (/checkin/{hash})
    ↓ [Show Status]
Valid | Already Checked In | Invalid
```

### Backend API
Uses existing check-in endpoints:
- `GET /api/public/checkin/:hash` - Get ticket status
- `POST /api/public/checkin/:hash` - Process check-in

## Security Considerations
- ✅ Public route (no authentication required)
- ✅ Camera permissions requested from browser
- ✅ Hash validation handled by existing backend
- ✅ No sensitive data stored in component
- ✅ Auto-cleanup of camera stream on unmount

## Browser Compatibility
- **Chrome/Edge**: Full support
- **Safari iOS**: Full support (requires HTTPS in production)
- **Firefox**: Full support
- **Note**: Camera access requires HTTPS in production

## Testing

### Local Development
```bash
# Start dev server
yarn dev:client

# Navigate to
http://localhost:5173/qr-checkin
```

### Test Scenarios
1. ✅ Camera access granted → Scanner works
2. ✅ Camera access denied → Error message shown
3. ✅ Valid QR code → Redirects to check-in
4. ✅ Invalid QR code → Redirects, then shows error
5. ✅ Manual entry → Modal appears and works
6. ✅ Back button → Returns to previous page
7. ✅ Mobile viewport → Auto-starts camera
8. ✅ Desktop viewport → Manual start required

## Future Enhancements
- [ ] Sound/vibration feedback on successful scan
- [ ] Scan history/cache for offline mode
- [ ] Bulk scanning mode
- [ ] Flashlight toggle for low-light conditions
- [ ] Multiple QR code format support
- [ ] Analytics on scan success/failure rates

## Files Created/Modified

### New Files
- `/src/views/QRCodeCheckin.vue` - QR scanner component
- `/QR_CHECKIN_FEATURE.md` - This documentation

### Modified Files
- `/src/router/routes.js` - Added QR check-in route
- `/package.json` - Added html5-qrcode dependency

## Credits
- Design: Based on Figma node 304:41 "Checkin - Reading"
- QR Library: [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- Icons: Custom SVG following design system
