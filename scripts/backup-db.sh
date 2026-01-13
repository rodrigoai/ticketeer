#!/bin/bash

# Database Backup Script for Ticketeer
# This script creates a timestamped PostgreSQL database dump

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/ticketeer_backup_${TIMESTAMP}.sql"

echo "📦 Starting database backup..."
echo "📅 Timestamp: ${TIMESTAMP}"
echo "📂 Backup file: ${BACKUP_FILE}"

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in environment variables"
    exit 1
fi

# Use pg_dump with the DATABASE_URL
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "📊 Backup size: ${FILESIZE}"
    echo "📍 Location: ${BACKUP_FILE}"
    
    # List recent backups
    echo ""
    echo "📋 Recent backups:"
    ls -lht backups/*.sql 2>/dev/null | head -5 || echo "No previous backups found"
else
    echo "❌ Backup failed!"
    exit 1
fi
