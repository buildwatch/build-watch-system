#!/bin/bash
cd /root

echo "Step 1: Check what's at lines 49-51 in clean.sql"
sed -n '49,51p' clean.sql

echo ""
echo "Step 2: Now let's fix it properly..."
echo "The issue is that we need to remove the comma from line 49"

# Let's manually check and fix the pattern
# We need to match: comma + newline + spaces + closing paren
perl -i -0pe 's/,(\n\s*\))/$1/g' clean.sql

echo ""
echo "Step 3: Check again after fix"
sed -n '49,51p' clean.sql

echo ""
echo "Step 4: Import"
mysql -u root -p buildwatch_lgu < clean.sql

