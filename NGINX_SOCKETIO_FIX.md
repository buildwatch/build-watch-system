# Fix Nginx Configuration for Socket.IO Real-Time Updates

## Problem
Socket.IO WebSocket connections are getting 404 errors because Nginx is not configured to proxy `/socket.io/` requests to the backend.

## Solution
Add a Socket.IO location block to your Nginx configuration **BEFORE** the `/api/` location block.

## Step 1: Find Your Nginx Configuration File

SSH into your server and find the active Nginx config:

```bash
# Check which config files exist
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Usually it's one of these:
# - /etc/nginx/sites-available/build-watch
# - /etc/nginx/sites-available/default
# - /etc/nginx/conf.d/build-watch.conf
```

## Step 2: Edit Nginx Configuration

```bash
# Edit your Nginx config (replace with your actual file name)
sudo nano /etc/nginx/sites-available/build-watch
# OR
sudo nano /etc/nginx/sites-available/default
```

## Step 3: Add Socket.IO Location Block

Find the section with your `/api/` location block and add the Socket.IO block **BEFORE** it:

```nginx
# Socket.IO WebSocket proxy - MUST be before /api/ location
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}

# Backend API - This should come AFTER /socket.io/
location /api/ {
    proxy_pass http://localhost:3000/api/;
    # ... rest of your API config
}
```

**IMPORTANT:** The `/socket.io/` location block **MUST** come before the `/api/` location block in your Nginx config, because Nginx matches locations in order and `/socket.io/` is more specific.

## Step 4: Test and Reload Nginx

```bash
# Test Nginx configuration syntax
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
# OR
sudo service nginx reload
```

## Step 5: Verify Socket.IO is Working

1. Open your browser's developer console
2. Visit a project feedback page
3. You should see: `✅ Feedback Socket.IO connected` instead of 404 errors
4. Test real-time updates by posting a comment from another browser/tab

## Complete Example Configuration

Here's a complete example of the relevant sections:

```nginx
server {
    listen 443 ssl http2;
    server_name build-watch.com www.build-watch.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/build-watch.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/build-watch.com/privkey.pem;
    
    # Frontend (Astro app)
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
    }
    
    # Socket.IO WebSocket proxy - MUST be before /api/
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
}
```

## Troubleshooting

### Still getting 404?
- Make sure the `/socket.io/` location block is **before** `/api/` in your config
- Check that `proxy_pass` points to `http://localhost:3000` (without `/socket.io/` at the end)
- Verify backend is running: `pm2 status`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Connection timeout?
- Verify backend Socket.IO server is running on port 3000
- Check firewall: `sudo ufw status`
- Test backend directly: `curl http://localhost:3000/socket.io/`

### WebSocket upgrade fails?
- Ensure `proxy_set_header Upgrade $http_upgrade;` is present
- Ensure `proxy_set_header Connection "upgrade";` is present
- Check that `proxy_http_version 1.1;` is set

