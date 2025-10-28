# Fix MySQL Password

## The Problem

The .env file has the wrong MySQL password: `buildwatch_123`

But when you imported the database earlier, you used a different password. We need to find that password and update the .env file.

## Solution

### Option 1: If You Remember Your MySQL Password

Update the .env file with the correct password:

```bash
cd /root/build-watch-system/backend

# Edit the .env file
nano .env

# Change this line:
# DB_PASS=buildwatch_123
# To your actual MySQL root password

# Save with Ctrl+O, Enter, Ctrl+X
```

### Option 2: Test Different Passwords

Try to connect to MySQL to find the right password:

```bash
# Try common passwords
mysql -u root -p

# Enter password when prompted, or press Enter for no password

# If that doesn't work, try:
mysql -u root -p'buildwatch_123'

# Or try with empty password:
mysql -u root
```

### Option 3: Check History or Documentation

Look for where you documented the MySQL password earlier in this session. The password you used when running:
```bash
mysql -u root -p buildwatch_lgu < clean.sql
```

## After Fixing the Password

Once you update the .env file, restart the backend:

```bash
# Restart backend
pm2 restart buildwatch-backend

# Check if it works
pm2 logs buildwatch-backend --lines 20

# You should see:
# ✅ Database connection established successfully.
# 🚀 Build Watch LGU Server running on port 3000
```

