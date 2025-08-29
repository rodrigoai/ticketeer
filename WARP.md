# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Ticketeer is a comprehensive ticket sales management system built with Node.js/Express.js backend and Bootstrap 5 frontend, featuring Auth0 authentication for secure user management. The project includes a complete authentication system with protected API routes and dynamic UI components.

## Architecture

### Backend (server.js)
- **Express.js server** running on port 3000 (configurable via PORT env var)
- **Static file serving** for HTML, CSS, JS assets
- **RESTful API structure** with placeholder endpoints:
  - `/api/health` - Server status check
  - `/api/events` - Event management (placeholder)
  - `/api/sales` - Sales tracking (placeholder) 
  - `/api/stats` - Analytics data (placeholder)
- **SQLite3 database** ready for integration (dependency installed but not yet implemented)
- **Error handling middleware** with JSON responses

### Frontend (index.html)
- **Bootstrap 5** responsive UI framework
- **Single-page layout** with navigation, hero section, feature cards, and stats dashboard
- **Placeholder functionality** for event management, sales tracking, and analytics
- **CDN-based Bootstrap** assets (CSS/JS)

### Key Dependencies
- **express**: Web application framework
- **express-openid-connect**: Auth0 authentication middleware
- **auth0**: Node.js Auth0 SDK
- **@auth0/auth0-spa-js**: Frontend Auth0 SPA SDK
- **jsonwebtoken**: JWT token handling
- **dotenv**: Environment variable management
- **sqlite3**: Database integration (ready for implementation)
- **bootstrap**: Frontend CSS framework
- **@popperjs/core**: Bootstrap tooltip/popover functionality

## Development Commands

### Install Dependencies
```bash
yarn install
```

### Start Development Server
```bash
yarn dev
# or
yarn start
```
Both commands run `node server.js` and start the server on http://localhost:3000

### Test Server Health
```bash
curl http://localhost:3000/api/health
```

### Test Authentication System
```bash
# Check authentication status
curl http://localhost:3000/api/auth/status

# Test public endpoints
curl http://localhost:3000/api/public/events
```

### Run Bootstrap UI Test
Open http://localhost:3000/test.html to verify Bootstrap integration

## Development Workflow

### Adding New Features
1. **API Endpoints**: Add new routes in `server.js` following the existing pattern
2. **Database Integration**: SQLite3 is ready - create database schema and connection logic
3. **Frontend Components**: Extend `index.html` or create new HTML pages
4. **Static Assets**: Place CSS, JS, images in project root (served statically)

### Database Development
- SQLite3 dependency is installed and ready
- Database files should be created in project root
- Add database initialization and connection logic to `server.js`
- Consider creating separate modules for database operations

### Frontend Development
- Bootstrap 5 is loaded via CDN
- Local Bootstrap files are available in `node_modules/bootstrap/`
- Custom CSS/JS should be placed in project root and linked in HTML
- Use Bootstrap classes for consistent styling

## Project Structure

```
ticketeer/
├── server.js          # Express.js backend server with Auth0 middleware
├── index.html         # Main application interface with authentication UI
├── callback.html      # Auth0 authentication callback handler
├── auth.js           # Frontend Auth0 SPA integration
├── test.html         # Bootstrap integration test page
├── package.json      # Project configuration and dependencies
├── .env.example      # Environment variables template
├── .env             # Environment configuration (create from .env.example)
├── README.md        # Comprehensive setup and usage documentation
├── WARP.md          # This file
└── node_modules/    # Installed dependencies
```

## API Architecture

The application follows RESTful API design patterns with JSON responses and Auth0 authentication. All API routes are prefixed with `/api/` and include proper error handling.

### Authentication Routes
- **GET /api/auth/status**: Check authentication status
- **GET /api/auth/profile**: Get user profile (protected)
- **GET /auth/logout**: Logout endpoint
- **POST /auth/callback**: Auth0 callback handler

### Protected API Routes (require authentication)
- **GET /api/events**: User events
- **POST /api/events**: Create event
- **GET /api/sales**: Sales data
- **GET /api/stats**: Analytics

### Public API Routes
- **GET /api/health**: Server health check
- **GET /api/public/events**: Public events listing

### Server Features
- **Authentication**: Auth0 integration with express-openid-connect
- **Content-Type**: `application/json` for API responses
- **Error Handling**: Centralized error middleware with structured JSON error responses
- **Static Serving**: Express static middleware for frontend assets
- **Request Parsing**: JSON and URL-encoded request body parsing
- **JWT Verification**: Token validation middleware for API endpoints

## Authentication System

### Frontend Authentication (auth.js)
- **TicketeerAuth Class**: Complete Auth0 SPA integration
- **Login/Signup**: Redirect-based authentication flow
- **User Profile**: Profile modal with user information
- **Protected Features**: Dynamic UI based on authentication state
- **Token Management**: Automatic token refresh and storage
- **Error Handling**: Comprehensive error messages and retry logic

### Backend Authentication (server.js)
- **express-openid-connect**: Auth0 middleware integration
- **requiresAuth()**: Middleware for protecting routes
- **User Context**: Access to authenticated user via req.oidc.user
- **Session Management**: Automatic session handling
- **JWT Verification**: Custom token validation for API calls

### Callback Handling (callback.html)
- **Auth0 Callback**: Processes authentication redirect
- **Error Handling**: User-friendly error messages
- **Success Flow**: Automatic redirect to intended page
- **Loading States**: Visual feedback during processing

## Future Development Areas

Based on the current codebase structure:

1. **Database Layer**: Implement SQLite3 schemas for events, tickets, sales, and users
2. **Role-Based Access**: Add user roles and permissions system
3. **Real-time Features**: Consider WebSocket integration for live sales tracking
4. **API Implementation**: Replace placeholder endpoints with actual business logic
5. **Frontend Interactivity**: Expand dynamic UI interactions and real-time updates
6. **Testing Framework**: Implement unit and integration tests (currently no test command defined)
7. **Payment Integration**: Add payment processing for ticket purchases
8. **Email Notifications**: Implement transactional emails using AWS SES

## Environment Configuration

### Required Environment Variables
```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://your-api.example.com

# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Database
DB_PATH=./ticketeer.db
```

### Setup Process
1. Copy `.env.example` to `.env`
2. Configure Auth0 application in Auth0 Dashboard
3. Update environment variables with Auth0 credentials
4. Update frontend configuration in `auth.js` and `callback.html`

- Database files (.db, .sqlite, .sqlite3) are gitignored
- Environment files (.env) are gitignored for security
