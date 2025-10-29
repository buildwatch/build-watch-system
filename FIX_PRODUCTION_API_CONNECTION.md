# Fix Production API Connection Issue

## Problem Summary
The deployed Build Watch LGU system is failing because:
1. Frontend files have hardcoded `localhost:3000` API URLs
2. When local dev server is closed, online version stops working
3. Other devices can't connect to the API (trying to access localhost)

## Root Cause
Frontend code is using hardcoded `localhost:3000/api` instead of detecting the production environment and using the correct backend URL.

## Files Fixed

### ✅ Fixed Files:
1. **`frontend/src/config/api.js`** - Updated to automatically detect production environment
2. **`frontend/src/services/home.js`** - Now uses dynamic API URL
3. **`frontend/src/pages/projects.astro`** - Fixed hardcoded localhost fetch call
4. **`frontend/src/islands/ProjectsIsland.jsx`** - Updated to use dynamic API URL
5. **`frontend/src/pages/login/lgu-pmt.astro`** - Fixed login API call

### ⚠️ Backend CORS Status:
- **Already configured correctly** in `backend/server.js`
- Allows: `build-watch.com`, `www.build-watch.com` (both HTTP and HTTPS)

## Critical Issue: HTTPS/HTTP Mixed Content

**IMPORTANT:** If your frontend is served over HTTPS (`https://www.build-watch.com`) and the backend is on HTTP (`http://www.build-watch.com:3000`), browsers will **block** the requests due to mixed content security policy.

### Solutions:

#### Option 1: Use Reverse Proxy (Recommended)
Set up Nginx/Apache reverse proxy to route `/api/*` requests to backend:

```nginx
# Nginx configuration example
location /api/ {
    proxy_pass http://localhost:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /uploads/ {
    proxy_pass http://localhost:3000/uploads/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

Then update API config to use relative URLs: `/api` instead of `:3000/api`

#### Option 2: Backend on HTTPS
Set up SSL certificate for backend on port 3000 (or use different port with SSL)

#### Option 3: Temporary Workaround
Use HTTP for frontend instead of HTTPS (NOT recommended for production)

## Deployment Steps

### Step 1: Commit and Push Changes

On your **local machine**:

```bash
cd "C:\Users\BuildWatch\Downloads\Build Watch"

# Check what files were changed
git status

# Add the changed files
git add frontend/src/config/api.js
git add frontend/src/services/home.js
git add frontend/src/pages/projects.astro
git add frontend/src/islands/ProjectsIsland.jsx
git add frontend/src/pages/login/lgu-pmt.astro

# Commit the changes
git commit -m "Fix API URLs for production - auto-detect environment"

# Push to repository
git push origin main
```

### Step 2: Pull Changes on Server

SSH into your Hostinger server and run:

```bash
# Navigate to your project directory
cd /root/build-watch-system

# Pull the latest changes
git pull origin main

# Verify files were updated
ls -la frontend/src/config/api.js
```

### Step 3: Rebuild Frontend

```bash
cd /root/build-watch-system/frontend

# Install dependencies if needed (usually not necessary)
# npm install

# Build the frontend for production
npm run build
```

### Step 4: Restart Services

```bash
# Restart all PM2 processes
pm2 restart all

# Check status
pm2 status

# View logs to ensure no errors
pm2 logs --lines 50
```

### Step 5: Verify Backend is Running

```bash
# Check if backend is accessible
curl http://localhost:3000/api/health

# Check from external IP (if accessible)
curl http://YOUR_SERVER_IP:3000/api/health
```

**Expected response:**
```json
{"status":"OK","timestamp":"...","environment":"production","database":"Connected"}
```

### Step 6: Test Production

1. **Open browser console** (F12) on `https://www.build-watch.com/projects`
2. **Check Network tab** - verify API requests are going to:
   - `https://www.build-watch.com:3000/api/...` (if HTTPS backend works)
   - OR `http://www.build-watch.com:3000/api/...` (if HTTP only)

3. **If you see CORS errors**:
   - Backend CORS might need to be updated
   - OR backend port 3000 is not publicly accessible

4. **If you see "Mixed Content" errors**:
   - Frontend is HTTPS but backend is HTTP
   - Need to set up reverse proxy (see Option 1 above)

## Troubleshooting

### Issue: Still seeing "Failed to load projects"

**Check 1:** Is backend running?
```bash
pm2 status
# Should show buildwatch-backend as "online"
```

**Check 2:** Is backend accessible on port 3000?
```bash
# From server
curl http://localhost:3000/api/health

# From external device (if firewall allows)
curl http://YOUR_SERVER_IP:3000/api/health
```

**Check 3:** Check browser console for specific error
- CORS error → Backend CORS config issue
- Mixed content → HTTPS/HTTP mismatch
- Network error → Backend not accessible from client
- 404 error → Wrong API URL path

### Issue: Backend not accessible from external devices

**Problem:** Port 3000 might not be publicly accessible

**Solution:** 
1. Check firewall: `sudo ufw allow 3000`
2. Or use reverse proxy (Nginx) to route `/api` to `localhost:3000`

### Issue: Mixed Content (HTTPS frontend, HTTP backend)

**Problem:** Modern browsers block HTTP requests from HTTPS pages

**Solution:** Set up reverse proxy (see Option 1 above) OR configure backend with SSL

## Next Steps

1. ✅ Deploy the fixed files (done above)
2. ⚠️ Verify backend is accessible via HTTPS or set up reverse proxy
3. ⚠️ Test from multiple devices to ensure API works everywhere
4. ⚠️ Monitor browser console for any remaining hardcoded localhost URLs

## Remaining Files with localhost (Lower Priority)

These files still have hardcoded localhost but are less critical (dashboard pages that require authentication):
- `frontend/src/pages/dashboard/**/*.astro` - Various dashboard pages
- `frontend/src/components/ProjectDetailsModal.astro` - Already has some detection logic
- `frontend/src/pages/dashboard/iu-implementing-office/modules/*.astro` - IU dashboard pages

**Recommendation:** Update these as you encounter issues, or create a global utility function that all files can import.

