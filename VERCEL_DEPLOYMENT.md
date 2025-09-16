# Vercel Deployment Guide for Ticketeer

This guide will help you deploy the Ticketeer application to Vercel with full functionality.

## Prerequisites

- ✅ GitHub repository with code (already done: https://github.com/rodrigoai/ticketeer.git)
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Auth0 account with configured application
- ✅ Domain for Auth0 callbacks (will be your Vercel app URL)

## Deployment Steps

### 1. Create Vercel Project

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import from GitHub: `rodrigoai/ticketeer`
4. Select the repository and click "Import"

### 2. Configure Build Settings

Vercel should automatically detect the settings, but verify:
- **Framework Preset**: Other
- **Build Command**: `yarn build` (or use `vercel-build` script)
- **Output Directory**: `dist`
- **Install Command**: `yarn install`

### 3. Set up Database (Vercel Postgres)

1. In your Vercel project dashboard, go to "Storage" tab
2. Click "Create Database" → "Postgres"
3. Choose a database name: `ticketeer-db`
4. Select your preferred region
5. Copy the `DATABASE_URL` connection string

### 4. Configure Environment Variables

In your Vercel project settings, go to "Environment Variables" and add:

#### Auth0 Variables (Frontend)
```
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=your-auth0-audience
```

#### Auth0 Variables (Backend)
```
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=your-auth0-audience
```

#### Production Settings
```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

**Note**: Use the `DATABASE_URL` from your Vercel Postgres database.

### 5. Update Auth0 Configuration

1. Log into your Auth0 Dashboard
2. Go to Applications → Your Ticketeer App
3. Update the following settings with your Vercel domain:

**Allowed Callback URLs**:
```
https://your-app-name.vercel.app/callback,
http://localhost:5173/callback
```

**Allowed Logout URLs**:
```
https://your-app-name.vercel.app,
http://localhost:5173
```

**Allowed Web Origins**:
```
https://your-app-name.vercel.app,
http://localhost:5173
```

**Allowed Origins (CORS)**:
```
https://your-app-name.vercel.app,
http://localhost:5173
```

### 6. Database Migration

After the first deployment, you'll need to run database migrations:

1. Install Vercel CLI locally:
   ```bash
   npm i -g vercel
   ```

2. Connect to your project:
   ```bash
   vercel login
   vercel link
   ```

3. Run migrations:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

Alternatively, add a migration script to your deployment that runs automatically.

### 7. Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for build to complete
3. Test the application at your Vercel URL

## Troubleshooting

### Build Issues

- **Prisma Client Not Found**: Ensure `npx prisma generate` runs in build script
- **Vue Build Errors**: Check that all dependencies are in `dependencies` (not just `devDependencies`)

### Runtime Issues

- **Database Connection**: Verify `DATABASE_URL` is correctly set and migrations are deployed
- **Auth0 Errors**: Ensure all callback URLs match your deployed domain exactly
- **API Routes 404**: Check that `vercel.json` routing is correctly configured

### Environment Variables

- Frontend variables must start with `VITE_` to be available in the browser
- Backend variables should NOT start with `VITE_` for security
- Always use production values, not localhost URLs

## File Structure After Deployment

```
ticketeer/
├── vercel.json          # Vercel configuration
├── .env.production      # Production env template
├── package.json         # Updated with vercel-build script
├── prisma/
│   └── schema.prisma    # Updated for PostgreSQL
├── server.js            # Express server (serves API + SPA)
├── dist/                # Built Vue.js app (auto-generated)
└── src/                 # Vue.js source code
```

## Post-Deployment Checklist

- [ ] Application loads at Vercel URL
- [ ] Auth0 login/logout works
- [ ] Database operations work (create/read events and tickets)
- [ ] API endpoints respond correctly
- [ ] Frontend routing works (no 404s on refresh)
- [ ] Environment variables are secure (no secrets in frontend)

## Production Monitoring

Consider adding:
- Error tracking (Sentry, LogRocket)
- Performance monitoring (Vercel Analytics)
- Database monitoring (built-in with Vercel Postgres)
- Uptime monitoring (Uptime Robot, Pingdom)

## Scaling Considerations

- Vercel Functions have execution limits (30s max)
- Database connection pooling for high traffic
- CDN caching for static assets
- Rate limiting for API endpoints

---

🎉 **Congratulations!** Your Ticketeer application should now be successfully deployed on Vercel!