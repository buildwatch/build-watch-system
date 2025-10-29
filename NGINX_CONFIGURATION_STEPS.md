# Nginx Reverse Proxy Configuration - Step by Step Guide

## Prerequisites Check

Run these commands on your server to check the current setup:

### Step 1: Check Nginx Installation

```bash
# Check if Nginx is installed
nginx -v

# Check Nginx status
systemctl status nginx
# OR
service nginx status
```

### Step 2: Find Current Nginx Configuration Files

```bash
# List available sites
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Check if there's a config for build-watch.com
ls -la /etc/nginx/sites-available/ | grep -i build
ls -la /etc/nginx/sites-available/ | grep -i watch
```

### Step 3: View Current Configuration

```bash
# View default config (if no custom config exists)
cat /etc/nginx/sites-available/default

# OR view custom config (if exists)
cat /etc/nginx/sites-available/build-watch
# OR
cat /etc/nginx/sites-available/www.build-watch.com
```

### Step 4: Check Nginx Main Config

```bash
# View main nginx.conf
cat /etc/nginx/nginx.conf | head -50

# Check if sites-enabled is included
grep -i "sites-enabled" /etc/nginx/nginx.conf
```

## Current Setup Information Needed

Please run the commands above and share:
1. Nginx version (from `nginx -v`)
2. Nginx status (running/stopped)
3. List of files in `/etc/nginx/sites-available/`
4. Current configuration content (if any exists)

This will help me provide the exact configuration tailored to your setup.

