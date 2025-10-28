# Database Import Instructions - SAFE PROCESS

## ⚠️ IMPORTANT: We'll backup first, then replace!

## STEP 1: BACKUP EXISTING SERVER DATABASE (Run on Hostinger Terminal)

```bash
# SSH into your Hostinger VPS (use your terminal)
# Navigate to a safe location
cd /root

# Create backup of current database
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_backup_$(date +%Y%m%d_%H%M%S).sql

# Enter password when prompted: buildwatch_123

# Verify backup was created
ls -lh buildwatch_lgu_backup_*.sql

# This creates a backup like: buildwatch_lgu_backup_20251026_190000.sql
```

## STEP 2: EXPORT YOUR LOCAL DATABASE (Run on Your Local Machine)

### Option A: Using MySQL Workbench
1. Open MySQL Workbench
2. Connect to your localhost MySQL
3. Right-click on `buildwatch_lgu` database
4. Select "Data Export"
5. Choose "Export to Dump Project Folder"
6. Select all tables
7. Check "Export to Self-Contained File"
8. Choose filename: `buildwatch_lgu_local_export.sql`
9. Click "Start Export"

### Option B: Using Command Line
```bash
# Open CMD or PowerShell on your local machine
cd "C:\Users\BuildWatch\Downloads\Build Watch"

# Export local database
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_local_export.sql

# Enter your local MySQL password when prompted
```

## STEP 3: UPLOAD SQL FILE TO SERVER

Upload `buildwatch_lgu_local_export.sql` to your server using one of these methods:

### Method A: Using SCP (if you have SSH access)
```bash
# In PowerShell on your local machine
scp "C:\Users\BuildWatch\Downloads\Build Watch\buildwatch_lgu_local_export.sql" root@your-server-ip:/root/
```

### Method B: Using Hostinger File Manager
1. Go to Hostinger VPS Panel
2. Open File Manager
3. Navigate to `/root/` folder
4. Upload `buildwatch_lgu_local_export.sql`

### Method C: Using FTP Client
Use FileZilla or similar to upload the file

## STEP 4: IMPORT DATABASE ON SERVER (Run on Hostinger Terminal)

```bash
# SSH into your server terminal
cd /root

# Verify backup exists (SAFETY CHECK)
ls -lh buildwatch_lgu_backup_*.sql

# Verify new export exists
ls -lh buildwatch_lgu_local_export.sql

# Create a new database (optional - keeps old one as backup)
mysql -u root -p -e "CREATE DATABASE buildwatch_lgu_new;"

# Import your local database into the new database
mysql -u root -p buildwatch_lgu_new < buildwatch_lgu_local_export.sql

# Test query to verify import
mysql -u root -p -e "USE buildwatch_lgu_new; SELECT COUNT(*) as user_count FROM users; SELECT COUNT(*) as project_count FROM projects;"

# If everything looks good, rename databases (swapping them)
mysql -u root -p -e "DROP DATABASE IF EXISTS buildwatch_lgu_old;"
mysql -u root -p -e "RENAME DATABASE buildwatch_lgu TO buildwatch_lgu_old;"
mysql -u root -p -e "RENAME DATABASE buildwatch_lgu_new TO buildwatch_lgu;"

# Test again
mysql -u root -p -e "USE buildwatch_lgu; SELECT COUNT(*) as user_count FROM users; SELECT COUNT(*) as project_count FROM projects;"

# If something goes wrong, you can restore from backup:
# mysql -u root -p buildwatch_lgu < buildwatch_lgu_backup_YYYYMMDD_HHMMSS.sql
```

## STEP 5: RESTART BACKEND SERVER

```bash
# Restart the backend to pick up new database
cd /root/build-watch-system/backend

# Stop any running instances
pm2 stop buildwatch-backend 2>/dev/null || true

# Restart backend
pm2 start server.js --name "buildwatch-backend"

# Check logs
pm2 logs buildwatch-backend --lines 50
```

## STEP 6: TEST THE SYSTEM

1. Visit https://build-watch.com
2. Try logging in with your real credentials
3. Check if projects show correctly
4. Check if all features work

## ROLLBACK PLAN (If Something Goes Wrong)

```bash
# Restore from backup
mysql -u root -p buildwatch_lgu < buildwatch_lgu_backup_YYYYMMDD_HHMMSS.sql

# Or restore from old database
mysql -u root -p -e "DROP DATABASE buildwatch_lgu;"
mysql -u root -p -e "RENAME DATABASE buildwatch_lgu_old TO buildwatch_lgu;"
```

---

## SUMMARY

1. ✅ Backup current server database
2. ✅ Export local database
3. ✅ Upload to server
4. ✅ Import into new database
5. ✅ Test and verify
6. ✅ Swap databases
7. ✅ Test again
8. ✅ Keep backup files for safety

