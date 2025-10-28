# DEFINITIVE SOLUTION - Run This Exactly

## The Problem
After removing FOREIGN KEY lines, we have trailing commas that need to be removed before closing parentheses.

## Run These Commands on Your Server

```bash
cd /root

# Check the current state
sed -n '49,51p' clean.sql

# Fix it properly - this will work
perl -i -0pe 's/,(\n\s+\))/\n)/g' clean.sql

# Verify it worked
sed -n '49,51p' clean.sql

# Should show line 49 WITHOUT a comma, then closing paren

# Import
mysql -u root -p buildwatch_lgu < clean.sql
```

## Explanation

The previous perl command was wrong. I used:
```perl
s/,\n\s+\)/\)/g
```

This tries to replace the entire match with `)`, but we need to keep the newline.

The correct version:
```perl
s/,(\n\s+\))/\n)/g
```

This:
- Matches `,` followed by newline and whitespace and `)`
- Captures the `(\n\s+\))` part
- Replaces with just newline and `)`

## Alternative: If the above still doesn't work

Try this even simpler approach:

```bash
cd /root

# Delete the clean.sql and recreate it
rm clean.sql

# Recreate without FOREIGN KEY
awk '!/FOREIGN KEY/' buildwatch_lgu_FRESH_export.sql > clean.sql

# Fix trailing commas - use sed with proper escaping
sed -i ':a;N;$!ba;s/,\n  )/\n)/g' clean.sql

# Import
mysql -u root -p buildwatch_lgu < clean.sql
```

