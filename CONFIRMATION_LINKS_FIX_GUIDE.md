# 🔧 Confirmation Links Production Fix Guide

## 🎯 **Problem Summary**

Confirmation links were not working in production because:

1. **Wrong Base URL**: Hardcoded `ticketeer.vercel.app` in fallback instead of using environment variables properly
2. **Missing Environment Variables**: `BASE_URL` not set in production
3. **No Email Integration**: Confirmation links weren't being sent to customers automatically

## ✅ **Solution Implemented**

### **1. Fixed Base URL Logic**
- Updated `services/orderService.js` to automatically detect production URL
- Added smart fallback logic: `BASE_URL` → `VERCEL_URL` → `ticketeer.vercel.app`

### **2. Added AWS SES Email Integration**
- Created `services/emailService.js` with professional email templates
- Integrated automatic email sending after webhook processing
- Added completion emails when buyer information is saved

### **3. Enhanced Environment Configuration**
- Updated production environment template with all required variables

## 🚀 **Deployment Steps**

### **Step 1: Deploy Code Changes**

The code has been updated. Deploy to production:

```bash
# Commit and push changes
git add .
git commit -m "fix: confirmation links for production domain and add AWS SES integration"
git push origin main
```

### **Step 2: Configure Vercel Environment Variables**

Go to your Vercel project dashboard and add these environment variables:

#### **Required Variables:**
```bash
# Production Domain
BASE_URL=https://ticketeer.vercel.app

# Security (Generate a secure 32+ character string)
ORDER_HASH_SECRET=your-very-secure-secret-key-at-least-32-characters-long

# AWS SES Configuration (for email sending)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
FROM_EMAIL=no-reply@nova.money
```

#### **How to Add Variables in Vercel:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable one by one
4. Select **Production** environment
5. Click **Save**

### **Step 3: AWS SES Setup**

Since you mentioned AWS SES is already configured, ensure:

#### **3.1 Verify Domain:**
- `nova.money` domain is verified in AWS SES
- `no-reply@nova.money` email address is verified

#### **3.2 Check SES Status:**
- Ensure your SES account is out of sandbox mode for production email sending
- Verify sending limits are appropriate for your volume

#### **3.3 IAM Permissions:**
Your AWS user needs these SES permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

### **Step 4: Install Dependencies**

The AWS SDK has been added to package.json. It will be installed automatically during deployment.

### **Step 5: Test the Fix**

#### **5.1 Test Confirmation URL Generation:**
```bash
# In production console or locally with production env vars
node -e "
process.env.BASE_URL = 'https://ticketeer.vercel.app';
const orderService = require('./services/orderService');
console.log('Production URL:', orderService.generateConfirmationUrl('TEST-123'));
"
```

Expected output:
```
Production URL: https://ticketeer.vercel.app/confirmation/[hash]
```

#### **5.2 Test Complete Flow:**
1. Process a webhook with customer email
2. Check server logs for confirmation email sending
3. Customer receives email with correct domain link
4. Customer completes buyer information
5. Customer receives completion email

## 📧 **Email Templates**

### **Confirmation Email Features:**
- ✅ Professional HTML design with Nova Money branding
- ✅ Clear call-to-action button
- ✅ Portuguese language interface
- ✅ Mobile-responsive design
- ✅ Fallback plain text version

### **Completion Email Features:**
- ✅ Order confirmation with ticket details
- ✅ Table format for ticket information
- ✅ Professional branding
- ✅ Instructions for event entry

## 🔧 **Technical Details**

### **URL Generation Logic:**
```javascript
// Auto-detects production URL in this order:
baseUrl = process.env.BASE_URL || 
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
          'https://ticketeer.vercel.app';
```

### **Email Integration Points:**
1. **After Webhook Processing**: Sends confirmation email with link
2. **After Buyer Completion**: Sends completion email with ticket details

### **Security Features:**
- HMAC-SHA256 hash generation with secret key
- URL-safe base64 encoding
- No sensitive data exposure in public APIs

## 🧪 **Testing Checklist**

### **Pre-Deployment Tests:**
- [ ] Environment variables configured in Vercel
- [ ] AWS SES domain and email verified
- [ ] AWS credentials have SES permissions

### **Post-Deployment Tests:**
- [ ] Webhook processing generates correct confirmation URLs
- [ ] Confirmation emails sent with correct domain
- [ ] Confirmation links open correctly on production
- [ ] Buyer information form works end-to-end
- [ ] Completion emails sent after form submission

### **URL Verification:**
```bash
# Should all show ticketeer.vercel.app domain
curl https://ticketeer.vercel.app/api/public/orders/[hash]
```

## 🚨 **Troubleshooting**

### **Issue: Wrong domain in URLs**
- **Check**: `BASE_URL` environment variable in Vercel
- **Solution**: Ensure `BASE_URL=https://ticketeer.vercel.app`

### **Issue: Emails not sending**
- **Check**: AWS credentials and SES permissions
- **Check**: `FROM_EMAIL` environment variable
- **Check**: Server logs for email errors

### **Issue: Confirmation page not loading**
- **Check**: Vercel routing configuration
- **Check**: Hash format validation

### **Issue: Hash format errors**
- **Check**: `ORDER_HASH_SECRET` environment variable
- **Verify**: Same secret used for generation and validation

## 📋 **Environment Variables Summary**

```bash
# Production Domain
BASE_URL=https://ticketeer.vercel.app

# Database
DATABASE_URL=postgresql://[your-connection-string]

# Auth0 (existing)
AUTH0_DOMAIN=novamoney.us.auth0.com
AUTH0_CLIENT_ID=[your-client-id]
AUTH0_CLIENT_SECRET=[your-client-secret]
AUTH0_AUDIENCE=https://ticketeer.vercel.app

# AWS SES (new)
AWS_ACCESS_KEY_ID=[your-access-key]
AWS_SECRET_ACCESS_KEY=[your-secret-key]
AWS_REGION=us-east-1
FROM_EMAIL=no-reply@nova.money

# Security (new)
ORDER_HASH_SECRET=[32+ character secure string]

# Node.js
NODE_ENV=production
```

## 🎉 **Expected Results**

After deployment:
1. ✅ Confirmation links use `https://ticketeer.vercel.app` domain
2. ✅ Customers automatically receive confirmation emails
3. ✅ Confirmation pages load correctly on production
4. ✅ Buyer information form works end-to-end
5. ✅ Completion emails sent with ticket details
6. ✅ Professional email templates enhance user experience

## 📞 **Support**

If you encounter any issues:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly  
3. Check AWS SES sending statistics
4. Review server console logs for email sending errors

The fix addresses the root cause of the confirmation link issue and adds professional email automation to enhance the customer experience.