# Security Guidelines

## Environment Variables

### ⚠️ NEVER commit `.env` files to git!

Environment files contain sensitive credentials and should **never** be committed to version control.

### What's Protected:
- `.env` (local development)
- `.env.production` (production secrets)
- `.env.local` (local overrides)
- `.env.*` (any environment-specific files)

### How to Set Up Environment Variables:

1. **Local Development:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

2. **Production (Vercel):**
   ```bash
   # Set environment variables in Vercel dashboard or CLI
   vercel env add VARIABLE_NAME production
   ```

### Current Environment Variables:

| Variable | Purpose | Environment | Required |
|----------|---------|-------------|----------|
| `AUTH0_DOMAIN` | Auth0 tenant domain | All | ✅ |
| `AUTH0_CLIENT_ID` | Auth0 application ID | All | ✅ |
| `AUTH0_CLIENT_SECRET` | Auth0 application secret | Server-side | ✅ |
| `AUTH0_AUDIENCE` | Auth0 API audience | All | ✅ |
| `DATABASE_URL` | Single database connection URL (Prisma) | All | ✅ |
| `AWS_ACCESS_KEY_ID` | AWS SES access key | Production | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS SES secret key | Production | ✅ |
| `ORDER_HASH_SECRET` | Order verification secret | Production | ✅ |

**Note:** We use only `DATABASE_URL` for database connections. Avoid multiple database variables like `POSTGRES_URL` or `PRISMA_DATABASE_URL` to prevent conflicts.

### Security Best Practices:

1. **Use different credentials** for development and production
2. **Rotate secrets regularly** especially if exposed
3. **Use Vercel CLI** or dashboard to manage production secrets
4. **Never echo or log** environment variable values
5. **Use least privilege** - only grant necessary permissions

### If You Accidentally Commit Secrets:

1. **Immediately rotate** all exposed credentials
2. **Remove from git history** using `git filter-branch` or BFG
3. **Update all deployments** with new credentials
4. **Notify your team** if others have access

### Vercel Environment Management:

```bash
# List all environment variables
vercel env ls

# Add new environment variable
vercel env add VARIABLE_NAME production

# Remove environment variable  
vercel env rm VARIABLE_NAME production

# Pull environment variables for local testing
vercel env pull .env.local
```

Remember: **Security is everyone's responsibility!** 🔒