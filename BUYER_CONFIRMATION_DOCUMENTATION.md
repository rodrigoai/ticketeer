# Buyer Confirmation Screen - Complete Documentation

## 📋 Overview

The Buyer Confirmation Screen allows customers who purchased tickets to provide their personal information for each ticket in their order through a secure, public link. This feature ensures privacy, validates CPF documents, and prevents duplicate buyer information within the same order.

## 🌟 Key Features

### ✅ **Security & Privacy**
- **Hash-based URLs**: Order IDs are never exposed in public links
- **HMAC-SHA256**: Cryptographically secure hash generation
- **One-time completion**: Once filled, buyer information cannot be modified
- **Data privacy**: Public endpoints don't expose sensitive information

### ✅ **Validation & Integrity**
- **Brazilian CPF validation**: Real algorithm with verification digits
- **Email validation**: RFC-compliant email format checking
- **Unique buyers**: No duplicate CPF or email within the same order
- **Atomic saving**: All-or-nothing transaction for data consistency

### ✅ **User Experience**
- **Responsive design**: Works on desktop, tablet, and mobile
- **Real-time validation**: Immediate feedback as users type
- **Portuguese interface**: Localized for Brazilian users
- **Loading states**: Visual feedback during API calls

## 🔧 Technical Architecture

### **Components**

```
📁 utils/
├── orderHash.js          # Hash generation and validation
└── cpfValidator.js       # Brazilian CPF validation

📁 services/
└── orderService.js       # Order and buyer management

📁 public/
├── confirmation.html     # Buyer confirmation page
├── confirmation.css      # Styling and responsive design
└── confirmation.js      # Client-side validation and API calls

📁 tests/
└── buyerConfirmation.test.js  # Comprehensive test suite
```

### **API Endpoints**

#### **GET /api/public/orders/:hash**
Retrieve order details for buyer confirmation

