# Email Setup Guide for Password Reset

## Problem
Password reset emails are not being sent because Gmail credentials are not configured.

## Solution: Set Up Gmail App Password

### Step 1: Enable 2FA on buildwatch69@gmail.com
1. Go to https://myaccount.google.com/security
2. Sign in with `buildwatch69@gmail.com`
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the prompts to enable 2FA

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Sign in with `buildwatch69@gmail.com`
3. Select "Mail" as the app
4. Select "Other (Custom name)" as the device
5. Enter "Build Watch System" as the name
6. Click "Generate"
7. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Add to Backend .env File
1. Open `backend/.env` file
2. Add these lines:
```env
GMAIL_USER=buildwatch69@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password-here
```
3. Remove any spaces from the app password (e.g., `abcdefghijklmnop`)

### Step 4: Restart Backend Server
After adding the credentials, restart your backend server for changes to take effect.

## Testing Email Configuration

### Option 1: Use Test Endpoint
```bash
curl -X POST http://localhost:3000/api/test/test-email \
  -H "Content-Type: application/json" \
  -d '{"userId": "SYS-AD-0001"}'
```

### Option 2: Use Browser Console
Open browser console and run:
```javascript
window.debugEmailSending('SYS-AD-0001')
```

### Option 3: Check Backend Logs
When you request a password reset, check the backend console for:
- `✅ [EMAIL CONFIG] Gmail credentials configured` - Good!
- `⚠️ [EMAIL CONFIG] Gmail credentials not configured` - Need to set up

## Verification

After setup, when you request a password reset:
1. Check backend console - should show `✅ [EMAIL] Password reset email sent successfully!`
2. Check `buildwatch69@gmail.com` inbox
3. Look for email with subject: "Password Reset Link for [user-email] ([User ID])"

## Troubleshooting

### "Invalid login" error
- Make sure 2FA is enabled
- Verify the app password is correct (no spaces)
- Check that GMAIL_USER matches the account with 2FA enabled

### "Less secure app access" error
- This shouldn't happen with App Passwords
- If it does, make sure you're using App Password, not regular password

### Emails go to spam
- Check spam/junk folder
- Mark as "Not Spam" if found there

### Still not receiving emails
1. Check backend console for error messages
2. Verify .env file has correct credentials
3. Make sure backend server was restarted after adding credentials
4. Test with the test endpoint above

