# Deploy the API Configuration Fixes to Server

## Option 1: Push to Git and Pull on Server (Recommended)

### Step 1: Commit and Push Your Changes

On your **local machine**:

```bash
cd "C:\Users\BuildWatch\Downloads\Those Watch"

# Check what files were changed
git status

# Add the changed files
git add frontend/src/config/api.js
git add backend/server.js

# Commit the changes
git commit -m "Fix API URL and CORS for production server"

# Push to repository
git push origin main
```

### Step 2: Pull Changes on Server

On your **server**:

```bash
# Navigate to your project directory
cd /root/build-watch-system

# Pull the latest changes
git pull origin main

# Restart PM2 to apply changes
pm2 restart all
```

## Option 2: Manually Edit Files on Server (Faster)

If you want to skip git, manually edit the files on your server:

### Edit Backend File

```bash
# Edit backend server.js
nano /root/build-watch-system/backend/server.js
```

Find this section (around line 52-63):
```javascript
app.use(cors({
  origin: [
    'http://localhost:4321',
    'http://localhost:4322',
  ],
```

Change to:
```javascript
app.use(cors({
  origin: [
    'http://localhost:4321',
    'http://localhost:4322',
    'https://build-watch.com',
    'http://build-watch.com',
  ],
```

Save (Ctrl+O, Enter, Ctrl+X)

### Edit Frontend File

```bash
# Edit frontend API config
nano /root/build-watch-system/frontend/src/config/api.js
```

Change line 3 and 8:
```javascript
export const API_BASE_URL = 'https://build-watch.com:3000/api';

export const API_CONFIG = {
  development: 'http://localhost:3000/api',
  production: 'https://build-watch.com:3000/api',
```

Save (Ctrl+O, Enter, Ctrl+X)

### Restart Services

After editing:

```bash
# Restart PM2
pm2 restart all

# Check status
pm2 status

# View logs
pm2 logs
```

## Verify the Fix

After restarting, test the login page again. You should no longer see the CORS error in the console.

