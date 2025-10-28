#!/bin/bash

# Script to create .env file on the server for backend to connect to database

echo "Creating .env file for backend database connection..."

# Navigate to backend directory on the server
cd /path/to/backend  # <-- UPDATE THIS PATH TO YOUR ACTUAL BACKEND PATH

# Create .env file with production database settings
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=YOUR_MYSQL_ROOT_PASSWORD  # <-- UPDATE THIS
DB_NAME=buildwatch_lgu

# Server Configuration
NODE_ENV=production
PORT=3000

# JWT Secret
JWT_SECRET=buildwatch_lgu_secret_key_2024

# Optional: Facebook Integration
FACEBOOK_ACCESS_TOKEN=
EOF

echo ".env file created!"
echo ""
echo "IMPORTANT: Edit the .env file and update DB_PASS with your actual MySQL root password"

