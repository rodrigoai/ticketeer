# Project Organization

This document describes the current organization of the Ticketeer project after cleanup.

## Directory Structure

```
ticketeer/
├── README.md                    # Main project documentation
├── WARP.md                     # AI assistant guidance
├── package.json                # Project dependencies and scripts
├── yarn.lock                   # Yarn dependency lock file
├── package-lock.json           # NPM dependency lock file (legacy)
├── server.js                   # Main application server
├── index.html                  # Frontend entry point
├── vite.config.js              # Vite build configuration
├── vercel.json                 # Vercel deployment configuration
├── .vercelignore              # Vercel ignore patterns
├── .gitignore                 # Git ignore patterns
├── .env                       # Development environment variables
├── .env.example               # Environment variables template
├── .env.production            # Production environment variables
│
├── src/                       # Source code
├── public/                    # Static assets
├── dist/                      # Build output
├── prisma/                    # Database schema and migrations
├── services/                  # Business logic services
├── middleware/                # Express middleware
├── tests/                     # Test files
├── node_modules/              # Dependencies (ignored by git)
│
├── docs/                      # Documentation
│   ├── PROJECT_ORGANIZATION.md # This file
│   ├── DEV_GUIDE.md           # Development guide
│   ├── VERCEL_DEPLOYMENT.md   # Deployment documentation
│   ├── API_DOCUMENTATION.md   # API documentation
│   ├── API_CHANGELOG.md       # API changes log
│   ├── development/           # Development-specific docs
│   │   ├── AUTH0_STATE_FIX.md
│   │   ├── CENTRALIZED_AUTH_ARCHITECTURE.md
│   │   ├── NEWPRO_VUE_IMPLEMENTATION.md
│   │   ├── PROFILE_VUE_UPDATES.md
│   │   ├── USER_STATE_IMPLEMENTATION.md
│   │   └── USEUSER_FIX.md
│   ├── ticketeer-api.postman_collection.json # API testing
│   ├── checkout-webhook-example.json
│   └── webhook-example-curl.sh
│
├── config/                    # Configuration files
│   ├── .env.local            # Local development overrides
│   ├── .env.vercel           # Vercel-specific environment
│   ├── .env.vercel.clean     # Clean Vercel configuration
│   └── auth_config.json      # Auth0 configuration
│
├── examples/                  # Example code and test files
│   ├── jwt_auth_example.js   # JWT authentication example
│   └── test-server.js        # Test server implementation
│
├── generated/                 # Generated files (e.g., Prisma)
├── login_example_app/         # Example login application
└── .vercel/                  # Vercel deployment cache
```

## Key Changes Made

### 1. Documentation Organization
- Moved all development-specific .md files to `docs/development/`
- Kept `README.md` and `WARP.md` in root for easy access
- Organized API documentation and testing files in `docs/`

### 2. Environment Files
- Main environment files (`.env`, `.env.example`, `.env.production`) remain in root
- Moved environment variations to `config/` directory
- Updated `.gitignore` to handle the new structure

### 3. Configuration Files
- Created `config/` directory for configuration files
- Moved `auth_config.json` and additional `.env` files to this directory

### 4. Example Code
- Created `examples/` directory for example and test code
- Moved `jwt_auth_example.js` and `test-server.js` here

### 5. Cleanup
- Removed temporary log files (`server.log`)
- Removed macOS system files (`.DS_Store`)
- Updated `.gitignore` to prevent future clutter

## Benefits of This Organization

1. **Cleaner Root Directory**: Essential files are easy to find
2. **Better Documentation Structure**: Related docs are grouped together
3. **Separated Concerns**: Config, examples, and docs have dedicated spaces
4. **Improved Maintainability**: Easier to locate and manage files
5. **Better Git Practices**: Enhanced .gitignore prevents unwanted files

## Environment Files Guide

- `.env` - Main development environment variables (gitignored)
- `.env.example` - Template for required environment variables (committed)
- `.env.production` - Production-specific variables (committed)
- `config/.env.local` - Local development overrides
- `config/.env.vercel*` - Vercel deployment configurations

## Next Steps

1. Update any scripts or references that might point to moved files
2. Consider adding more specific documentation for the `src/` directory structure
3. Review and update import paths if any files reference the moved configuration files
4. Add a proper test directory structure if needed

This organization follows Node.js project best practices and maintains the existing functionality while improving maintainability.