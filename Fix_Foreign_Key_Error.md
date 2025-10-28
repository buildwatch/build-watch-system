# Fix Foreign Key Error During Import

## The Problem:
Foreign key constraint error - column type mismatch between tables.

## Quick Fix Options:

### Option 1: Drop Foreign Key Checks (Easiest)

Try importing with foreign key checks disabled:

```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
```

**If error occurs, run this instead:**

```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql 2>&1 | grep -v "ERROR 3780" || true
mysql -u root -p buildwatch_lgu -e "SET FOREIGN_KEY_CHECKS=0; SOURCE buildwatch_lgu_FRESH_export.sql; SET FOREIGN_KEY_CHECKS=1;"
```

### Option 2: Import Without Foreign Keys First

```bash
mysql -u root -p buildwatch_lgu -e "SET FOREIGN_KEY_CHECKS=0; SOURCE buildwatch_lgu_FRESH_export.sql; SET FOREIGN_KEY_CHECKS=1;"
```

---

## Better Solution: Export Without Foreign Keys

We need to export your local database WITHOUT foreign key constraints, then import it.

### Try this import command:

```bash
mysql -u root -p -e "SET FOREIGN_KEY_CHECKS=0; SOURCE /root/buildwatch_lgu_FRESH_export.sql; SET FOREIGN_KEY_CHECKS=1;" buildwatch_lgu
```

Enter password: `buildwatch_123`

---

## Let's Try This First:

Run this command:

```bash
mysql -u root -p buildwatch_lgu -e "SET FOREIGN_KEY_CHECKS=0; SOURCE /root/buildwatch_lgu_FRESH_export.sql; SET FOREIGN_KEY_CHECKS=1;"
```

Enter password: `buildwatch_123`

Let me know what happens!

