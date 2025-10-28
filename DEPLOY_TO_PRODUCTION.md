# Deploy Changes to Production

## Files Changed
1. ✅ `frontend/src/config/api.js` - Fixed API base URL
2. ✅ `frontend/src/components/ProjectDetailsModal.astro` - Fixed hardcoded IP
3. ✅ `frontend/src/pages/dashboard/sysadmin/modules/user-management.astro` - Fixed API URL with environment detection
4. ✅ `backend/server.js` - Updated CORS configuration

## Step 1: Commit and Push from Local Machine

Open PowerShell or Git Bash on your local machine and run:

```bash
# Navigate to your project directory
cd "C:\Users\BuildWatch\Downloads\Build Watch"

# Check what files were changed
git status

# Add all the changed files
git add frontend/src/config/api.js
git add frontend/src/components/ProjectDetailsModal.astro
git add frontend/src/pages/dashboard/sysadmin/modules/user-management.astro
git add backend/server.js

# Commit the changes
git commit -m "Fix API URLs and CORS for production - enable user management"

# Push to repository
git push origin main
```

## Step 2: Pull Changes on Server

SSH into your Hostinger server or use their web terminal and run:

```bash
# Navigate to your project directory
cd /root/build-watch-system

# Pull the latest changes
git pull origin main

# Verify the files were updated
echo "Checking if files were updated..."
ls -la frontend/src/config/api.js
ls -la backend/server.js
```

## Step 3: Rebuild Frontend (If Needed)

```bash
cd /root/build-watch-system/frontend

# Install dependencies if needed
npm install

# Build the frontend
npm run build
```

## Step 4: Restart Services

```bash
# Restart all PM2 processes
pm2 restart all

# Check if services are running
pm2 list

# View logs to make sure there are no errors
pm2 logs --lines 50
```

## Step 5: Verify the Fix

1. Go to `https://build-watch.com/dashboard/sysadmin/modules/user-management`
2. Check if users are now showing in the table
3. Check browser console (F12) for any errors

## Troubleshooting

If users still don't show:

```bash
# Check backend logs for errors
pm2 logs --lines 100

# Check if database has users
mysql -u root -p buildwatch_lgu -e "SELECT COUNT(*) FROM users;"

# Test backend health
curl http://localhost:3000/api/health
```

