# Fix Backend Database Connection

## The Problem

Your receiving successfully imported the database, but your backend application cannot connect to it because:
1. The backend needs environment variables (`.env` file) to connect to the database
2. Without the `.env` file, it doesn't know the database credentials

## Steps to Fix

### Step 1: Find Your Backend Directory on the Server

Run this command on your server to find where your backend is located:

```bash
# Find where your backend code is
find /home -name "server.js" -path "*/backend/*" 2>/dev/null
# OR
find /var/www -name "server.js" -path "*/backend/*" 2>/dev/null
# OR check common locations
ls -la /home/ubuntu/buildwatch/backend/
ls -la /var/www/buildwatch/backend/
ls -la /root/buildwatch/backend/
```

### Step 2: Create the .env File

Once you find your backend directory, link to it:

```bash
cd /path/to/backend  # Replace with your actual backend path from Step 1

# Create .env file
nano .env
```

Paste this content into the file (replace YOUR_PASSWORD with your MySQL root password):

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=YOUR_MYSQL_ROOT_PASSWORD
DB_NAME=buildwatch_lgu

# Server Configuration
NODE_ENV=production
PORT=3000

# JWT Secret
JWT_SECRET=buildwatch_lgu_secret_key_2024
```

Save the file (Ctrl+O, Enter, Ctrl+X in nano).

### Step 3: Restart the Backend

Restart your backend service to pick up the new .env file:

```bash
# If using systemd (PM2 or similar)
systemctl restart buildwatch-backend
# OR
pm2 restart buildwatch
# OR manually stop and start
pkill -f node
cd /path/to/backend
nohup node server.js &
```

### Step 4: Test the Connection

Check if the backend can connect to the database:

```bash
# Check backend logs
tail -f /path/to/backend/logs/server.log

# OR check if the backend is running
curl http://localhost:3000/api/health
```

You should see:
```json
{"status":"OK","timestamp":"...","environment":"production","database":"Connected"}
```

## Alternative: Quick Fix

If you already know where your backend is, run this single command (update the path and password):

```bash
cd /path/to/backend && cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=YOUR_PASSWORD_HERE
DB_NAME=buildwatch_lgu
NODE_ENV=production
PORT=3000
JWT_SECRET=buildwatch_lgu_secret_key_2024
EOF
```

Then restart your backend service.

