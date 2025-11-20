# Open Data Portal - Security Assessment Report

## Executive Summary

**Current Status:** ⚠️ **PARTIALLY SECURE** - The open-data.astro page itself is safe (no backend calls), but existing public API endpoints have some security concerns.

---

## Analysis of open-data.astro Page

### ✅ **SAFE - Current Implementation**

The `open-data.astro` page is **currently secure** because:

1. **No Backend API Calls:** All functionality is client-side only
2. **Static UI Elements:** Data category cards are hardcoded HTML
3. **Placeholder Modals:** "View Data" buttons show static modals only
4. **No Form Submission:** Data request form doesn't actually submit to backend
5. **No Real Data Exposure:** No sensitive project or user data is fetched

### Current Features (All Safe):
- ✅ Search functionality (client-side filtering only)
- ✅ Data category display (static cards)
- ✅ "View Data" modals (placeholder content)
- ✅ Download section (display only)
- ✅ API documentation section (display only)
- ✅ Data request form (no backend submission)

---

## ⚠️ **SECURITY CONCERNS - Existing Public API Endpoints**

### 1. **`GET /api/projects/public`** - ⚠️ **MINOR CONCERN**

**Location:** `backend/routes/projects.js:1213`

**Issues Found:**
- ✅ **GOOD:** User IDs and usernames are queried but NOT returned in response
- ✅ **GOOD:** Only user names are returned (`implementingOfficeName`, `eiuPersonnelName`)
- ✅ **GOOD:** Budget breakdown is excluded
- ⚠️ **CONCERN:** Database IDs are exposed (should use public project codes instead)
- ⚠️ **CONCERN:** User information is still queried from database (unnecessary)

**Recommendation:**
```javascript
// Remove user includes entirely - only use names from project fields
// Don't query User table for public endpoints
// Use project.implementingOfficeName and project.eiuPersonnelName directly
```

### 2. **`GET /api/milestones/project/:projectId/public`** - ⚠️ **SECURITY RISK**

**Location:** `backend/routes/milestones.js:279`

**Issues Found:**
- ❌ **RISK:** `budgetBreakdown` is exposed (line 309) - contains detailed financial information
- ❌ **RISK:** `validationComments` is exposed (line 311) - may contain internal information
- ❌ **RISK:** `validationDate` is exposed (line 311) - internal validation details

**Recommendation:**
```javascript
// Remove sensitive fields from public milestone endpoint:
attributes: [
  'id', 'title', 'description', 'weight', 'dueDate', 
  'completedDate', 'status', 'progress', 'priority', 'order',
  'timelineWeight', 'timelineStartDate', 'timelineEndDate', 
  'timelineDescription', 'timelineStatus',
  // ❌ REMOVE: 'budgetBreakdown', 'budgetPlanned', 'budgetStatus'
  // ❌ REMOVE: 'validationComments', 'validationDate'
  // ✅ KEEP: Only public-facing milestone information
]
```

### 3. **`GET /api/projects/public/:id`** - ⚠️ **REVIEW NEEDED**

**Location:** `backend/routes/projects.js:1338`

**Needs Review:** Check if this endpoint exposes any sensitive data beyond what's in the list endpoint.

---

## 🔒 **Recommended Security Measures**

### 1. **Data Sanitization Checklist**

**Fields to ALWAYS EXCLUDE from public APIs:**
- ❌ User IDs, emails, contact numbers
- ❌ User roles and permissions
- ❌ Internal comments and validations
- ❌ Detailed budget breakdowns
- ❌ Validation comments and dates
- ❌ Internal project statuses
- ❌ Database UUIDs (use public codes instead)
- ❌ Activity logs
- ❌ User authentication data

**Fields SAFE to include:**
- ✅ Project names and descriptions
- ✅ Project codes (public identifiers)
- ✅ Overall progress percentages
- ✅ Public project statuses
- ✅ Start/end dates
- ✅ Total budget (no breakdown)
- ✅ Public names (not user IDs)
- ✅ Project locations
- ✅ Categories and priorities

### 2. **Implement Rate Limiting**

Add rate limiting to all public endpoints:
```javascript
const rateLimit = require('express-rate-limit');

const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

router.get('/public', publicApiLimiter, async (req, res) => {
  // ... endpoint code
});
```

### 3. **Field Whitelisting**

Use explicit field selection instead of excluding fields:
```javascript
// ✅ GOOD: Explicit whitelist
const publicFields = [
  'name', 'projectCode', 'description', 'category',
  'location', 'status', 'startDate', 'endDate',
  'totalBudget', 'overallProgress'
];

// ❌ BAD: Including all and excluding sensitive
const project = await Project.findByPk(id);
delete project.sensitiveField; // Too easy to miss fields
```

### 4. **Project Status Filtering**

Only show approved/public projects:
```javascript
const whereClause = {
  approvedBySecretariat: true,
  approvedByMPMEC: true, // If applicable
  status: { [Op.in]: ['approved', 'in-progress', 'completed'] }, // Only public statuses
  isPublic: true // Add this field to Project model if needed
};
```

### 5. **Remove User Table Queries**

Don't query User table for public endpoints:
```javascript
// ❌ BAD: Queries User table
include: [{
  model: User,
  as: 'implementingOffice',
  attributes: ['id', 'name'] // Still queries User table
}]

// ✅ GOOD: Use project fields directly
implementingOfficeName: project.implementingOfficeName // Already in Project model
```

---

## 📋 **Action Items**

### Immediate (High Priority)
1. [ ] **Fix milestones public endpoint** - Remove `budgetBreakdown`, `validationComments`, `validationDate`
2. [ ] **Review `/api/projects/public/:id`** - Ensure no sensitive data exposure
3. [ ] **Add rate limiting** to all public endpoints
4. [ ] **Remove User table queries** from public project endpoints

### Short Term (Medium Priority)
5. [ ] **Replace database IDs with public codes** in responses
6. [ ] **Add field whitelisting** to all public endpoints
7. [ ] **Implement data sanitization middleware**
8. [ ] **Add API monitoring** for suspicious activity

### Long Term (Low Priority)
9. [ ] **Create dedicated public data service** layer
10. [ ] **Add API versioning** (`/api/v1/public/...`)
11. [ ] **Implement API documentation** with security notes
12. [ ] **Add automated security testing** for public endpoints

---

## ✅ **Conclusion**

**The open-data.astro page is currently SAFE** - it doesn't make any backend calls and only displays static content.

**However, existing public API endpoints need security improvements** before the open-data page can safely connect to them.

**Recommendation:** Fix the security issues in existing public endpoints before connecting the open-data.astro page to real data sources.

