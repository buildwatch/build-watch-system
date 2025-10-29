# Complete Nginx Reverse Proxy Setup Guide

## Step 1: Check Current Setup (Run on Server)

SSH into your server and run these commands:

```bash
# 1. Check Nginx is installed
nginx -v

# 2. Check Nginx status
systemctl status nginx

# 3. List configuration files
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# 4. Check for existing build-watch config
ls -la /etc/nginx/sites-available/ | grep -i build
ls -la /etc/nginx/sites-available/ | grep -i watch

# 5. View current default config (if it exists)
cat /etc/nginx/sites-available/default | head -30

# 6. Verify ports are correct
pm2 status
# brand: Check frontend is on 4321, backend on 3000
```

**Share the output with me, especially:**
- Files in `sites-available/` and `sites-enabled/`
- Whether a config file for build-watch.com exists
- Current config content (first 30 lines)

## Step 2: Backup Existing Configuration

```bash
# Backup current config (if exists)
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d)

# Or if you have a custom config:
sudo cp /etc/nginx/sites-available/build-watch /etc/nginx/sites-available/build-watch.backup.$(date +%Y%m%d)
```

## Step 3: Create/Edit Nginx Configuration

### Option A: If you have a config file already

```bash
sudo nano /etc/nginx/sites-available/build-watch
# OR
sudo nano /etc/nginx/sites-available/default
```

### Option B: Create new config file

```bash
sudo nano /etc/nginx/sites-available/build-watch
```

Then paste the configuration from `nginx_config_template.conf` (I'll provide the exact config after you share Step 1 results).

## Step 4: Enable the Site (if new config)

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/build-watch /etc/nginx/sites-enabled/build-watch

# Remove default site (if it exists and conflicts)
sudo rm /etc/nginx/sites-enabled/default  # Only if needed
```

## Step 5: Test Configuration

```bash
# Test Nginx configuration syntax
sudo nginx -t

# If test passes, you should see:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Step 6: Reload Nginx

```bash
# Reload Nginx (applies config without downtime)
sudo systemctl reload nginx

# OR restart if reload doesn't work
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

## Step 7: Verify Backend is Accessible

```bash
# Test backend directly
curl http://localhost:3000/api/health

# Test backend through Nginx proxy
curl https://www.build-watch.com/api/health

# Both should return JSON response
```

## Step 8: Test Frontend

1. Open browser: `https://www.build-watch.com/projects`
2. Open Developer Console (F12)
3. Check Network tab
4. Verify API requests go to: `https://www.build-watch.com/api/...` (NOT `:3000`)
5. Projects should load without errors

## Troubleshooting

### If nginx -t fails:
- Check the error message
- Common issues: missing semicolons, typos, wrong paths
- Share the error and I'll help fix it

### If backend not accessible:
```bash
# Check backend is running
pm2 status

# Check backend logs
pm2 logs buildwatch-backend --lines 50

# Test backend directly
curl http://localhost:3000/api/health
```

### If 502 Bad Gateway:
- Backend is not running or not accessible from Nginx
- Check: `pm2 status` and `curl http://localhost:3000/api/health`

### If 404 Not Found:
- Check `proxy_pass` line in Nginx config
- Ensure it ends with `/` after `/api/`
- Example: `proxy_pass http://localhost:3000/api/;`

### If CORS errors persist:
- Backend CORS should already be configured
- Check backend logs for CORS-related errors
- Verify backend allows `https://www.build-watch.com` origin

## Next Steps After Configuration

Once Nginx is configured:
1. ✅ API requests will work (no more `:3000` in URLs)
2. ✅ HTTPS frontend can connect to backend
3. ✅ All devices can access the API
4. ✅ Login will work from external devices
5. ✅ Projects page will load correctly

