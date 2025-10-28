#!/bin/bash

# Clean solution for importing SQL file with foreign key constraints removed
# This properly handles trailing commas

cd /root

# Remove CONSTRAINT lines containing FOREIGN KEY
awk '!/CONSTRAINT.*FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > temp_clean.sql

# Fix the trailing comma issue: where we have lines ending with comma
# followed by a closing parenthesis, remove the comma
sed -i -z 's/,\n\s*)/\n)/g' temp_clean.sql

# Also handle the case where we might have whitespace: ",  )" should become ")"
sed -i -z 's/,\s*\n\s*)/\n)/g' temp_clean.sql

echo "Clean SQL file created: temp_clean.sql"
echo "Now importing..."

mysql -u root -p buildwatch_lgu < temp_clean.sql

echo "Import completed!"
