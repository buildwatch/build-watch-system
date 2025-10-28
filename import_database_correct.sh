#!/bin/bash

# Correct solution for removing FOREIGN KEY constraints from SQL
cd /root

echo "Step 1: Creating clean SQL file..."

# Step 1: Remove all lines containing CONSTRAINT and FOREIGN KEY
# Also remove the trailing comma from the previous line if the constraint ends with a comma
awk '
/CONSTRAINT.*FOREIGN KEY/ {
    # Check if this line ends with a comma
    if ($0 ~ /,\s*$/) {
        # Remove the comma from the previous line (if it exists)
        if (prev != "" && prev ~ /,$/) {
            sub(/,$/, "", prev)
        }
    }
    next
}
{
    print prev
    prev = $0
}
END {
    print prev
}' buildwatch_lgu_FRESH_export.sql > temp_clean.sql

echo "Step 2: Fixing any remaining trailing commas before closing parentheses..."
# Remove trailing commas before ) ENGINE
sed -i 's/,[[:space:]]*)/ )/g' temp_clean.sql

echo "Step 3: Importing database..."
mysql -u root -p buildwatch_lgu < temp_clean.sql

echo "Done!"
