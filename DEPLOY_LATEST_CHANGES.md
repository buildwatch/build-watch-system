# Deploy Latest Changes to Hostinger VPS

## Summary of Changes
This deployment includes:
1. ✅ Project Summary & Report Module (5 user-specific modules with centralized component)
2. ✅ Enhanced Audit Trail with milestone submissions and approvals
3. ✅ Fixed milestone progress calculation
4. ✅ Fixed delayed status detection
5. ✅ Updated PDF/HTML export with RPMES-style format and logos
6. ✅ Removed policy-dashboard.astro from MPMEC
7. ✅ Updated all sidebars with Project Summary & Report links

## Step 1: Commit and Push from Local Machine

### On Your Local Machine (PowerShell):

```powershell
# Navigate to project directory
cd "C:\Users\BuildWatch\Downloads\Build Watch"

# Add all modified files
git add .

# Commit with descriptive message
git commit -m "Add Project Summary & Report module, fix milestone progress and audit trail, enhance PDF/HTML exports with RPMES format and logos, remove policy-dashboard"

# Push to repository
git push origin main
```

## Step 2: Pull Changes on Hostinger VPS Server

### On Hostinger VPS Terminal:

```bash
# Navigate to project directory
cd /root/build-watch-system

# Pull the latest changes
git pull origin main

# Verify files were updated
echo "Checking key files..."
ls -la frontend/src/islands/ProjectSummaryReportCenter.jsx
ls -la frontend/src/pages/dashboard/eiu/modules/project-summary-report.astro
ls -la frontend/src/pages/dashboard/lgu-pmt-mpmec/modules/project-summary-report.astro
```

## Step 3: Install New Dependencies (If Any)

```bash
# Backend dependencies
cd /root/build-watch-system/backend
npm install

# Frontend dependencies
cd /root/build-watch-system/frontend
npm install
```

## Step 4: Rebuild Frontend

```bash
cd /root/build-watch-system/frontend

# Build the frontend for production
npm run build
```

## Step 5: Restart Services with PM2

```bash
# Restart all PM2 processes
pm2 restart all

# Check status
pm2 status

# View logs to ensure no errors
pm2 logs --lines 50
```

## Step 6: Verify Deployment

1. **Check Backend Health:**
```bash
curl http://localhost:3000/api/health
```

2. **Check Frontend:**
   - Visit your production URL
   - Test Project Summary & Report module for each user role
   - Verify milestone progress and audit trail are working

3. **Check PM2 Status:**
```bash
pm2 list
pm2 logs --lines 100
```

## Troubleshooting

### If Frontend Build Fails:
```bash
cd /root/build-watch-system/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### If Backend Fails to Start:
```bash
cd /root/build-watch-system/backend
pm2 logs backend --lines 100
# Check for database connection errors
```

### If Services Don't Restart:
```bash
pm2 delete all
cd /root/build-watch-system/backend
pm2 start server.js --name backend
cd /root/build-watch-system/frontend
pm2 start npm --name frontend -- run preview
pm2 save
```

## Files Changed Summary

### New Files:
- `frontend/src/islands/ProjectSummaryReportCenter.jsx` - Centralized component
- `frontend/src/pages/dashboard/eiu/modules/project-summary-report.astro`
- `frontend/src/pages/dashboard/iu-implementing-office/modules/project-summary-report.astro`
- `frontend/src/pages/dashboard/lgu-pmt-mpmec/modules/project-summary-report.astro`
- `frontend/src/pages/dashboard/lgu-pmt-mpmec-secretariat/modules/project-summary-report.astro`
- `frontend/src/pages/dashboard/executive-viewer/modules/project-summary-report.astro`

### Modified Files:
- All sidebar components (added Project Summary & Report links)
- `frontend/src/islands/ProjectExportCenter.jsx` (PDF/HTML export enhancements)
- Various other components and modules

### Deleted Files:
- `frontend/src/pages/dashboard/lgu-pmt-mpmec/modules/policy-dashboard.astro`

