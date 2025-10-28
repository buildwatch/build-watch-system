#!/bin/bash
cd /root

echo "Step 1: Restore original..."
cp buildwatch_lgu_FRESH_export.sql.backup buildwatch_lgu_FRESH_export.sql

echo "Step 2: Remove FOREIGN KEY lines..."
awk '!/FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > clean.sql

echo "Step 3: Fix trailing commas..."
# This perl command treats the file as one string (-0777)
# and replaces comma+newline+whitespace+closing paren with newline+whitespace+closing paren
perl -0777 -pi -e 's/,\n\s+\)/) ENGINE=InnoDB/g' clean.sql

echo "Step 4: Actually, let me use a better approach..."
# Let me recreate this properly
awk '!/FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > clean2.sql

# Use python to properly fix the trailing commas
python3 << 'PYTHON_SCRIPT'
import re

with open('clean2.sql', 'r') as f:
    content = f.read()

# Replace ", \n  )" with "\n  )"
content = re.sub(r',\s*\n\s+\)', r'\n)', content)

with open('clean2.sql', 'w') as f:
    f.write(content)
PYTHON_SCRIPT

echo "Step 5: Import..."
mysql -u root -p buildwatch_lgu < clean2.sql

echo "Done!"

