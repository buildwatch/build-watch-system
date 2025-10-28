# Next Steps After Uploading to Server

## STEP 1: Upload to Server ✅ (Do this first)

Upload `buildwatch_lgu_FRESH_export.sql` to your server.

---

## STEP 2: Run These Commands on Hostinger Terminal

Once uploaded, SSH into your server and run:

```bash
# Navigate to root directory
cd /root

# Verify the file exists
ls -lh buildwatch_lgu_FRESH_export.sql

# You should see: buildwatch_lgu_FRESH_export.sql (about 743 KB)

# BACKUP existing database (safety first!)
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_old_backup.sql
# Password: buildwatch_123

# IMPORT your fresh database (this will REPLACE all data)
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
# Password: buildwatch_123

# Wait for import to complete (1-2 minutes)

# Verify import worked
mysql -u root -p -e "USE buildwatch_lgu; SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as projects FROM projects;"
# Password: buildwatch_123

# You should see real user and project counts now!
```

---

## STEP 3: Restart Backend

```bash
cd /root/build-watch-system/backend

# Restart backend
pm2 restart buildwatch-backend 2>/dev/null || pm2 start server.js --name "buildwatch-backend"

# Check status
pm2 status
```

---

## STEP 4: Test Your Website

1. Visit: https://build-watch.com
2. Try logging in with your credentials
3. Check if all your data is showing correctly!

---

## If Something Goes Wrong

To restore the old database:
```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_old_backup.sql
```

