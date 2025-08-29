# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Ticketeer is a comprehensive ticket sales management system built with Node.js/Express.js backend and Bootstrap 5 frontend. The project is in early development stage with placeholder API endpoints and a static HTML interface ready for enhancement.

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
├── server.js          # Express.js backend server
├── index.html         # Main application interface
├── test.html          # Bootstrap integration test page
├── package.json       # Project configuration and dependencies
└── node_modules/      # Installed dependencies
```

## API Architecture

The application follows RESTful API design patterns with JSON responses. All API routes are prefixed with `/api/` and include proper error handling. The server implements:

- **Content-Type**: `application/json` for API responses
- **Error Handling**: Centralized error middleware with structured JSON error responses
- **Static Serving**: Express static middleware for frontend assets
- **Request Parsing**: JSON and URL-encoded request body parsing

## Future Development Areas

Based on the current codebase structure:

1. **Database Layer**: Implement SQLite3 schemas for events, tickets, sales, and users
2. **Authentication**: Add user authentication and session management
3. **Real-time Features**: Consider WebSocket integration for live sales tracking
4. **API Implementation**: Replace placeholder endpoints with actual business logic
5. **Frontend Interactivity**: Add JavaScript for dynamic UI interactions
6. **Testing Framework**: Implement unit and integration tests (currently no test command defined)

## Environment Configuration

- Default port: 3000 (override with `PORT` environment variable)
- No environment-specific configuration files present
- Database files (.db, .sqlite, .sqlite3) are gitignored
- Standard Node.js environment variable patterns expected
