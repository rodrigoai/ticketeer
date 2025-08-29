# 🎫 Ticketeer - Ticket Sales Management System

A comprehensive ticket sales management system built with **Node.js**, **Express.js**, and **Bootstrap 5**, featuring **Auth0** authentication for secure user management.

## 🌟 Features

- **🔐 Authentication**: Secure user authentication with Auth0
  - Login/Signup functionality
  - Protected API routes
  - User profile management
  - Session handling

- **🎪 Event Management**: Create and manage events (Coming Soon)
- **💳 Sales Tracking**: Monitor ticket sales in real-time (Coming Soon)  
- **📊 Analytics**: Generate comprehensive reports (Coming Soon)
- **🎨 Modern UI**: Responsive Bootstrap 5 interface

## 🚀 Quick Start

### Prerequisites
- **Node.js** (>= 14.x)
- **Yarn** package manager
- **Auth0 Account** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticketeer
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up Auth0 (see setup guide below)**

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Auth0 credentials
   ```

5. **Start the development server**
   ```bash
   yarn dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔐 Auth0 Setup Guide

### 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Click **Applications** → **Create Application**
3. Choose **Single Page Web Applications**
4. Select **Vanilla JavaScript** (or your preferred framework)

### 2. Configure Application Settings

In your Auth0 application settings:

**Allowed Callback URLs:**
```
http://localhost:3000/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
```

**Allowed Web Origins:**
```
http://localhost:3000
```

**Allowed Origins (CORS):**
```
http://localhost:3000
```

### 3. Environment Configuration

Update your `.env` file with your Auth0 credentials:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id-here
AUTH0_CLIENT_SECRET=your-client-secret-here
AUTH0_AUDIENCE=https://your-api-identifier.com

# Server Configuration  
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
```

### 4. Update Frontend Configuration

Edit `/auth.js` and update the Auth0 configuration:

```javascript
const config = {
  domain: 'your-domain.auth0.com',           // Your Auth0 domain
  clientId: 'your-client-id-here',           // Your Auth0 client ID
  authorizationParams: {
    redirect_uri: window.location.origin + '/callback',
    audience: 'https://your-api-identifier.com'  // Optional: Your API identifier
  },
  useRefreshTokens: true,
  cacheLocation: 'localstorage'
};
```

### 5. Update Callback Configuration

Edit `/callback.html` and update the Auth0 configuration:

```javascript
const auth0Config = {
  domain: 'your-domain.auth0.com',     // Your Auth0 domain
  clientId: 'your-client-id-here',     // Your Auth0 client ID
  authorizationParams: {
    redirect_uri: window.location.origin + '/callback'
  }
};
```

## 🔧 Development

### Available Scripts

```bash
# Start development server
yarn dev
# or
yarn start

# Install dependencies
yarn install

# Check server health
curl http://localhost:3000/api/health
```

### Project Structure

```
ticketeer/
├── server.js           # Express.js server with Auth0 middleware
├── index.html          # Main application interface
├── callback.html       # Auth0 authentication callback page
├── auth.js            # Frontend Auth0 integration
├── test.html          # Bootstrap integration test
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
├── .env               # Your environment variables (create this)
└── README.md          # This file
```

## 🛡️ Authentication Features

### Frontend (SPA)
- **Login/Signup**: Secure authentication flow
- **User Profile**: Display user information
- **Protected Features**: UI elements that require authentication
- **Token Management**: Automatic token refresh and storage
- **Error Handling**: Comprehensive error messages

### Backend (API)
- **Protected Routes**: Middleware-protected API endpoints
- **User Context**: Access to authenticated user data
- **Session Management**: Express-openid-connect integration
- **Token Verification**: JWT token validation

### Protected API Endpoints

```bash
# Authentication
GET    /api/auth/status      # Check authentication status
GET    /api/auth/profile     # Get user profile (protected)

# Events (Protected)
GET    /api/events          # Get user events
POST   /api/events          # Create new event

# Sales (Protected) 
GET    /api/sales           # Get sales data
GET    /api/stats           # Get analytics

# Public Endpoints
GET    /api/health          # Server health check
GET    /api/public/events   # Public events (no auth required)
```

## 🧪 Testing Authentication

1. **Start the server**: `yarn dev`
2. **Visit the homepage**: `http://localhost:3000`
3. **Click "Login"** in the navigation
4. **Complete Auth0 authentication**
5. **Test protected features** (profile, settings, API calls)

### Testing API Endpoints

```bash
# Public endpoint (no authentication)
curl http://localhost:3000/api/public/events

# Protected endpoint (requires authentication)
# First get a token from the frontend, then:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/events
```

## 🚀 Deployment

### Environment Variables for Production

```bash
# Production Auth0 Configuration
AUTH0_DOMAIN=your-production-domain.auth0.com
AUTH0_CLIENT_ID=your-production-client-id
AUTH0_CLIENT_SECRET=your-production-client-secret
AUTH0_AUDIENCE=https://your-production-api.com

# Production Server
PORT=3000
NODE_ENV=production
BASE_URL=https://your-production-domain.com
```

### Production Auth0 Configuration

Update your Auth0 application settings for production:

**Allowed Callback URLs:**
```
https://your-production-domain.com/callback
```

**Allowed Logout URLs:**
```
https://your-production-domain.com
```

**Allowed Web Origins:**
```
https://your-production-domain.com
```

## 🛠️ Development Workflow

### Adding New Protected Features

1. **Backend**: Add `requiresAuth()` middleware to routes
   ```javascript
   app.get('/api/new-feature', requiresAuth(), (req, res) => {
     // Access user via req.oidc.user
     res.json({ user: req.oidc.user.email, data: [] });
   });
   ```

2. **Frontend**: Use `ticketeerAuth.apiCall()` for authenticated requests
   ```javascript
   // Make authenticated API call
   const data = await ticketeerAuth.apiCall('/api/new-feature');
   ```

### Database Integration

The project is ready for SQLite3 integration:

1. **Install dependencies**: Already included (`sqlite3`)
2. **Create database schema**: Add your table definitions
3. **Update API endpoints**: Replace placeholder responses with database queries

## 🔍 Troubleshooting

### Common Issues

1. **"Auth0 client not initialized"**
   - Check browser console for initialization errors
   - Verify Auth0 configuration in `auth.js`
   - Ensure all required fields are provided

2. **"Invalid token" errors**
   - Check Auth0 domain and client ID configuration
   - Verify allowed callback URLs in Auth0 dashboard
   - Clear browser localStorage and try again

3. **CORS errors**
   - Add your domain to "Allowed Origins (CORS)" in Auth0
   - Ensure the Auth0 domain is correctly configured

### Debug Mode

Enable debug logging by adding to your `.env`:
```bash
DEBUG=express-openid-connect:*
```

## 📚 Documentation

- [Auth0 Documentation](https://auth0.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review Auth0 setup steps
3. Check browser console for errors
4. Verify environment configuration

---

**Built with ❤️ using Auth0, Node.js, Express.js, and Bootstrap 5**