**Parameters:**
- `hash` (path): Secure hash representing the order

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "ORDER-12345-ABC",
    "hash": "abc123def456...",
    "event": {
      "name": "Evento de Teste",
      "venue": "Centro de Convenções",
      "date": "2024-12-31T20:00:00.000Z"
    },
    "tickets": [
      {
        "id": 1,
        "identificationNumber": 1,
        "description": "VIP Section",
        "location": "Setor A",
        "table": 5,
        "price": 150.00,
        "isCompleted": false
      }
    ],
    "isCompleted": false,
    "totalTickets": 1
  }
}
```

#### **POST /api/public/orders/:hash/buyers**
Save buyer information for all tickets in an order

**Parameters:**
- `hash` (path): Secure hash representing the order

**Request Body:**
```json
{
  "buyers": [
    {
      "ticketId": 1,
      "name": "João Silva",
      "document": "11144477735",
      "email": "joao@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Buyer information saved for 1 tickets",
  "orderId": "ORDER-12345-ABC",
  "updatedTickets": [
    {
      "id": 1,
      "identificationNumber": 1,
      "buyer": "João Silva",
      "buyerDocument": "111.444.777-35",
      "buyerEmail": "joao@example.com"
    }
  ]
}
```

## 🔨 Implementation Guide

### **1. Generate Confirmation URL**

```javascript
const orderService = require('./services/orderService');

// Generate public confirmation URL for an order
const confirmationUrl = orderService.generateConfirmationUrl(
  'ORDER-12345-ABC', 
  'https://ticketeer.vercel.app'
);
// Returns: https://ticketeer.vercel.app/confirmation/abc123def456...
```

### **2. Hash Generation and Validation**

```javascript
const orderHash = require('./utils/orderHash');

// Generate hash
const hash = orderHash.generateHash('ORDER-12345-ABC');

// Validate hash format
const isValid = orderHash.isValidHashFormat(hash);

// Verify hash matches order
const matches = orderHash.verifyHash(hash, 'ORDER-12345-ABC');
```

### **3. CPF Validation**

```javascript
const cpfValidator = require('./utils/cpfValidator');

// Validate CPF
const result = cpfValidator.validateAndFormat('123.456.789-09');
console.log(result);
// {
//   isValid: true,
//   clean: "12345678909",
//   formatted: "123.456.789-09",
//   error: null
// }

// Check if CPF is valid
const isValidCPF = cpfValidator.isValid('111.444.777-35');
```

### **4. Order Management**

```javascript
const orderService = require('./services/orderService');

// Get order by hash
const orderDetails = await orderService.getOrderByHash(hash);

// Save buyer information
const buyersData = [
  {
    ticketId: 1,
    name: 'João Silva',
    document: '11144477735',
    email: 'joao@example.com'
  }
];

const result = await orderService.saveBuyersForOrder(hash, buyersData);
```

## 🧪 Testing

### **Running Tests**

```bash
# Run all buyer confirmation tests
npm test -- --testNamePattern="Buyer Confirmation"

# Run specific test suites
npm test -- --testNamePattern="OrderHash Utility"
npm test -- --testNamePattern="CPF Validator"
npm test -- --testNamePattern="Order Service"
```

### **Test Coverage**

The test suite covers:

✅ **Hash Generation**
- Consistent hash generation
- Different hashes for different orders
- Hash format validation
- URL extraction and validation
- Security (no reverse engineering)

✅ **CPF Validation**
- Format cleaning and validation
- Brazilian CPF algorithm
- Error message generation
- Edge cases and invalid inputs

✅ **Order Service**
- Buyer data validation
- Duplicate detection (CPF and email)
- Required field validation
- Atomic saving operations

✅ **Integration**
- Complete buyer confirmation flow
- Security verification
- Edge case handling

## 🎨 User Interface

### **Design Implementation**

The UI matches the provided design example with:

- **Header**: Gradient background with greeting
- **Form Layout**: 3-column grid (Nome, Documento, Email)
- **Validation**: Real-time error feedback
- **Save Button**: Disabled until all fields are valid
- **Warning**: Clear message about finality of the action

### **Responsive Behavior**

- **Desktop**: 3-column layout for ticket fields
- **Tablet**: 2-column layout with adjusted spacing
- **Mobile**: Single-column layout with stacked fields

### **Accessibility**

- **Keyboard navigation**: Full tab support
- **Focus indicators**: Clear visual focus states
- **Screen readers**: Proper ARIA labels and descriptions
- **Error messages**: Associated with form fields

## 🔒 Security Considerations

### **Hash Security**

```javascript
// Hash generation uses HMAC-SHA256 with secret
const secret = process.env.ORDER_HASH_SECRET;
const hash = crypto.createHmac('sha256', secret)
  .update(orderId)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');
```

### **Data Validation**

- **Server-side validation**: All inputs validated on the server
- **CPF algorithm**: Real Brazilian CPF verification digits
- **Email RFC compliance**: Proper email format validation
- **Sanitization**: Inputs cleaned and normalized

### **Privacy Protection**

- **Masked data**: Completed forms show masked information
- **No sensitive exposure**: Public endpoints exclude sensitive data
- **Atomic operations**: Transaction-based saving prevents partial updates

## 📝 Validation Rules

### **Name Validation**
- **Required**: Cannot be empty
- **Minimum length**: 2 characters
- **Character set**: Letters only (including accented characters)
- **Error messages**: Portuguese language

### **CPF Validation**
- **Format**: 11 digits with optional formatting
- **Algorithm**: Brazilian CPF verification digits
- **Uniqueness**: No duplicate CPF within the same order
- **Error messages**: Specific CPF-related errors in Portuguese

### **Email Validation**
- **Format**: RFC-compliant email format
- **Uniqueness**: No duplicate email within the same order
- **Normalization**: Converted to lowercase for storage
- **Error messages**: Clear email format errors

### **Business Rules**
- **All required**: All fields must be completed before saving
- **Atomic saving**: All tickets must pass validation to save any
- **One-time completion**: Cannot be modified once completed
- **Unique buyers**: Each ticket must have a unique buyer

## 🚀 Deployment

### **Environment Variables**

```bash
# Required for production
ORDER_HASH_SECRET=your-secure-secret-key-here

# Optional (defaults provided)
PORT=3000
NODE_ENV=production
```

### **File Structure**

```
public/
├── confirmation.html     # Main confirmation page
├── confirmation.css      # Styling and responsive design
└── confirmation.js       # Client-side logic

utils/
├── orderHash.js          # Hash utilities
└── cpfValidator.js       # CPF validation

services/
└── orderService.js       # Order management

tests/
└── buyerConfirmation.test.js  # Test suite
```

### **Server Routes**

Add these routes to your Express server:

```javascript
// Public API endpoints for buyer confirmation
app.get('/api/public/orders/:hash', async (req, res) => {
  // Implementation in server.js
});

app.post('/api/public/orders/:hash/buyers', async (req, res) => {
  // Implementation in server.js
});

// Serve confirmation page
app.get('/confirmation/:hash', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'confirmation.html'));
});
```

## 🔧 Integration Examples

### **Webhook Integration**

After processing a webhook and updating tickets with orders, generate confirmation URLs:

```javascript
const orderService = require('./services/orderService');

