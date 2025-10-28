# Correct Steps to Import Database (Fixed)

## The Problem with Previous Attempt

The perl regex you ran didn't properly remove all CONSTRAINT lines because:
- Some CONSTRAINT lines END with a comma (line 131)
- Some CONSTRAINT lines DON'T have a comma (line 132)
- The regex was trying to match an optional comma BEFORE the line, not handling the comma AFTER

## The Simple Solution

Run these commands **one at a time**:

```bash
cd /root

# Step 1: Remove all lines containing FOREIGN KEY
awk '!/FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > temp_clean.sql

# Step 2: Fix trailing commas before closing parentheses
# This removes any comma immediately followed by ) ENGINE
perl -pi -e 's/,(\s*\)\s*ENGINE)/$1/g' temp_clean.sql

# Step 3: Also fix any standalone trailing commas on lines before )
sed -i ':a;N;$!ba;s/,\n\s*)/\n)/g' temp_clean.sql

# Step 4: Import
mysql -u root -p buildwatch_lgu < temp_clean.sql
```

## Alternative Even Simpler Method

If the above still has issues, use this single perl command:

```bash
cd /root

perl -i.backup -0pe 's/,?\s*CONSTRAINT[^;]*FOREIGN KEY[^;]*;?\n?//g' buildwatch_lgu_FRESH_export.sql

mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export.sql
```

This uses `[^;]*` instead of `[^\n]*` to match until the semicolon or line break.

## What Went Wrong Originally

Your first perl command used `[^\n]*\n` which would stop at the first newline. But the CONSTRAINT statements might span multiple patterns. Using `[^;]*` is more reliable as it matches until the next semicolon or constraint boundary.

