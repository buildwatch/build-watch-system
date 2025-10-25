# Facebook API Setup Guide

## Quick Setup for Facebook Posts Integration

To get real Facebook posts instead of mock data, you need to set up a Facebook access token.

### Option 1: Quick Setup (Recommended for Development)

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Go to "Tools & Support" > "Graph API Explorer"
4. Select your app
5. Generate a User Access Token with these permissions:
   - `pages_read_engagement`
   - `pages_show_list`
   - `public_profile`
6. Copy the access token
7. Set it as an environment variable:

```bash
# In your backend/.env file
FACEBOOK_ACCESS_TOKEN=your_access_token_here
```

### Option 2: Page Access Token (For Production)

1. Go to your Facebook Page
2. Go to Settings > Page Info
3. Scroll down to "Page Access Token"
4. Generate a token
5. Set it as environment variable

### Option 3: Temporary Solution

For immediate testing, you can temporarily set a token in the backend code:

```javascript
// In backend/routes/home.js, temporarily add:
const FACEBOOK_ACCESS_TOKEN = 'your_token_here';
```

## Testing the Integration

Once you have a token set up:

1. Restart your backend server
2. Refresh the frontend page
3. Check the browser console for logs showing "Successfully fetched Facebook data"
4. The "Demo Data" badge should disappear
5. Real Facebook images should appear instead of "Text Post" placeholders

## Troubleshooting

- If you see "Demo Data" badge, the Facebook API is not accessible
- Check browser console for error messages
- Verify the access token is valid and has proper permissions
- Make sure the Facebook page is public

## Current Status

The system is currently using mock data because no Facebook access token is configured. Once you set up the token, it will automatically switch to real Facebook data.
