# Remove Foreign Keys and Import

## The Problem:
The SQL file has foreign key constraints that are incompatible. We need to remove them before importing.

## Solution: Remove Foreign Keys from SQL File

Run these commands:

### Step 1: Create a copy without foreign keys
```bash
cd /root
cp buildwatch_lgu_FRESH_export.sql buildwatch_lgu_FRESH_export_no_fk.sql
```

### Step 2: Remove all foreign key definitions
```bash
sed -i '/CONSTRAINT.*FOREIGN KEY/,/REFERENCES/d' buildwatch_lgu_FRESH_export_no_fk.sql
```

### Step 3: Import the modified file
```bash
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export_no_fk.sql
```

Enter password: `buildwatch_123`

---

## Alternative: Simple Approach

Try dropping all tables first, then importing:

```bash
mysql -u root -p buildwatch_lgu <<EOF
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS buildwatch_lgu_temp;
CREATE DATABASE buildwatch_lgu_temp;
USE buildwatch_lgu_temp;
SOURCE /root/buildwatch_lgu_FRESH_export.sql;
EXIT;
EOF
```

Then if that works, rename the databases.

---

## Best Solution: Use MySQL Workbench to Export Without Foreign Keys

We need to re-export your local database from MySQL Workbench WITHOUT foreign key constraints.

1. In MySQL Workbench: Server > Data Export
2. Select buildwatch_lgu database
3. In Advanced Options, look for "Skip foreign keys" option
4. Check it
5. Export again

But let's try the command line fix first!

**Run these commands:**
```bash
cd /root
cp buildwatch_lgu_FRESH_export.sql buildwatch_lgu_FRESH_export_no_fk.sql
sed -i 's/CONSTRAINT `[^`]*` FOREIGN KEY [^;]*;//g' buildwatch_lgu_FRESH_export_no_fk.sql
sed -i 's/,[[:space:]]*CONSTRAINT `[^`]*` FOREIGN KEY [^;]*//g' buildwatch_l到这里_fresh_export_no_fk.sql
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export_no_fk.sql
```

Enter password: `buildwatch_123`

