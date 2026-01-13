# Database Backup & Restore Scripts

This directory contains scripts for backing up and restoring your PostgreSQL database.

## Prerequisites

- `pg_dump` and `psql` must be installed (comes with PostgreSQL)
- `DATABASE_URL` must be set in your `.env` file

## Usage

### Creating a Backup

```bash
yarn db:backup
```

This will:
- Create a timestamped SQL dump file in the `backups/` directory
- Format: `ticketeer_backup_YYYYMMDD_HHMMSS.sql`
- Display the backup size and location
- Show a list of your 5 most recent backups

**Example output:**
```
📦 Starting database backup...
📅 Timestamp: 20260112_173000
📂 Backup file: backups/ticketeer_backup_20260112_173000.sql
✅ Backup completed successfully!
📊 Backup size: 2.5M
📍 Location: backups/ticketeer_backup_20260112_173000.sql
```

### Restoring from a Backup

```bash
yarn db:restore
```

This will:
- Display an interactive list of available backups
- Allow you to select which backup to restore
- Require confirmation before proceeding (safety feature)
- Restore the selected backup to your database

**⚠️ Warning:** Restoring will REPLACE all current database data!

## Backup Location

All backups are stored in: `/backups/`

This directory is added to `.gitignore` to prevent accidentally committing database dumps.

## Automation (Optional)

### Scheduled Backups with Cron

To create automatic daily backups at 2 AM:

```bash
crontab -e
```

Add this line:
```
0 2 * * * cd /path/to/ticketeer && yarn db:backup >> logs/backup.log 2>&1
```

### Pre-deployment Backup

Add to your deployment workflow:
```bash
# Always backup before deploying
yarn db:backup
yarn build
yarn deploy
```

## Best Practices

1. **Regular Backups**: Create backups before:
   - Database migrations
   - Major updates
   - Production deployments
   - Schema changes

2. **Retention Policy**: Keep backups for:
   - Daily backups: 7 days
   - Weekly backups: 4 weeks
   - Monthly backups: 12 months

3. **Test Restores**: Periodically test your backups in a non-production environment

4. **Off-site Storage**: Consider copying backups to cloud storage (S3, Google Drive, etc.)

## Cleanup Old Backups

To remove backups older than 30 days:

```bash
find backups/ -name "*.sql" -mtime +30 -delete
```

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

### "DATABASE_URL not found"

Ensure your `.env` file contains:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Permission Denied

Make scripts executable:
```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh
```
