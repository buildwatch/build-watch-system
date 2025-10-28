# Import Database to Server - Instructions

## ✅ Good News: You have a database file!

**File:** `buildwatch_lgu_database.sql` (1,070 KB)  
**Location:** `C:\Users\BuildWatch\Downloads\Build Watch\`

---

## STEP 1: Upload File to Server

### Method A: Using Hostinger File Manager (Easiest)
1. Login to Hostinger VPS Panel
2. Open "File Manager"
3. Navigate to: `/root/`
4. Click "Upload" button
5. Select: `buildwatch_lgu_database.sql`
6. Click "Upload"
7. Wait for upload to complete

### Method B: Using SCP Command (If you have SSH)
Open PowerShell on your local machine:
```powershell
cd "C:\Users\BuildWatch\Downloads\Build Watch"
scp buildwatch_lgu_database.sql root@YOUR_SERVER_IP:/root/
```

---

## STEP 2: Import on Server (Run in Hostinger Terminal)

SSH into your Hostinger VPS and run these commands:

```bash
# Navigate to root
cd /root

# Verify the file was uploaded
ls -lh buildwatch_lgu_database.sql

# You should see the file size (about 1 MB)

# BACKUP existing database first (just in case)
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_old_backup.sql
# Enter password: buildwatch_123

# IMPORT your local database (this replaces all data)
mysql -u root -p buildwatch_lgu < buildwatch_lgu_database.sql
# Enter password: buildwatch_123

# Wait for it to finish (may take 1-2 minutes)

# Verify import was successful
mysql -u root -p -e "USE buildwatch_lgu; SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as projects FROM projects;"
# Enter password: buildwatch_123
```

---

## STEP 3: Restart Backend

```bash
# Navigate to backend
cd /root/build-watch-system/backend

# Restart backend
pm2 restart buildwatch-backend 2>/dev/null || pm2 start server.js --name "buildwatch-backend"

# Check status
pm2 status
```

---

## STEP 4: Test Website

1. Open browser
2. Visit: https://build-watch.com
3. Try logging in with your credentials
4. Check if data looks correct

---

## TROUBLESHOOTING

If something goes wrong, restore backup:
```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_old_backup.sql
```

---

**Ready to upload! Use Hostinger File Manager or SCP to upload `buildwatch_lgu_database.sql` to your server.**

