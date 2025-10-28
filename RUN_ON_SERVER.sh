#!/bin/bash
# Copy and paste these commands ONE AT A TIME on your server

cd /root

# Step 1: Check if backup exists
ls -la buildwatch_lgu_FRESH_export.sql.backup

# Step 2: Restore from backup
cp buildwatch_lgu_FRESH_export.sql.backup buildwatch_lgu_FRESH_export.sql

# Step 3: Remove FOREIGN KEY lines (SAFE - this is the clean way)
awk '!/FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > buildwatch_lgu_FRESH_export_clean.sql

# Step 4: Fix the comma issue
# The problem is lines like:  KEY ...),
#                               )
# We need to remove the comma from the KEY line
perl -pi -e 's/,\s*\)(\s*ENGINE=)/)$1/g' buildwatch_lgu_FRESH_export_clean.sql

# Step 5: Import
mysql -u root -p buildwatch_lgu < buildwatch_lgu_FRESH_export_clean.sql

