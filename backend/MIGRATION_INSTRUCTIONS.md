# Database Migration Instructions

## Problem
The production database is missing several columns in the `announcements` table that are required by the application code:
- `createdBy` (CHAR(36) BINARY, nullable, foreign key to users.id)
- `announcementType` (ENUM, not null, default 'general')
- `isPinned` (BOOLEAN, not null, default false)
- `approvalStatus` (ENUM('pending', 'approved', 'rejected'), nullable)
- `requiresApproval` (BOOLEAN, not null, default false)

These columns are defined in the Sequelize models and used in queries, but the migrations that add them haven't been run on the production database.

## Solution
Run the following migrations on the production database in order:

1. `20251109023614-add-announcement-fields.js` - Adds `createdBy` and `announcementType`
2. `20251110000002-add-phase2b-features.js` - Adds `isPinned`
3. `20251110000004-add-phase3c-features.js` - Adds `approvalStatus` and `requiresApproval`

## Steps to Run Migrations on Production Server

### Option 1: Using Sequelize CLI (Recommended)

1. **SSH into your production server**
   ```bash
   ssh user@your-server
   ```

2. **Navigate to the backend directory**
   ```bash
   cd /path/to/backend
   ```

3. **Ensure you have the latest code**
   ```bash
   git pull origin main
   ```

4. **Check your database connection in `.env`**
   Make sure your `.env` file has the correct database credentials:
   ```
   DB_HOST=your-db-host
   DB_NAME=your-db-name
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   ```

5. **Run migrations**
   ```bash
   npx sequelize-cli db:migrate
   ```

   This will run all pending migrations in order.

6. **Verify migrations ran successfully**
   ```bash
   npx sequelize-cli db:migrate:status
   ```

   You should see all three migrations listed as "up".

7. **Restart your Node.js application**
   ```bash
   pm2 restart all
   # or
   pm2 restart your-app-name
   ```

### Option 2: Manual SQL Execution

If you prefer to run the migrations manually via SQL:

1. **Connect to your MySQL database**
   ```bash
   mysql -u your-db-user -p your-db-name
   ```

2. **Run the SQL from each migration file**

   For `20251109023614-add-announcement-fields.js`:
   ```sql
   ALTER TABLE `announcements` 
   ADD COLUMN `createdBy` CHAR(36) BINARY NULL,
   ADD COLUMN `announcementType` ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update') NOT NULL DEFAULT 'general',
   ADD INDEX `idx_announcements_createdBy` (`createdBy`),
   ADD INDEX `idx_announcements_type` (`announcementType`),
   ADD CONSTRAINT `announcements_createdBy_foreign_idx` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
   ```

   For `20251110000002-add-phase2b-features.js`:
   ```sql
   ALTER TABLE `announcements` 
   ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT FALSE,
   ADD INDEX `idx_announcements_isPinned` (`isPinned`);
   ```

   For `20251110000004-add-phase3c-features.js`:
   ```sql
   ALTER TABLE `announcements` 
   ADD COLUMN `approvalStatus` ENUM('pending', 'approved', 'rejected') NULL,
   ADD COLUMN `requiresApproval` BOOLEAN NOT NULL DEFAULT FALSE;
   ```

3. **Verify columns were added**
   ```sql
   DESCRIBE announcements;
   ```

   You should see all five columns in the output.

4. **Restart your Node.js application**
   ```bash
   pm2 restart all
   ```

## Verification

After running migrations, verify that the errors are gone:

1. **Check application logs**
   ```bash
   pm2 logs
   ```

   You should no longer see errors like:
   - `Unknown column 'createdBy' in 'field list'`
   - `Unknown column 'announcementType' in 'field list'`
   - `Unknown column 'isPinned' in 'field list'`
   - `Unknown column 'approvalStatus' in 'field list'`
   - `Unknown column 'requiresApproval' in 'field list'`

2. **Test the application**
   - Try accessing announcements endpoints
   - Try creating/editing announcements
   - Check that filtering by `createdBy` and `announcementType` works

## Rollback (If Needed)

If you need to rollback the migrations:

```bash
npx sequelize-cli db:migrate:undo
```

Or manually:
```sql
ALTER TABLE `announcements` 
DROP COLUMN `requiresApproval`,
DROP COLUMN `approvalStatus`,
DROP INDEX `idx_announcements_isPinned`,
DROP COLUMN `isPinned`,
DROP INDEX `idx_announcements_type`,
DROP INDEX `idx_announcements_createdBy`,
DROP COLUMN `announcementType`,
DROP COLUMN `createdBy`;
```

## Notes

- **Backup your database** before running migrations in production
- The migrations are designed to be safe - they add columns with default values, so existing data won't be affected
- After migrations, the code will automatically start using these columns for:
  - Filtering announcements by creator (`createdBy`)
  - Filtering by announcement type (`announcementType`)
  - Pinning/unpinning announcements (`isPinned`)
  - Approval workflow (`approvalStatus`, `requiresApproval`)

## Current Code Status

The code has been updated to:
- Explicitly list attributes in queries to avoid selecting non-existent columns
- Temporarily removed `isPinned` from ORDER BY clauses until migrations are run
- Added comments indicating which columns are excluded until migrations are run

Once migrations are run, you can restore the full functionality by:
1. Adding the excluded columns back to the `attributes` arrays
2. Restoring `isPinned` to ORDER BY clauses
3. The WHERE clauses for `createdBy` and `announcementType` will automatically work once the columns exist

