# Environment Variables for Production Deployment

## Required Environment Variables

When deploying to production, make sure to set these environment variables:

### Frontend URL Configuration
```env
FRONTEND_URL=https://build-watch.com
# or
FRONTEND_URL=https://www.build-watch.com
```

**Important:** This ensures password reset links use your production domain instead of localhost.

### Email Configuration
```env
GMAIL_USER=buildwatch69@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

### Environment Mode
```env
NODE_ENV=production
```

## How Reset Links Work

The password reset link is generated using:
1. **Development (localhost):** `http://localhost:4321/reset-password?token=...`
2. **Production (with FRONTEND_URL):** `https://build-watch.com/reset-password?token=...`
3. **Production (without FRONTEND_URL):** Falls back to `https://build-watch.com/reset-password?token=...`

## Setting Environment Variables

### On Railway
1. Go to your Railway project
2. Click on your backend service
3. Go to "Variables" tab
4. Add:
   - `FRONTEND_URL=https://build-watch.com`
   - `GMAIL_USER=buildwatch69@gmail.com`
   - `GMAIL_APP_PASSWORD=your-app-password`
   - `NODE_ENV=production`

### On Hostinger/VPS
1. SSH into your server
2. Edit `backend/.env` file:
```env
FRONTEND_URL=https://build-watch.com
GMAIL_USER=buildwatch69@gmail.com
GMAIL_APP_PASSWORD=your-app-password
NODE_ENV=production
```
3. Restart your backend server

## Verification

After deployment, test the password reset:
1. Request a password reset
2. Check the email - the reset link should use your production domain
3. Click the link - it should work on your production site

