# Build Watch LGU - Hostinger Deployment Guide

## 📋 What You Have Now

✅ **Code Files**: Your "Build Watch.zip" contains all the application code
✅ **Database File**: `buildwatch_lgu_database.sql` (1.04 MB) - Contains all your data

## 🚀 Deployment Steps for Hostinger

### Step 1: Upload Files to Hostinger

1. **Upload the ZIP file** (already done ✅)
   - File: `Build Watch.zip` (93.12 MB)
   - Contains: Frontend, Backend, and all application files

2. **Upload the Database file** (NEEDED)
   - File: `buildwatch_lgu_database.sql` (1.04 MB)
   - This contains all your project data, users, and settings

### Step 2: Database Setup on Hostinger

1. **Access Hostinger Database Manager**
   - Go to your Hostinger control panel
   - Navigate to "Databases" → "MySQL Databases"
   - Create a new database (e.g., `buildwatch_lgu`)

2. **Import the Database**
   - Go to "phpMyAdmin" or "Database Manager"
   - Select your newly created database
   - Click "Import"
   - Upload `buildwatch_lgu_database.sql`
   - Click "Go" to import

### Step 3: Configure Environment Variables

1. **Create `.env` file** in your backend directory with:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_hostinger_db_user
DB_PASS=your_hostinger_db_password
DB_NAME=your_hostinger_db_name
DB_PORT=3306

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Email Configuration (if using email features)
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USER=your_email@buildwatch.com
EMAIL_PASS=your_email_password
```

### Step 4: Install Dependencies

1. **Backend Dependencies**
```bash
cd backend
npm install --production
```

2. **Frontend Dependencies**
```bash
cd frontend
npm install
npm run build
```

### Step 5: Configure Web Server

1. **Set up Node.js hosting** (if available)
   - Configure your backend to run on the specified port
   - Set up process manager (PM2) for production

2. **Alternative: Static Hosting**
   - Build the frontend: `npm run build`
   - Upload the `dist` folder to your web hosting
   - Configure API endpoints to point to your backend

### Step 6: Domain Configuration

1. **Point your domain** to the hosting directory
2. **Configure SSL certificate** (recommended)
3. **Set up redirects** if needed

## 📁 File Structure After Deployment

```
your-hosting-directory/
├── frontend/
│   ├── dist/           # Built frontend files
│   └── package.json
├── backend/
│   ├── node_modules/
│   ├── routes/
│   ├── models/
│   ├── config/
│   ├── .env           # Environment variables
│   └── server.js
├── buildwatch_lgu_database.sql  # Database backup
└── README.md
```

## 🔧 Important Configuration Notes

### Database Tables Included
Your database backup contains 24 tables:
- `users` - All user accounts and authentication
- `projects` - Project information and data
- `project_milestones` - Milestone tracking
- `project_updates` - Update submissions
- `activity_logs` - System activity tracking
- `notifications` - User notifications
- And 19 more tables with complete data

### Default Admin Account
- **Username**: `sysad@gmail.com`
- **Password**: `buildwatch_123`
- **Role**: System Administrator

### User Roles Available
1. **System Administrator** - Full system access
2. **EIU** - External Implementing Unit
3. **IU** - Implementing Unit
4. **LGU PMT** - Local Government Unit Project Management Team
5. **MPMEC Secretariat** - Monitoring and Project Management Executive Committee
6. **Executive Viewer** - Read-only access for executives

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify database credentials in `.env`
   - Check if database exists and is accessible
   - Ensure proper permissions

2. **Port Issues**
   - Hostinger may require specific ports
   - Check hosting provider's Node.js requirements

3. **File Permissions**
   - Ensure proper read/write permissions
   - Check upload directory permissions

### Support Files Included
- `README.md` - General project information
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `API_DOCUMENTATION.md` - API endpoints and usage
- `TESTING_GUIDE.md` - Testing procedures

## 📞 Support

If you encounter issues during deployment:
1. Check the troubleshooting section above
2. Review the detailed documentation files
3. Contact your hosting provider for server-specific issues

## ✅ Verification Checklist

- [ ] ZIP file uploaded to Hostinger
- [ ] Database file uploaded to Hostinger
- [ ] Database imported successfully
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Application accessible via domain
- [ ] Admin login working
- [ ] All user roles functional
- [ ] SSL certificate configured (recommended)

---

**Note**: This deployment package includes a complete backup of your Build Watch LGU system with all data intact. Make sure to keep a local copy of the database backup for safety. 