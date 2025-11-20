# Fix Caddy Configuration for Socket.IO Real-Time Updates

## Problem
Socket.IO WebSocket connections are getting 404 errors because Caddy is not configured to proxy `/socket.io/` requests to the backend.

## Solution
Add a Socket.IO handle block to your Caddyfile **BEFORE** the `/api/*` handle block.

## Step 1: Find Your Caddyfile

SSH into your server and find the Caddyfile:

```bash
# Check Caddy version
caddy version

# Find Caddy config file (common locations)
ls -la /etc/caddy/
cat /etc/caddy/Caddyfile

# OR check if it's in a different location
find /etc -name "Caddyfile" 2>/dev/null
find /usr -name "Caddyfile" 2>/dev/null

# Check Caddy process to see config location
ps aux | grep caddy

# Check Caddy config from systemd (if running as service)
systemctl status caddy
systemctl cat caddy | grep -i config
```

## Step 2: Backup Current Configuration

```bash
# Backup current Caddyfile
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%Y%m%d)

# OR if config is elsewhere
sudo cp /path/to/Caddyfile /path/to/Caddyfile.backup.$(date +%Y%m%d)
```

## Step 3: Edit Caddyfile

```bash
# Edit your Caddyfile
sudo nano /etc/caddy/Caddyfile
# OR wherever your Caddyfile is located
```

## Step 4: Add Socket.IO Handle Block

Find the section with your `/api/*` handle block and add the Socket.IO block **BEFORE** it:

```caddy
build-watch.com {
    # Socket.IO WebSocket proxy - MUST be before /api/ handle
    handle /socket.io/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
        transport http {
            versions h2c 1.1
        }
    }
    
    # Backend API - This should come AFTER /socket.io/
    handle /api/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # File uploads
    handle /uploads/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # Frontend - Everything else
    reverse_proxy localhost:4321 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}

www.build-watch.com {
    # Socket.IO WebSocket proxy - MUST be before /api/ handle
    handle /socket.io/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
        transport http {
            versions h2c 1.1
        }
    }
    
    # Backend API
    handle /api/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # File uploads
    handle /uploads/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # Frontend - Everything else
    reverse_proxy localhost:4321 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

**IMPORTANT:** The `/socket.io/*` handle block **MUST** come before the `/api/*` handle block, because Caddy matches handles in order and `/socket.io/*` is more specific.

## Step 5: Test and Reload Caddy

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

## Step 6: Verify Socket.IO is Working

1. Clear your browser cache or do a hard refresh (Ctrl+Shift+R)
2. Visit a project feedback page
3. Check the browser console — you should see `✅ Feedback Socket.IO connected` instead of 404 errors
4. Test real-time updates by posting a comment from another browser/tab

## Troubleshooting

### Still getting 404?
- Make sure the `/socket.io/*` handle block is **before** `/api/*` in your Caddyfile
- Check that `reverse_proxy` points to `localhost:3000` (without `/socket.io/` at the end)
- Verify backend is running: `pm2 status`
- Check Caddy error logs: `sudo journalctl -u caddy -f`

### Connection timeout?
- Verify backend Socket.IO server is running on port 3000
- Check firewall: `sudo ufw status`
- Test backend directly: `curl http://localhost:3000/socket.io/`

### WebSocket upgrade fails?
- Ensure `header_up Connection {>Connection}` is present
- Ensure `header_up Upgrade {>Upgrade}` is present
- Check that `transport http` block includes `versions h2c 1.1`

## Alternative: If Using Caddy v2 API

If you're using Caddy's JSON API instead of a Caddyfile, you'll need to add the Socket.IO route through the API. Share your current setup and I can provide the JSON configuration.

