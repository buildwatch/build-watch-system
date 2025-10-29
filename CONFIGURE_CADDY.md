# Configure Caddy Reverse Proxy for Build Watch LGU

## Current Setup Identified:
- ✅ **Caddy** is running on port 443 (HTTPS)
- ✅ SSL certificates in `/etc/letsencrypt/live/build-watch.com`
- ✅ Backend running on port 3000
- ✅ Frontend running on port 4321

## Step 1: Find Caddy Configuration File

Run these commands to locate Caddy config:

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

## Step 2: View Current Caddy Configuration

Once you find the Caddyfile, view it:

```bash
# View current config
cat /etc/caddy/Caddyfile

# OR if it's elsewhere
cat /path/to/Caddyfile
```

## Step 3: Backup Current Configuration

```bash
# Backup current Caddyfile
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%Y%m%d)

# OR if config is elsewhere
sudo cp /path/to/Caddyfile /path/to/Caddyfile.backup.$(date +%Y%m%d)
```

## Step 4: Update Caddy Configuration

I'll provide the exact configuration after you share the current Caddyfile content.

The configuration should include:
- Reverse proxy for `/api/*` → `http://localhost:3000/api`
- Reverse proxy for `/uploads/*` → `http://localhost:3000/uploads`
- Reverse proxy for frontend `/` → `http://localhost:<｜place▁holder▁no▁540｜>21`

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

## Step 6: Verify Everything Works

```bash
# Test backend through Caddy
curl https://www.build-watch.com/api/health

# Test frontend
curl https://www.build-watch.com | head -20
```

## Share Results

Please run Step 1 commands and share:
1. Output of `cat /etc/caddy/Caddyfile` (or wherever the config is)
2. Output of `systemctl status caddy`
3. Output of `ps aux | grep caddy`

This will help me provide the exact configuration needed.

