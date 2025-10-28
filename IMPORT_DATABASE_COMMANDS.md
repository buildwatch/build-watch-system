# Import Database Commands - Copy These!

## Step-by-Step Commands:

### Open Hostinger Terminal:
1. Go to your Hostinger VPS panel
2. Click the **"Terminal"** button (top right)
3. A terminal window will open

---

## Copy and Run These Commands ONE BY ONE:

### 1. Navigate and Verify File
```bash
cd /root
ls -lh buildwatch_lgu_FRESH_export.sql
```
**Expected:** You should see the file (743 KB)

---

### 2. Backup Existing Database (SAFETY FIRST!)
```bash
mysqldump -u root -p buildwatch_lgu > buildwatch_lgu_old_backup.sql
```
**Enter password when prompted:** `buildwatch_123`

**Wait for it to finish** (may take 30 seconds)

---

### 3. Verify Backup Created
```bash
ls -lh buildwatch_lgu_old_backup.sql
```
**Expected:** Backup file exists (several MB)

---

### 4. Import Your Fresh Database (This Replaces Everything!)
```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
```
**Enter password when prompted:** `buildwatch_123`

**Wait for it to finish** (may take 1-2 minutes)

---

### 5. Verify Import Worked
```bash
mysql -u root -p -e "USE buildwatch_lgu; SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as projects FROM projects;"
```
**Enter password when prompted:** `buildwatch_123`

**Expected:** You should see actual user and project counts!

---

## Done! Database Imported!

**Now restart your backend server:**

```bash
cd /root/build-watch-system/backend
pm2 restart buildwatch-backend 2>/dev/null || pm2 start server.js --name "buildwatch-backend"
pm2 status
```

---

## If Something Goes Wrong:

To restore from backup:
```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_old_backup.sql
```

---

**Run these commands in the Hostinger Terminal and let me know the results!**

