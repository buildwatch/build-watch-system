#!/bin/bash

# Script to properly remove foreign key constraints from SQL export
# This fixes the syntax errors caused by previous attempts

SQL_FILE="buildwatch_lgu_FRESH_export.sql"
CLEAN_FILE="buildwatch_lgu_FRESH_export_clean.sql"

echo "Step 1: Creating clean SQL file without foreign keys..."

# Use awk to properly handle the trailing comma issue
# When we encounter a CONSTRAINT...FOREIGN KEY line, we skip it
# But we also need to handle the trailing comma from the previous line
awk '{
    # If this line contains CONSTRAINT and FOREIGN KEY, skip it
    if ($0 ~ /CONSTRAINT.*FOREIGN KEY/) {
        next
    }
    
    # If the previous line was removed (consequence), this line might need adjustment
    # We'll print as-is for now
    print
}' "$SQL_FILE" > "$CLEAN_FILE"

echo "Step 2: Fixing trailing commas before closing parentheses..."

# Now fix any trailing commas that are followed immediately by ) ENGINE
sed -i 's/,$\n/\\n/g' "$CLEAN_FILE"  # Temporarily join lines
sed -i 's/,)/\)/g' "$CLEAN_FILE"      # Remove comma before closing paren
sed -i 's/\\n/\n/g' "$CLEAN_FILE"     # Restore newlines

echo "Step 3: Running import..."
mysql -u root -p buildwatch_lgu < "$CLEAN_FILE"

echo "Import completed! Check for any errors above."
