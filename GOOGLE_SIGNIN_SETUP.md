# Google Sign-In Configuration Guide

This guide explains how to configure Google Sign-In for the Project Feedback feature on the production server.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Access to the production server's `.env` files
3. Admin access to Google Cloud Console

## Step 1: Create Google OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: `Build Watch Portal`
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Add scopes (at minimum: `email`, `profile`, `openid`)
   - Add test users if needed
   - Click **Save and Continue**
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Build Watch Web Client`
   - **Authorized JavaScript origins:**
     ```
     https://www.build-watch.com
     https://build-watch.com
     ```
   - **Authorized redirect URIs:**
     ```
     https://www.build-watch.com
     https://build-watch.com
     ```
   - Click **Create**
7. **Copy the Client ID** (you'll need this for the `.env` files)

## Step 2: Update Frontend `.env` File

On your production server, edit the frontend `.env` file:

```bash
cd /root/build-watch-system/frontend
nano .env
```

Add or update the following line:

```env
PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

**Important:** 
- The `PUBLIC_` prefix is required for Astro to expose this variable to the client-side
- Replace `your-google-client-id-here.apps.googleusercontent.com` with your actual Client ID from Step 1

Save the file (Ctrl+O, Enter, Ctrl+X in nano).

## Step 3: Update Backend `.env` File

On your production server, edit the backend `.env` file:

```bash
cd /root/build-watch-system/backend
nano .env
```

Add or update the following line:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

**Important:**
- Use the **same Client ID** as in the frontend `.env` file
- No `PUBLIC_` prefix needed for backend

Save the file (Ctrl+O, Enter, Ctrl+X in nano).

## Step 4: Restart Services

After updating both `.env` files, restart the services:

```bash
# Restart backend
cd /root/build-watch-system/backend
pm2 restart buildwatch-backend

# Restart frontend (if using PM2)
cd /root/build-watch-system/frontend
pm2 restart buildwatch-frontend

# Or if frontend is served differently, rebuild it:
cd /root/build-watch-system/frontend
npm run build
# Then restart your web server (nginx/apache)
```

## Step 5: Verify Configuration

1. Visit: `https://www.build-watch.com/project/[any-project-id]?tab=feedback`
2. Click the **"Login with Google"** button
3. You should see the Google Sign-In popup instead of the error message

## Troubleshooting

### Error: "Google Sign-In is not configured yet"
- **Cause:** `PUBLIC_GOOGLE_CLIENT_ID` is missing or incorrect in frontend `.env`
- **Fix:** 
  1. Verify the variable is in `/root/build-watch-system/frontend/.env`
  2. Ensure it starts with `PUBLIC_GOOGLE_CLIENT_ID=`
  3. Rebuild the frontend: `cd frontend && npm run build`
  4. Restart the frontend service

### Error: "Google Sign-In is not configured on the server"
- **Cause:** `GOOGLE_CLIENT_ID` is missing or incorrect in backend `.env`
- **Fix:**
  1. Verify the variable is in `/root/build-watch-system/backend/.env`
  2. Ensure it's exactly: `GOOGLE_CLIENT_ID=your-client-id`
  3. Restart backend: `pm2 restart buildwatch-backend`

### Error: "Invalid client" or "redirect_uri_mismatch"
- **Cause:** The authorized origins/redirect URIs in Google Cloud Console don't match your domain
- **Fix:**
  1. Go to Google Cloud Console → Credentials
  2. Edit your OAuth 2.0 Client ID
  3. Ensure these are in **Authorized JavaScript origins:**
     - `https://www.build-watch.com`
     - `https://build-watch.com`
  4. Ensure these are in **Authorized redirect URIs:**
     - `https://www.build-watch.com`
     - `https://build-watch.com`
  5. Save and wait a few minutes for changes to propagate

### Google Sign-In button doesn't appear
- **Cause:** Google Identity Services script failed to load
- **Fix:**
  1. Check browser console for errors
  2. Verify your domain is accessible over HTTPS
  3. Check if any ad blockers or privacy extensions are blocking Google scripts

## Environment Variables Summary

### Frontend `.env` (required)
```env
PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Backend `.env` (required)
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Note:** Both should use the **same** Client ID value.

## Security Notes

1. **Never commit `.env` files** to version control
2. The Client ID is safe to expose in frontend code (it's public)
3. Keep your Google Cloud Console credentials secure
4. Regularly review OAuth consent screen and user access

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2/web-server)

