# Database Migration Guide: Development to Production

This guide will help you migrate your database from the local development server to the VPS Hostinger production server.

## Prerequisites

- MySQL installed on both local and VPS servers
- Access to both databases
- Database credentials for both environments

## Step 1: Export Database from Local Development Server

### On your local machine (Windows):

1. **Open Command Prompt or PowerShell** in your project directory

2. **Export the database** using mysqldump:
   ```bash
   mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_backup.sql
   ```
   
   Or if you have a password:
   ```bash
   mysqldump -u root -pbuildwatch_123 buildwatch_lgu > buildwatch_lgu_backup.sql
   ```
   
   **Note:** Replace `root` and `buildwatch_123` with your actual local database credentials.

3. **Verify the backup file was created:**
   ```bash
   dir buildwatch_lgu_backup.sql
   ```

## Step 2: Transfer Backup File to VPS

### Option A: Using SCP (Secure Copy)

From your local machine:
```bash
scp buildwatch_lgu_backup.sql user@your-vps-ip:/home/user/buildwatch_lgu_backup.sql
```

Replace:
- `user` with your VPS username
- `your-vps-ip` with your VPS IP address

### Option B: Using SFTP Client (FileZilla, WinSCP, etc.)

1. Connect to your VPS using SFTP
2. Upload `buildwatch_lgu_backup.sql` to your home directory or project directory

### Option C: Using Git (if file is small enough)

1. Add the backup file temporarily:
   ```bash
   git add buildwatch_lgu_backup.sql
   git commit -m "Database backup for migration"
   git push origin main
   ```

2. On VPS, pull and then remove from git:
   ```bash
   git pull origin main
   # After importing, remove from git
   git rm buildwatch_lgu_backup.sql
   git commit -m "Remove backup file"
   git push origin main
   ```

## Step 3: Import Database on VPS

### On your VPS Hostinger Terminal:

1. **SSH into your VPS:**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to your project directory:**
   ```bash
   cd ~/build-watch-system
   ```

3. **Create a backup of the current production database (IMPORTANT!):**
   ```bash
   mysqldump -u your_prod_db_user -p your_prod_db_name > production_backup_$(date +%Y%m%d_%H%M%S).sql
   ```
   
   Replace:
   - `your_prod_db_user` with your production database username
   - `your_prod_db_name` with your production database name

4. **Import the development database:**
   ```bash
   mysql -u your_prod_db_user -p your_prod_db_name < buildwatch_lgu_backup.sql
   ```

5. **Verify the import:**
   ```bash
   mysql -u your_prod_db_user -p your_prod_db_name -e "SHOW TABLES;"
   ```

## Step 4: Update Database Configuration (if needed)

1. **Check your `.env` file on VPS:**
   ```bash
   cd ~/build-watch-system/backend
   nano .env
   ```

2. **Verify these settings match your production database:**
   ```
   DB_HOST=localhost
   DB_NAME=your_prod_db_name
   DB_USER=your_prod_db_user
   DB_PASS=your_prod_db_password
   DB_PORT=3306
   ```

## Step 5: Run Database Migrations (if any pending)

1. **Navigate to backend directory:**
   ```bash
   cd ~/build-watch-system/backend
   ```

2. **Check migration status:**
   ```bash
   npx sequelize-cli db:migrate:status
   ```

3. **Run pending migrations:**
   ```bash
   npx sequelize-cli db:migrate
   ```

## Step 6: Restart Services

1. **Restart backend:**
   ```bash
   pm2 restart build-watch-backend
   # or
   pm2 restart all
   ```

2. **Check logs to ensure everything is working:**
   ```bash
   pm2 logs build-watch-backend
   ```

## Alternative: Direct Database Transfer (if both servers are accessible)

If you have direct access to both databases, you can use a single command:

```bash
mysqldump -u root -p buildwatch_lgu | mysql -h your-vps-ip -u your_prod_db_user -p your_prod_db_name
```

## Important Notes

⚠️ **WARNING:**
- **Always backup your production database before importing!**
- The import will **overwrite** all existing data in the production database
- Make sure you want to replace all production data with development data
- Consider if you want to merge data instead of replacing it

## Selective Migration (Projects Only)

If you only want to migrate projects and not all data:

1. **Export only projects table:**
   ```bash
   mysqldump -u root -p buildwatch_lgu projects > projects_backup.sql
   ```

2. **Import only projects on VPS:**
   ```bash
   mysql -u your_prod_db_user -p your_prod_db_name < projects_backup.sql
   ```

## Troubleshooting

### Error: "Access denied"
- Check database credentials
- Verify user has proper permissions

### Error: "Table already exists"
- Use `--add-drop-table` flag in mysqldump:
  ```bash
  mysqldump --add-drop-table -u root -p buildwatch_lgu > buildwatch_lgu_backup.sql
  ```

### Error: "File too large"
- Compress the backup:
  ```bash
  mysqldump -u root -p buildwatch_lgu | gzip > buildwatch_lgu_backup.sql.gz
  ```
- On VPS, decompress and import:
  ```bash
  gunzip < buildwatch_lgu_backup.sql.gz | mysql -u your_prod_db_user -p your_prod_db_name
  ```

## Verification Checklist

After migration, verify:
- [ ] All tables are present
- [ ] Project count matches development
- [ ] User accounts are accessible
- [ ] Application starts without errors
- [ ] No database connection errors in logs

