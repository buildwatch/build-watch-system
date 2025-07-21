# Build Watch: Deployment Guide

## 🚀 Production Deployment Instructions

### Prerequisites

- **Server Requirements:**
  - Ubuntu 20.04 LTS or Windows Server 2019
  - 4GB RAM minimum (8GB recommended)
  - 50GB storage space
  - Node.js 16+ and npm
  - MySQL 8.0+
  - Nginx (for reverse proxy)

- **Domain & SSL:**
  - Registered domain name
  - SSL certificate (Let's Encrypt recommended)
  - DNS configuration

### Step 1: Server Setup

#### Ubuntu Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2
```

#### Windows Server Setup
```powershell
# Install Node.js from https://nodejs.org/
# Install MySQL from https://dev.mysql.com/downloads/mysql/
# Install IIS or use Node.js directly

# Install PM2 globally
npm install -g pm2
```

### Step 2: Database Configuration

```sql
-- Create database and user
CREATE DATABASE build_watch;
CREATE USER 'buildwatch_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON build_watch.* TO 'buildwatch_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3: Application Deployment

#### Clone and Setup
```bash
# Clone repository
git clone https://github.com/your-repo/build-watch.git
cd build-watch

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install --production
```

#### Environment Configuration
```bash
# Backend environment
cd backend
cp .env.example .env

# Edit .env file
nano .env
```

**Environment Variables:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=buildwatch_user
DB_PASS=secure_password_here
DB_NAME=build_watch
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=production

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Initialize Database
```bash
cd backend
node scripts/init-database.js
node scripts/seed-users.js
```

### Step 4: PM2 Process Management

#### Create PM2 Configuration
```bash
# Create ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'build-watch-backend',
    script: './backend/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
```

#### Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Step 5: Nginx Configuration

#### Create Nginx Site Configuration
```bash
sudo nano /etc/nginx/sites-available/build-watch
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (React App)
    location / {
        root /var/www/build-watch/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
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
    
    # File uploads
    location /uploads/ {
        alias /var/www/build-watch/backend/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

#### Enable Site and SSL
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/build-watch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 6: Security Configuration

#### Firewall Setup
```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### MySQL Security
```sql
-- Secure MySQL installation
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
```

#### Application Security
```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/build-watch
sudo chmod -R 755 /var/www/build-watch
sudo chmod -R 644 /var/www/build-watch/backend/.env
```

### Step 7: Monitoring and Logging

#### Setup Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/build-watch
```

**Logrotate Configuration:**
```
/var/www/build-watch/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload build-watch-backend
    endscript
}
```

#### Setup Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Setup PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Step 8: Backup Configuration

#### Database Backup Script
```bash
# Create backup script
cat > /var/www/build-watch/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/build-watch"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="build_watch"
DB_USER="buildwatch_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u $DB_USER -p $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/build-watch

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable and setup cron
chmod +x /var/www/build-watch/scripts/backup.sh
crontab -e
# Add: 0 2 * * * /var/www/build-watch/scripts/backup.sh
```

### Step 9: Performance Optimization

#### Node.js Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Optimize PM2 settings
pm2 restart build-watch-backend --update-env
```

#### MySQL Optimization
```sql
-- Add to /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 128M
query_cache_type = 1
max_connections = 200
```

### Step 10: Testing Deployment

#### Health Check Script
```bash
# Create health check script
cat > /var/www/build-watch/scripts/health-check.sh << 'EOF'
#!/bin/bash
URL="https://your-domain.com"
API_URL="https://your-domain.com/api/health"

echo "Checking Build Watch deployment..."

# Check frontend
if curl -f -s $URL > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
    exit 1
fi

# Check API
if curl -f -s $API_URL > /dev/null; then
    echo "✅ API is accessible"
else
    echo "❌ API is not accessible"
    exit 1
fi

# Check database
if mysql -u buildwatch_user -p -e "USE build_watch; SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database is not accessible"
    exit 1
fi

echo "🎉 All systems operational!"
EOF

chmod +x /var/www/build-watch/scripts/health-check.sh
```

### Step 11: Post-Deployment Checklist

- [ ] Domain DNS is properly configured
- [ ] SSL certificate is installed and working
- [ ] All 27 LGU user accounts are created
- [ ] UAT tests pass (22/22)
- [ ] Database backups are scheduled
- [ ] Monitoring and logging are configured
- [ ] Security measures are implemented
- [ ] Performance optimization is applied
- [ ] Health check script passes
- [ ] User training materials are ready

### Troubleshooting

#### Common Issues

**Application won't start:**
```bash
# Check logs
pm2 logs build-watch-backend
tail -f /var/www/build-watch/backend/logs/app.log

# Check environment variables
pm2 env build-watch-backend
```

**Database connection issues:**
```bash
# Test database connection
mysql -u buildwatch_user -p build_watch -e "SELECT 1;"

# Check MySQL status
sudo systemctl status mysql
```

**Nginx issues:**
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**SSL certificate issues:**
```bash
# Renew SSL certificate
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### Support and Maintenance

#### Regular Maintenance Tasks
- Weekly: Check logs for errors
- Monthly: Update system packages
- Quarterly: Review security settings
- Annually: Renew SSL certificates

#### Emergency Procedures
- **System Down**: Check PM2 status and restart if needed
- **Database Issues**: Restore from latest backup
- **Security Breach**: Review logs and update credentials

---

**Build Watch Deployment Guide**  
*For LGU Santa Cruz Production Environment* 