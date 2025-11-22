# WebSocket / Socket.IO Reverse Proxy Configuration Guide

## Problem
Socket.IO connections fail with "Error during WebSocket handshake: Unexpected response code: 400" when behind a reverse proxy.

## Solution
Your reverse proxy (Nginx/Caddy) needs to be configured to properly handle WebSocket upgrades.

## Nginx Configuration

Add this to your Nginx server block for `www.build-watch.com`:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name www.build-watch.com build-watch.com;

    # SSL configuration (if using SSL)
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # Frontend (Astro)
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific settings
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400; # 24 hours for long-lived connections
        proxy_send_timeout 86400;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend uploads
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Important:** After updating Nginx config:
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload Nginx
```

## Caddy Configuration (PRIMARY - You're using Caddy)

Update your `Caddyfile` (usually at `/etc/caddy/Caddyfile`):

```caddy
www.build-watch.com {
    # Socket.IO WebSocket proxy - MUST be before /api/ handle
    # This handles WebSocket upgrades for Socket.IO connections
    handle /socket.io/* {
        reverse_proxy localhost:3000 {
            # Forward original headers
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            # CRITICAL: Forward WebSocket upgrade headers
            # {>Connection} and {>Upgrade} forward the client's headers
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
            
            # Ensure WebSocket transport is enabled
            transport http {
                versions h2c 1.1
            }
        }
    }
    
    # Backend API - Route /api/* requests to backend on port 3000
    handle /api/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # File uploads - Route /uploads/* requests to backend
    handle /uploads/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # Frontend - Everything else goes to frontend on port 4321
    reverse_proxy localhost:4321 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}

build-watch.com {
    # Same configuration as www.build-watch.com
    handle /socket.io/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
            transport http {
                versions h2c 1.1
            }
        }
    }
    
    handle /api/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    handle /uploads/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    reverse_proxy localhost:4321 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

**IMPORTANT:** 
1. The `/socket.io/*` handle block **MUST** come **BEFORE** the `/api/*` handle block
2. Use `{>Connection}` and `{>Upgrade}` (with `>` prefix) to forward client headers, not hardcoded values
3. The `transport http` block with `versions h2c 1.1` ensures HTTP/1.1 support for WebSocket upgrades

**After updating Caddyfile:**
```bash
# Test Caddy configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy (apply changes)
sudo systemctl reload caddy

# OR if running directly:
sudo caddy reload --config /etc/caddy/Caddyfile

# Check status
sudo systemctl status caddy
```

## Testing

After updating your reverse proxy configuration:

1. **Restart the backend:**
   ```bash
   pm2 restart buildwatch-backend
   ```

2. **Test WebSocket connection:**
   - Open browser console on `https://www.build-watch.com`
   - Check for Socket.IO connection errors
   - Should see: `✅ Socket.IO connected successfully`

3. **Verify in backend logs:**
   ```bash
   pm2 logs buildwatch-backend
   ```
   - Should see: `✅ Socket authenticated for user: [userId]`
   - Should see: `✅ User [userId] connected`

## Troubleshooting

### Still getting 400 errors?

1. **Check reverse proxy logs:**
   ```bash
   # Nginx
   sudo tail -f /var/log/nginx/error.log
   
   # Caddy
   sudo journalctl -u caddy -f
   ```

2. **Verify backend is running:**
   ```bash
   pm2 status
   curl http://localhost:3000/api/health
   ```

3. **Test direct connection (bypass proxy):**
   - Temporarily connect to `http://[server-ip]:3000` to verify Socket.IO works directly
   - If it works directly, the issue is definitely the reverse proxy configuration

4. **Check firewall:**
   ```bash
   sudo ufw status
   # Make sure ports 80, 443, and 3000 are open
   ```

### Connection works but disconnects frequently?

- Increase `pingTimeout` and `pingInterval` in `server.js` (already configured)
- Check reverse proxy timeout settings (should be 24 hours for WebSocket)

## Notes

- The Socket.IO server is configured with `path: '/socket.io'` to match the client
- Both `websocket` and `polling` transports are enabled for fallback
- The server is configured to handle reverse proxy scenarios with increased timeouts

