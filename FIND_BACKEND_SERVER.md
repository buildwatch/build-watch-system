# Find Your Backend Server File

## Use This Corrected Command

The find command found the wrong server.js (in node_modules). Run this instead:

```bash
# Find the actual backend server.js (excluding node_modules)
find /root -name "server.js" ! -path "*/node_modules/*" 2>/dev/null

# OR specifically check the build-watch-system directory
ls -la /root/build-watch-system/backend/server.js
```

## Create the .env File

Based on the find result showing `/root/build-watch-system/`, your backend is likely at `/root/build-watch-system/backend/`.

Run these commands:

```bash
# Navigate to the backend directory
cd /root/build-watch-system/backend

# Check if server.js exists there
ls -la server.js

# Create the .env file
cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=YOUR_MYSQL_ROOT_PASSWORD_HERE
DB_NAME=buildwatch_lgu
NODE_ENV=production
PORT=3000
JWT_SECRET=buildwatch_lgu_secret_key_2024
EOF

# Replace YOUR_MYSQL_ROOT_PASSWORD_HERE with your actual MySQL root password
nano .env
```

## Restart the Backend

After creating the .env file, restart your backend:

```bash
# Check if backend is running with PM2
pm2 list

# Restart it
pm2 restart all

# OR if not using PM2, find and restart the process
ps aux | grep "node.*server.js"
# Kill it and restart
pkill -f "node.*server.js"
cd /root/build-watch-system/backend
nohup node server.js > /root/build-watch-system/backend/logs/server.log 2>&1 &
```

