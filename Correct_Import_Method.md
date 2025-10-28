# Correct Import Method - Fix Foreign Key Error

## The Problem:
The SQL file contains CREATE TABLE statements with foreign key constraints that conflict with existing data types.

## Solution: Import Without Foreign Key Constraints

Run these commands ONE BY ONE:

### Step 1: Connect to MySQL and disable foreign key checks
```bash
mysql -u root -p buildwatch_lgu
```
Enter password: `buildwatch_123`

### Step 2: Once in MySQL prompt, run this:
```sql
SET FOREIGN_KEY_CHECKS = 0;
SOURCE /root/buildwatch_lgu_FRESH_export.sql;
SET FOREIGN_KEY_CHECKS = 1;
EXIT;
```

---

## OR: One-Line Command

Run this single command:

```bash
mysql -u root -p buildwatch_lgu <<EOF
SET FOREIGN_KEY_CHECKS = 0;
SOURCE /root/buildwatch_lgu_FRESH_export.sql;
SET FOREIGN_KEY_CHECKS = 1;
EOF
```

Enter password: `buildwatch_123` (once, when prompted)

---

## Alternative: Import Without Constraints

First, let's create a modified SQL file without foreign key constraints:

```bash
sed -i 's/CONSTRAINT.*FOREIGN KEY.*//' /root/buildwatch_lgu_FRESH_export.sql
```

Then import:

```bash
mysql -u root -p buildwatch_lgu < /root/buildwatch_lgu_FRESH_export.sql
```

---

**Try the "OR: One-Line Command" method first!**

