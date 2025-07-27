# Build Watch System - Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### Prerequisites
- GitHub account
- Railway account (free at railway.app)

### Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name it: `build-watch-system`
4. Make it **Public** (required for free Railway)
5. Don't initialize with README (we already have one)

### Step 2: Push Code to GitHub
```bash
# Add all files
git add .

# Commit changes
git commit -m "Initial commit for Railway deployment"

# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/build-watch-system.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `build-watch-system` repository
6. Railway will automatically detect it's a Node.js app

### Step 4: Set Environment Variables
In Railway dashboard, add these environment variables:

#### Database Configuration
```
DB_HOST=your-railway-mysql-host
DB_USER=your-railway-mysql-user
DB_PASSWORD=your-railway-mysql-password
DB_NAME=your-railway-mysql-database
DB_PORT=3306
```

#### JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
```

#### Email Configuration (Optional)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 5: Add MySQL Database
1. In Railway project, click "New"
2. Select "Database" → "MySQL"
3. Railway will provide connection details
4. Copy these to your environment variables

### Step 6: Deploy Frontend
1. In Railway project, click "New"
2. Select "GitHub Repo"
3. Choose the same repository
4. Set root directory to: `frontend`
5. Set build command: `npm run build`
6. Set start command: `npm run preview`

## 🔧 Environment Variables Reference

### Required Variables
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - MySQL database name
- `JWT_SECRET` - Secret key for JWT tokens

### Optional Variables
- `PORT` - Server port (Railway sets this automatically)
- `NODE_ENV` - Environment (production/development)
- `EMAIL_HOST` - SMTP host for emails
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - Email username
- `EMAIL_PASS` - Email password

## 🌐 Domain Configuration
1. In Railway, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `build-watch.com`)
4. Update DNS records as instructed

## 📊 Monitoring
- Railway provides built-in monitoring
- Check logs in Railway dashboard
- Set up alerts for downtime

## 🔄 Updates
To update your deployment:
```bash
git add .
git commit -m "Update description"
git push origin main
```
Railway will automatically redeploy!

## 🆘 Troubleshooting
- Check Railway logs for errors
- Verify environment variables are set
- Ensure database is connected
- Check if all dependencies are installed 