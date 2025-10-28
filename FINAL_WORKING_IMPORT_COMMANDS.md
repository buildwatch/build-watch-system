# FINAL WORKING SOLUTION for Database Import

## Problem Analysis

Your perl command failed because it was looking for a **newline** between `CONSTRAINT` and `FOREIGN KEY`, but in your SQL file they're on the **same line**.

Looking at line 132:
```sql
  CONSTRAINT `articles_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
```

The CONSTRAINT and FOREIGN KEY are on the same line!

## The Working Solution

Run these commands **in order**:

```bash
cd /root

# Step 1: Remove ALL lines that contain FOREIGN KEY
grep -v "FOREIGN KEY" buildwatch_lgu_FRESH_export.sql > temp_clean.sql

# Step 2: Fix trailing commas before closing parentheses
# This handles cases where KEY lines end with comma but next line is )
sed -i ':a;N;$!ba;s/,\n  )/\n  )/g' temp_clean.sql

# Alternative to Step 2 if above doesn't work:
# sed -i 's/,\s*$//g;N;s/,\n  )/\n  )/g' temp_clean.sql

# Step 3: Import
mysql -u root -p buildwatch_lgu < temp_clean.sql
```

## Even Simpler Alternative

If you want to fix the original file in place and then import:

```bash
cd /root

# Restore original if needed
# cp buildwatch_lgu_FRESH_export.sql.backup buildwatch_lgu_FRESH_export.sql

# Remove all FOREIGN KEY lines
sed -i '/FOREIGN KEY/d' buildwatch_lgu_FRESH_export.sql

# Fix trailing commas
sed -i ':a;N;$!ba;s/,\n  )/\n  )/g' buildwatch_lgu_FRESH_export.sql

# Import
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
```

## Why Your Perl Command Failed

Your command:
```perl
perl -i.backup -0pe 's/,?\s*\n\s*CONSTRAINT[^\n]*FOREIGN KEY[^\n]*\n//g'
```

This pattern expects:
- Optional comma
- Newline
- CONSTRAINT
- Something
- FOREIGN KEY  <-- expects newline before this
- Something  
- Newline

But the actual pattern is **all on one line**: `CONSTRAINT ... FOREIGN KEY ...`

## The Correct Perl Version

If you prefer perl, use this instead:

```bash
cd /root

perl -i.backup -0pe 's/,?\s*CONSTRAINT[^)]*FOREIGN KEY[^)]*\)?(,)?\n?//g' buildwatch_lgu_FRESH_export.sql

mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
```

This matches: optional comma, CONSTRAINT, anything until ), FOREIGN KEY, anything until closing paren or comma, optional newline.

