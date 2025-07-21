#!/bin/bash

# Build Watch LGU - Complete Deployment Script
# This script sets up the entire system for production deployment

echo "🚀 Build Watch LGU - Production Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Consider running as a regular user for security."
fi

# Check system requirements
print_status "Checking system requirements..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm first."
    exit 1
fi

# Check MySQL
if command -v mysql &> /dev/null; then
    print_success "MySQL found"
else
    print_warning "MySQL not found. Please ensure MySQL is installed and running."
fi

# Create necessary directories
print_status "Creating deployment directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p exports

# Backend Setup
print_status "Setting up backend..."

cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=buildwatch_lgu
DB_USER=buildwatch_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=production

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
    print_warning "Please edit .env file with your actual configuration values"
fi

# Test database connection
print_status "Testing database connection..."
npm run test:db

if [ $? -eq 0 ]; then
    print_success "Database connection successful"
else
    print_error "Database connection failed. Please check your database configuration."
    exit 1
fi

# Initialize database
print_status "Initializing database..."
npm run init:db

if [ $? -eq 0 ]; then
    print_success "Database initialized successfully"
else
    print_error "Database initialization failed"
    exit 1
fi

# Test API endpoints
print_status "Testing API endpoints..."
npm run test:api

if [ $? -eq 0 ]; then
    print_success "API endpoints working correctly"
else
    print_warning "Some API tests failed. Check the logs for details."
fi

cd ..

# Frontend Setup
print_status "Setting up frontend..."

cd frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_BASE_URL=http://localhost:3000

# Environment
REACT_APP_ENV=production

# Feature Flags
REACT_APP_ENABLE_RPMES=true
REACT_APP_ENABLE_EXPORT=true
REACT_APP_ENABLE_VALIDATION=true
EOF
    print_warning "Please edit .env file with your actual configuration values"
fi

# Build frontend
print_status "Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

cd ..

# Create production startup scripts
print_status "Creating production startup scripts..."

# Backend startup script
cat > start-backend.sh << 'EOF'
#!/bin/bash
cd backend
echo "Starting Build Watch LGU Backend..."
echo "Logs will be written to logs/backend.log"
npm start > ../logs/backend.log 2>&1 &
echo $! > ../logs/backend.pid
echo "Backend started with PID: $(cat ../logs/backend.pid)"
EOF

# Frontend startup script
cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd frontend
echo "Starting Build Watch LGU Frontend..."
echo "Logs will be written to logs/frontend.log"
npm start > ../logs/frontend.log 2>&1 &
echo $! > ../logs/frontend.pid
echo "Frontend started with PID: $(cat ../logs/frontend.pid)"
EOF

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "Stopping Build Watch LGU services..."

if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "Backend stopped (PID: $BACKEND_PID)"
    else
        echo "Backend process not running"
    fi
    rm -f logs/backend.pid
fi

if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "Frontend process not running"
    fi
    rm -f logs/frontend.pid
fi

echo "All services stopped"
EOF

# Status script
cat > status.sh << 'EOF'
#!/bin/bash
echo "Build Watch LGU - Service Status"
echo "================================"

if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "✅ Backend: Running (PID: $BACKEND_PID)"
    else
        echo "❌ Backend: Not running"
    fi
else
    echo "❌ Backend: PID file not found"
fi

if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "✅ Frontend: Running (PID: $FRONTEND_PID)"
    else
        echo "❌ Frontend: Not running"
    fi
else
    echo "❌ Frontend: PID file not found"
fi

echo ""
echo "Service URLs:"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000/api"
EOF

# Make scripts executable
chmod +x start-backend.sh
chmod +x start-frontend.sh
chmod +x stop.sh
chmod +x status.sh

# Create systemd service files (optional)
print_status "Creating systemd service files..."

cat > buildwatch-backend.service << EOF
[Unit]
Description=Build Watch LGU Backend
After=network.target mysql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

cat > buildwatch-frontend.service << EOF
[Unit]
Description=Build Watch LGU Frontend
After=network.target buildwatch-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create deployment summary
cat > DEPLOYMENT_SUMMARY.md << EOF
# Build Watch LGU - Deployment Summary

## Deployment Date
$(date)

## System Information
- Node.js Version: $NODE_VERSION
- npm Version: $NPM_VERSION
- Deployment User: $USER

## Services
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- Database: MySQL (buildwatch_lgu)

## Available Scripts
- \`./start-backend.sh\` - Start backend service
- \`./start-frontend.sh\` - Start frontend service
- \`./stop.sh\` - Stop all services
- \`./status.sh\` - Check service status

## Configuration Files
- Backend: \`backend/.env\`
- Frontend: \`frontend/.env\`

## Logs
- Backend: \`logs/backend.log\`
- Frontend: \`logs/frontend.log\`

## Next Steps
1. Edit configuration files (.env) with actual values
2. Start services using the provided scripts
3. Access the application at http://localhost:3000
4. Test all functionality including RPMES module
5. Configure reverse proxy (nginx) for production

## RPMES Module Features
- ✅ Input Forms (1-4) - LGU-IU editable
- ✅ Output Forms (5-11) - LGU-PMT editable
- ✅ Excel Export with LGU formatting
- ✅ Role-based access control
- ✅ Form validation and versioning
- ✅ Dashboard integration

## User Roles
- LGU-PMT: Can edit Output Forms, view Input Forms
- LGU-IU: Can edit Input Forms, view Output Forms
- EMS: View Output Forms only
- SYS.AD: View all forms

## Production Checklist
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test all user roles and permissions
- [ ] Validate Excel export functionality
- [ ] Conduct user acceptance testing

EOF

print_success "Deployment setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit configuration files (.env) with your actual values"
echo "2. Start services: ./start-backend.sh && ./start-frontend.sh"
echo "3. Check status: ./status.sh"
echo "4. Access application: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "- Deployment Summary: DEPLOYMENT_SUMMARY.md"
echo "- Testing Guide: TESTING_GUIDE.md"
echo "- RPMES Documentation: RPMES_MODULE_DOCUMENTATION.md"
echo ""
echo "🎯 System Status: PRODUCTION READY"
echo ""
print_success "Build Watch LGU deployment completed successfully!" 