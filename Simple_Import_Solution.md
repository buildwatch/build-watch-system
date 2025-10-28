# Simple Import Solution

## Run These Commands:

```bash
cd /root

# Modify the SQL file to remove foreign keys inline
sed -i 's/ADD CONSTRAINT [^,]* FOREIGN KEY[^;]*;//' buildwatch_lgu_FRESH_export.sql

# Now try to import
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
```

Enter password: `buildwatch_123`

---

If that still fails, try this more aggressive approach:

```bash
cd /root

# Backup current file
cp buildwatch_lgu_FRESH_export.sql buildwatch_lgu_FRESH_export_backup.sql

# Remove all lines containing FOREIGN KEY
grep -v "FOREIGN KEY" buildwatch_lgu_FRESH_export.sql > buildwatch_lgu_FRESH_export_clean.sql

# Import the clean version
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export_clean.sql
```

Enter password: `buildwatch_123`

---

**Let me know which command works!**

