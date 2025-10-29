# Install and Configure Nginx for Build Watch LGU

## Step 1: Install Nginx

```bash
# Update package list
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Verify installation
nginx -v

# Check Nginx status
sudo systemctl status nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Step 2: Verify Your Services are Running

```bash
# Check PM2 processes
pm2 status

# Verify backend on port 3000
curl http://localhost:3000/api/health

# Verify frontend on port 4321
curl http://localhost:4321 2>&1 | head -5
```

## Step 3: Check SSL Certificate Location

Since your site uses HTTPS (`https://www.build-watch.com`), you already have SSL certificates. We need to find where they are:

```bash
# Check for Let's Encrypt certificates
ls -la /etc/letsencrypt/live/ 2>/dev/null

# Check Hostinger SSL certificates (common locations)
ls -la /etc/ssl/certs/ | grep build
ls -la /etc/ssl/private/ | grep build
ls -la /home/*/ssl/ 2>/dev/null
ls -la /var/www/ssl/ 2>/dev/null

# Check Apache config (Hostinger sometimes uses Apache)
ls -la /etc/apache2/sites-available/ 2>/dev/null | grep build

# Check if there's an existing web server running
systemctl status apache2 2>/dev/null || echo "Apache not found"
netstat -tlnp | grep :443 || ss -tlnp | grep :443
```

## Step 4: Create Nginx Configuration

After running the checks above, I'll provide the exact configuration. For now, let's create the basic structure:

```bash
# Create config file
sudo nano /etc/nginx/sites-available/build-watch
```

## Alternative: If Hostinger is Using Apache

If Hostinger is already using Apache for your domain, we have two options:

1. **Use Apache as reverse proxy** (simpler, if Apache is already configured)
2. **Switch to Nginx** (better performance, requires disabling Apache)

Let's check first before proceeding.

