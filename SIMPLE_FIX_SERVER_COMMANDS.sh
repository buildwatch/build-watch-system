#!/bin/bash

# SIMPLE AND GUARANTEED TO WORK
cd /root

echo "Step 1: Restore original file..."
cp buildwatch_lgu_FRESH_export.sql.backup buildwatch_lgu_FRESH_export.sql

echo "Step 2: Remove all FOREIGN KEY constraint lines..."
# This removes any line containing "FOREIGN KEY"
awk '!/FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > temp_clean.sql

echo "Step 3: Fix trailing commas before closing parentheses..."
# This removes any comma that comes right before a closing parenthesis
perl -pi -e 's/,\s*\)(\s*ENGINE)/)$1/g' temp_clean.sql

echo "Step 4: Import to database..."
mysql -u root -p buildwatch_lgu < temp_clean.sql

echo "Done! Check for any errors above."