// In webhook processing
const confirmationUrl = orderService.generateConfirmationUrl(
  orderId, 
  'https://ticketeer.vercel.app'
);

// Send confirmation URL to customer via email
await sendConfirmationEmail(customerEmail, {
  orderId,
  confirmationUrl,
  eventName: event.name
});
```

### **Email Template Example**

```html
<h1>Confirme suas informações</h1>
<p>Olá! Você acabou de comprar ingressos para o evento <strong>{{eventName}}</strong>.</p>
<p>Para finalizar sua compra, confirme as informações dos portadores dos ingressos:</p>
<a href="{{confirmationUrl}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
  Confirmar Informações
</a>
```

### **Frontend Integration**

```javascript
// Generate confirmation URLs in your admin panel
async function generateConfirmationLink(orderId) {
  const response = await fetch(`/api/admin/orders/${orderId}/confirmation-url`);
  const data = await response.json();
  return data.confirmationUrl;
}
```

## 📊 Monitoring & Analytics

### **Key Metrics to Track**

- **Completion Rate**: Percentage of confirmation links that are completed
- **Time to Complete**: How long users take to fill out the form
- **Validation Errors**: Most common validation failures
- **Abandonment Points**: Where users drop off in the form

### **Logging Examples**

```javascript
// Log confirmation starts
console.log('Confirmation started', { orderId, hash, userAgent });

// Log validation errors
console.log('Validation error', { orderId, field, error, attempt });

// Log successful completions
console.log('Confirmation completed', { orderId, ticketCount, duration });
```

## 🐛 Troubleshooting

### **Common Issues**

#### **"Invalid hash format" Error**
```javascript
// Check if hash is properly encoded
const hash = orderHash.generateHash(orderId);
console.log('Generated hash:', hash);
console.log('Is valid format:', orderHash.isValidHashFormat(hash));
```

#### **CPF Validation Failing**
```javascript
// Debug CPF validation
const result = cpfValidator.validateAndFormat(cpf);
console.log('CPF validation result:', result);
```

#### **Order Not Found**
```javascript
// Verify order exists and has tickets
const orderInfo = await orderService.getOrderInfo(orderId);
console.log('Order info:', orderInfo);
```

### **Debug Mode**

Enable debug logging:

```javascript
// Add to your environment
DEBUG=ticketeer:buyer-confirmation

// In code
const debug = require('debug')('ticketeer:buyer-confirmation');
debug('Processing confirmation for order:', orderId);
```

## 📚 Additional Resources

### **Related Documentation**
- [Webhook API Documentation](./WEBHOOK_BUYER_ASSIGNMENT_GUIDE.md)
- [Postman API Collection](./POSTMAN_PUBLIC_APIS_README.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

### **External References**
- [Brazilian CPF Algorithm](https://en.wikipedia.org/wiki/CPF_number)
- [HMAC-SHA256 Security](https://tools.ietf.org/html/rfc2104)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/)

---

**Status**: ✅ **Production Ready**  
**Version**: 1.0.0  
**Last Updated**: January 15, 2024