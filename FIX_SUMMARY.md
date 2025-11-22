# Fix Summary: Projects Not Visible for LGU-IU and MPMEC Secretariat

## Problem
- Projects are not visible in LGU-IU and MPMEC Secretariat dashboards
- Projects ARE visible in EIU dashboard
- Projects ARE visible in submissions.astro module
- Getting 500 Internal Server Error when fetching projects

## Root Cause
The issue was in the `GET /api/projects` endpoint in `backend/routes/projects.js`:
1. **Progress calculation errors** were breaking the entire request - if one project's progress calculation failed, the entire Promise.all would fail
2. **Insufficient error handling** - errors weren't being caught and logged properly
3. **Missing debugging information** - hard to diagnose what was going wrong

## Fixes Applied

### 1. Backend Error Handling (`backend/routes/projects.js`)
- ✅ Wrapped progress calculation in try-catch blocks to prevent one failing project from breaking the entire list
- ✅ Added comprehensive error logging with stack traces
- ✅ Added fallback progress values when calculation fails
- ✅ Added detailed logging for LGU-IU and LGU-PMT role filtering
- ✅ Added query result logging to track how many projects are found

### 2. Frontend Error Handling (`frontend/src/pages/dashboard/iu-implementing-office/modules/project-management.astro`)
- ✅ Improved error handling to show detailed error messages
- ✅ Added logging for successful project loads
- ✅ Better error parsing to show debug information from API

### 3. Debugging Script (`debug-projects-api.js`)
- ✅ Created a comprehensive debugging script that can be run in the browser console
- ✅ Checks user profile, fetches projects, and provides detailed diagnostics
- ✅ Compares results with submissions endpoint to identify filtering issues

## How to Debug

### Step 1: Run the Debugging Script
1. Open your browser console (F12) on the dashboard page
2. Copy the contents of `debug-projects-api.js`
3. Paste and run: `await debugProjectsAPI()`

This will show you:
- Your user profile and role information
- Whether the API call succeeds or fails
- How many projects are returned
- Comparison with submissions endpoint
- Detailed error messages if any

### Step 2: Check Backend Logs
Look for these log messages in your backend server console:

**For LGU-IU:**
```
🔍 LGU-IU filtering: { userId, userRole, implementingOfficeId, implementingOfficeName, ... }
🔍 Final whereClause for projects query: { ... }
✅ Found X projects for LGU-IU (user Y)
```

**For MPMEC Secretariat:**
```
🔍 LGU-PMT filtering: { userId, userRole, subRole, hasSecretariatSubrole }
🔍 Final whereClause for projects query: { ... }
✅ Found X projects for LGU-PMT (user Y)
```

**If there's an error:**
```
❌ Error calculating progress for project X: ...
❌ Error processing project X: ...
❌ Get projects error: ...
```

### Step 3: Verify Role-Based Filtering

**LGU-IU Filtering:**
- Projects are filtered by `implementingOfficeId = user.id` OR `implementingOfficeName = user.officeName`
- Check if projects have the correct `implementingOfficeId` or `implementingOfficeName` set

**MPMEC Secretariat Filtering:**
- Must have `subRole` containing "secretariat" (case-insensitive)
- Projects are filtered by `workflowStatus` in: ['submitted', 'secretariat_approved', 'ongoing', 'completed', 'compiled_for_secretariat', 'validated_by_secretariat']
- Check if projects have the correct `workflowStatus` values

## Testing

1. **Test LGU-IU Dashboard:**
   - Log in as LGU-IU user
   - Navigate to Project Management dashboard
   - Check browser console for logs
   - Check backend console for filtering logs

2. **Test MPMEC Secretariat Dashboard:**
   - Log in as MPMEC Secretariat user (LGU-PMT with Secretariat subrole)
   - Navigate to dashboard
   - Check browser console for logs
   - Check backend console for filtering logs

3. **Verify Projects Exist:**
   - Check submissions.astro - projects should be visible there
   - Compare project data between submissions and main endpoint
   - Verify `implementingOfficeId`, `implementingOfficeName`, and `workflowStatus` values

## Common Issues and Solutions

### Issue: "No Projects Found" but projects exist in submissions
**Solution:** Check the role-based filtering:
- For LGU-IU: Verify `implementingOfficeId` or `implementingOfficeName` matches the user
- For MPMEC Secretariat: Verify `workflowStatus` is in the allowed list

### Issue: 500 Internal Server Error
**Solution:** 
- Check backend logs for the specific error
- The new error handling should prevent progress calculation errors from breaking the entire request
- Individual projects with errors will now be included with fallback progress values

### Issue: Projects visible in EIU but not LGU-IU
**Solution:**
- EIU uses `/api/eiu/projects` endpoint (different filtering)
- LGU-IU uses `/api/projects` endpoint with role-based filtering
- Verify the project's `implementingOfficeId` matches the LGU-IU user's ID

## Files Modified

1. `backend/routes/projects.js` - Enhanced error handling and logging
2. `frontend/src/pages/dashboard/iu-implementing-office/modules/project-management.astro` - Better error handling
3. `debug-projects-api.js` - New debugging script

## Next Steps

If issues persist after these fixes:
1. Run the debugging script and share the output
2. Check backend logs and share relevant error messages
3. Verify user roles and project data in the database
4. Check if projects have correct `implementingOfficeId`/`implementingOfficeName` and `workflowStatus` values

