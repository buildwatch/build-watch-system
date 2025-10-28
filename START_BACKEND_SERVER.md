# Start Backend Server on Production

## The Problem

The logs show `ECONNREFUSED` errors - this means the **backend server is not running**. The frontend is trying to connect to port 3000 but there's nothing listening there.

## Solution: Start the Backend

Run these commands on your server:

```bash
# Step 1: Check PM2 status
pm2 list

# You should see only 'buildwatch-frontend' running
# There should be a backend service too, but it's missing

# Step 2: Navigate to backend directory
cd /root/build-watch-system/backend

# Step 3: Check if .env file exists
ls -la .env

# If it doesn't exist, create it (we did this earlier)
cat .env

# Step 4: Start the backend with PM2
pm2 start server.js --name buildwatch-backend

# Step 5: Check if it's running
pm2 list

# Step 6: Check backend logs
pm2 logs buildwatch-backend --lines 50

# Step 7: Save PM2 configuration so it restarts on reboot
pm2 save
pm2 startup
```

## What You Should See

When you run `pm2 list`, you should see TWO processes:
1. `buildwatch-frontend` (already running)
2. `buildwatch-backend` (needs to be started)

## Verify Backend is Running

After starting, check the logs:

```bash
pm2 logs buildwatch-backend --lines 20
```

You should see:
```
✅ Database connection established successfully.
🚀 Build Watch LGU Server running on port 3000
```

## If You Get Errors

If you see database connection errors:

```bash
cd /root/build-watch-system/backend

# Check .env file
cat .env

# Should show:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASS=buildwatch_123  (or your MySQL password)
# DB_NAME=buildwatch_lgu
```

If the password is wrong, edit it:
```bash
nano .env
# Update DB_PASS with correct password
# Save with Ctrl+O, Enter, Ctrl+X
```

Then restart:
```bash
pm2 restart buildwatch-backend
```

