# Announcement API Debugging Guide

## Quick Console Debugging Script

**Copy and paste this into your browser console:**

```javascript
(async () => {
  console.clear();
  console.log('%c🔍 ANNOUNCEMENT API DEBUGGING', 'font-size: 20px; font-weight: bold; color: #2563eb;');
  console.log('='.repeat(70));
  
  const API_BASE = 'http://localhost:3000/api';
  const ANNOUNCEMENT_ID = 8;
  
  const token = localStorage.getItem('token') || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
  
  if (!token) {
    console.error('%c❌ No authentication token found!', 'color: red; font-weight: bold;');
    return;
  }
  
  console.log('%c✅ Token found', 'color: green;');
  console.log('Testing Announcement ID:', ANNOUNCEMENT_ID);
  console.log('-'.repeat(70));
  
  const test = async (name, endpoint, method = 'GET', body = null) => {
    try {
      const opts = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      if (body) opts.body = JSON.stringify(body);
      
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await res.json();
      
      if (res.ok) {
        console.log(`%c✅ ${name}: SUCCESS`, 'color: green; font-weight: bold;');
        console.log('Response:', data);
        return { success: true, data };
      } else {
        console.error(`%c❌ ${name}: FAILED (${res.status})`, 'color: red; font-weight: bold;');
        console.error('Error:', data);
        if (data.details) console.error('Details:', data.details);
        return { success: false, error: data, status: res.status };
      }
    } catch (err) {
      console.error(`%c❌ ${name}: EXCEPTION`, 'color: red; font-weight: bold;');
      console.error('Error:', err);
      return { success: false, exception: err };
    }
  };
  
  const results = {};
  results.announcement = await test('1. Get Announcement', `/admin/announcements/${ANNOUNCEMENT_ID}`);
  
  if (results.announcement.success) {
    results.comments = await test('2. Get Comments', `/admin/announcements/${ANNOUNCEMENT_ID}/comments`);
    results.reactions = await test('3. Get Reactions', `/admin/announcements/${ANNOUNCEMENT_ID}/reactions`);
    results.analytics = await test('4. Get Analytics', `/admin/announcements/${ANNOUNCEMENT_ID}/analytics`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('%c📊 SUMMARY', 'font-size: 16px; font-weight: bold;');
  console.log('='.repeat(70));
  Object.entries(results).forEach(([key, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    console.log(`%c${key}: ${status}`, `color: ${color}; font-weight: bold;`);
  });
})();
```

## Backend Server Debugging Steps

### Step 1: Check Backend Server Logs

Look at the terminal where your backend server is running. You should see detailed error messages like:

```
Get comments error: [Error details]
Error stack: [Stack trace]
```

**Share these error messages** - they will tell us exactly what's wrong.

### Step 2: Verify Backend Server is Running

1. Open a new terminal
2. Navigate to the backend directory: `cd backend`
3. Check if the server is running: Look for `🚀 Build Watch LGU Server running on port 3000`

### Step 3: Restart Backend Server

**IMPORTANT:** The backend server MUST be restarted after code changes!

1. Stop the server (Ctrl+C in the backend terminal)
2. Start it again: `npm start` or `node server.js`

### Step 4: Verify Database Tables Exist

Run this SQL query in your MySQL database:

```sql
SHOW TABLES LIKE 'announcement%';
```

You should see:
- `announcement_comments`
- `announcement_reactions`
- `announcement_favorites`
- `announcements`

If tables are missing, run the migration:

```bash
cd backend
node scripts/run-phase3a-migration.js
```

### Step 5: Check Model Loading

The backend should log model loading. Check the server startup logs for any model-related errors.

## Common Issues and Solutions

### Issue 1: "500 Internal Server Error"
- **Cause:** Backend code error or database issue
- **Solution:** Check backend console logs for detailed error message

### Issue 2: "Table doesn't exist"
- **Cause:** Migration not run
- **Solution:** Run the Phase 3A migration script

### Issue 3: "Model not found"
- **Cause:** Model file missing or not loaded
- **Solution:** Verify model files exist in `backend/models/` directory

### Issue 4: "Association error"
- **Cause:** Model associations not set up correctly
- **Solution:** Check model `associate` functions

## What to Share for Help

1. **Backend console error logs** (the full error message and stack trace)
2. **Results from the console debugging script** (copy the entire output)
3. **Database table verification** (output of `SHOW TABLES LIKE 'announcement%'`)
4. **Backend server startup logs** (first 20-30 lines after starting)

