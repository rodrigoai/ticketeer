#!/bin/bash

# Database Restore Script for Ticketeer
# This script restores a PostgreSQL database from a backup file

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔄 Database Restore Utility"
echo ""

# Check if DATABASE_URL exists
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in environment variables"
    exit 1
fi

# Check if backups directory exists
if [ ! -d "backups" ]; then
    echo "❌ Error: No backups directory found"
    exit 1
fi

# List available backups
echo "📋 Available backups:"
echo ""
select BACKUP_FILE in backups/*.sql; do
    if [ -n "$BACKUP_FILE" ]; then
        echo ""
        echo "📂 Selected backup: ${BACKUP_FILE}"
        FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "📊 File size: ${FILESIZE}"
        echo ""
        
        # Confirm restore
        read -p "⚠️  This will REPLACE all current database data. Are you sure? (yes/no): " CONFIRM
        
        if [ "$CONFIRM" = "yes" ]; then
            echo ""
            echo "🔄 Restoring database from ${BACKUP_FILE}..."
            
            # Drop and recreate database, then restore
            psql "$DATABASE_URL" < "$BACKUP_FILE"
            
            if [ $? -eq 0 ]; then
                echo "✅ Database restored successfully!"
            else
                echo "❌ Restore failed!"
                exit 1
            fi
        else
            echo "❌ Restore cancelled"
            exit 0
        fi
        
        break
    else
        echo "❌ Invalid selection"
        exit 1
    fi
done
