# Critical Fix: Nginx Reverse Proxy Configuration for Production API

## Problem
The production frontend (`https://www.build-watch.com`) is trying to connect to the backend API, but:
1. Frontend is HTTPS, backend is HTTP on port 3000
2. Browsers block mixed content (HTTPS → HTTP)
3. API requests are failing with "Failed to load projects"

## Solution: Nginx Reverse Proxy

The fix involves:
1. ✅ **Updated API config** to use `/api` path (same domain, no port) - **DONE**
2. ⚠️ **Configure Nginx** to proxy `/api` requests to `localhost:3000` - **MUST DO**

## Step 1: Check Current Nginx Configuration

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Check if Nginx is installed
nginx -v

# Find Nginx config file for build-watch.com
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# View current config (if exists)
cat /etc/nginx/sites-available/build-watch
# OR
cat /etc/nginx/sites-available/default
```

## Step 2: Configure Nginx Reverse Proxy

### Option A: If config already exists, edit it:

```bash
nano /etc/nginx/sites-available/build-watch
# OR
nano /etc/nginx/sites-available/default
```

### Option B: Create new config:

```bash
nano /etc/nginx/sites-available/build-watch
```

### Add/Update Nginx Configuration:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name build-watch.com www.build-watch.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name build-watch.com www.build-watch.com;
    
    # SSL certificates (adjust path as needed)
    ssl_certificate /etc/letsencrypt/live/build-watch.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/build-watch.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend (Astro app on port 4321)
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Backend API - CRITICAL FIX
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        
        # Handle preflight requests
        if ($request_method = OPTIONS) {
            return 204;
        }
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # File uploads
    location /uploads/ {
        proxy_pass http://localhost:3000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (if serving directly)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:4321;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Note:** The key line is `proxy_pass http://localhost:3000/api/;` which routes all `/api/*` requests to your backend.

## Step 3: Enable and Test Nginx Configuration

```bash
# Enable the site (if new)
ln -s /etc/nginx/sites-available/build-watch /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx
# OR
service nginx reload
```

## Step 4: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# Should show:
# - buildwatch-backend (online, port 3000)
# - buildwatch-frontend (online, port 4321)

# Test backend directly
curl http://localhost:3000/api/health

# Test through Nginx proxy
curl https://www.build-watch.com/api/health
```

## Step 5: Deploy Frontend Changes

The API config has been updated. Now deploy:

```bash
# On local machine
git add frontend/src/config/api.js
git commit -m "Fix: Use same-domain API URLs for production HTTPS"
git push origin main

# On server
cd /root/build-watch-system
git pull origin main

# Rebuild frontend
cd frontend
npm run build

# Restart frontend (if needed)
pm2 restart buildwatch-frontend
```

## Step 6: Test in Browser

1. Open `https://www.build-watch.com/projects` in browser
2. Open Developer Console (F12)
3. Go to Network tab
4. Try to load the projects page
5. Check API requests - they should go to:
   - ✅ `https://www.build-watch.com/api/...` (correct)
   - ❌ `https://www.build-watch.com:3000/api/...` (wrong, will fail)
   - ❌ `http://www.build-watch.com:3000/api/...` (wrong, blocked by browser)

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause:** Backend is not running or Nginx can't connect to `localhost:3000`

**Fix:**
```bash
# Check backend is running
pm2 status

# Start backend if not running
pm2 start buildwatch-backend

# Check backend logs
pm2 logs buildwatch-backend

# Test backend directly
curl http://localhost:3000/api/health
```

### Issue: 404 Not Found

**Cause:** Nginx proxy_pass URL is incorrect

**Fix:**
- Check `proxy_pass` line in Nginx config: should be `http://localhost:3000/api/;`
- Make sure there's a trailing slash `/` after `/api/`
- Reload Nginx: `systemctl reload nginx`

### Issue: CORS Errors

**Cause:** Backend CORS not configured for production domain

**Fix:**
- Backend CORS is already configured in `backend/server.js`
- Make sure Nginx forwards headers correctly (check `proxy_set_header` lines)

### Issue: SSL Certificate Errors

**Cause:** SSL certificates not configured or expired

**Fix:**
```bash
# Check if Let's Encrypt is installed
which certbot

# Renew certificates
certbot renew

# Or install certificates (if not done)
certbot --nginx -d build-watch.com -d www.build-watch.com
```

## Alternative: If Nginx Not Available

If you cannot configure Nginx reverse proxy, you would need to:
1. Configure backend to use HTTPS directly (complex, requires SSL certificates for backend)
2. OR use a different hosting setup

However, **Nginx reverse proxy is the recommended and standard solution** for this scenario.

## Verification Checklist

- [ ] Nginx is installed and running
- [ ] Nginx config file created/updated with reverse proxy
- [ ] Nginx config tested (`nginx -t`)
- [ ] Nginx reloaded (`systemctl reload nginx`)
- [ ] Backend is running on port 3000 (`pm2 status`)
- [ ] Frontend is running on port 4321 (`pm2 status`)
- [ ] Backend responds to direct test (`curl http://localhost:3000/api/health`)
- [ ] Backend responds through Nginx (`curl https://www.build-watch.com/api/health`)
- [ ] Browser shows API requests going to `https://www.build-watch.com/api/...`
- [ ] Projects page loads without errors
- [ ] No mixed content errors in browser console

