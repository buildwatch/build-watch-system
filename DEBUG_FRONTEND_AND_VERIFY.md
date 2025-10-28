# Debug Frontend and Verify Configuration

## Step 1: View Frontend Logs

```bash
# Check PM2 processes
pm2 list

# View frontend logs
pm2 logs buildwatch-frontend --lines 100

# Press Ctrl+C to stop following
```

## Step 2: Search for Old IP in Frontend Code

```bash
cd /root/build-watch-system/frontend

# Search for the old IP
grep -r "148.230.96.155" src/ dist/

# Search for hardcoded localhost:3000
grep -r "localhost:3000" src/ dist/

# If found in dist/, rebuild needed
```

## Step 3: Rebuild Frontend with Latest Code

```bash
cd /root/build-watch-system

# Pull latest code
git pull origin main

# Rebuild frontend
cd frontend
npm run build

# Restart frontend
pm2 restart buildwatch-frontend
```

## Step 4: Clear Browser Cache

**In your browser:**
1. Press F12 (open developer tools)
2. Right-click on the refresh button
3. Choose "Empty Cache and Hard Reload"
4. OR go to Application tab > Clear storage > Clear site data

## Step 5: Log Out and Log In Again

1. Click logout
2. Clear localStorage (F12 > Application > Local Storage > Clear)
3. Log in fresh

