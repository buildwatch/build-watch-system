# Deploy the Changes to Server

## Step-by-Step Deployment

### On Your Local Machine

```bash
cd "C:\Users\BuildWatch\Downloads\Build Watch"

# Add ALL the files we modified
git add frontend/src/config/api.js frontend/src/components/ProjectDetailsModal.astro backend/server.js

# Commit
git commit -m "Fix API URLs and CORS for production deployment - Mixed content error fix"

# Push to repository
git push origin main
```

### On Your Server

```bash
cd /root/build-watch-system

# Pull the changes
git pull origin main

# Restart PM2 to apply changes
pm2 restart all

# Check if it's running
pm2 status

# View logs to confirm it's working
pm2 logs --lines 50
```

## Files Changed
1. ✅ `frontend/src/config/api.js` - Updated API base URL to use HTTP instead of HTTPS
2. ✅ `frontend/src/components/ProjectDetailsModal.astro` - Fixed hardcoded IP address 
3. ✅ `backend/server.js` - Updated CORS configuration to allow build-watch.com domain

