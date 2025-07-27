# 📋 Project Workflow System Guide

## 🔄 **Complete Workflow Overview**

### **1. Project Creation & Submission Flow**

```
Implementing Office (IU) → Secretariat → MPMEC → Implementation
```

#### **Step 1: Project Creation (IU)**
- **Role**: `LGU-IU` (Implementing Office)
- **Action**: Create new project
- **Status**: `workflowStatus: 'submitted'`
- **Flag**: `submittedToSecretariat: true`
- **Date**: `submittedToSecretariatDate: [timestamp]`

#### **Step 2: Secretariat Review**
- **Role**: `LGU-PMT-MPMEC-SECRETARIAT`
- **Action**: Review and approve/reject project
- **Status**: `workflowStatus: 'secretariat_approved'` or back to `'draft'`
- **Flag**: `approvedBySecretariat: true/false`

#### **Step 3: MPMEC Review (Optional)**
- **Role**: `LGU-PMT`
- **Action**: Final review and approval
- **Status**: `workflowStatus: 'ongoing'`
- **Flag**: `approvedByMPMEC: true`

#### **Step 4: Implementation**
- **Status**: `workflowStatus: 'ongoing'`
- **Progress Updates**: Regular milestone and progress updates

---

## 🛠️ **API Endpoints**

### **For Secretariat Users**

#### **1. Get Submissions for Review**
```http
GET /api/projects/secretariat/submissions
Authorization: Bearer [token]
```

**Response:**
```json
{
  "success": true,
  "projects": [...],
  "stats": {
    "totalSubmissions": 3,
    "pendingReview": 1,
    "approved": 2,
    "overdue": 0
  }
}
```

#### **2. Approve Project**
```http
POST /api/projects/{projectId}/approve
Authorization: Bearer [token]
Content-Type: application/json

{
  "approved": true,
  "comments": "Project approved for implementation"
}
```

#### **3. Reject Project**
```http
POST /api/projects/{projectId}/approve
Authorization: Bearer [token]
Content-Type: application/json

{
  "approved": false,
  "comments": "Please revise the budget allocation"
}
```

---

## 🔍 **Troubleshooting Guide**

### **Issue: Project Not Visible in Secretariat Dashboard**

#### **Check 1: Project Workflow Status**
```sql
SELECT projectCode, name, workflowStatus, submittedToSecretariat 
FROM projects 
WHERE implementingOfficeId = '[IU_USER_ID]';
```

**Expected Values:**
- `workflowStatus`: `'submitted'`
- `submittedToSecretariat`: `true`

#### **Check 2: User Role Permissions**
```sql
SELECT role, subRole FROM users WHERE id = '[SECRETARIAT_USER_ID]';
```

**Valid Secretariat Roles:**
- `role`: `'secretariat'` OR `'LGU-PMT-MPMEC-SECRETARIAT'`
- `subRole`: `'Secretariat'` OR `'MPMEC Secretariat'` (if role is `'LGU-PMT'`)

#### **Check 3: API Response**
```javascript
// Test the Secretariat submissions endpoint
fetch('/api/projects/secretariat/submissions', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.json())
.then(data => console.log('Submissions:', data));
```

### **Issue: Project Stuck in Wrong Status**

#### **Fix 1: Run Workflow Fix Script**
```bash
cd backend
npm run fix-workflow
```

#### **Fix 2: Manual Database Update**
```sql
-- Fix project workflow status
UPDATE projects 
SET workflowStatus = 'submitted',
    submittedToSecretariat = true,
    submittedToSecretariatDate = NOW()
WHERE projectCode = 'PRJ-2025-076329';
```

---

## 📊 **Workflow Status Reference**

| Status | Description | Visible To | Next Action |
|--------|-------------|------------|-------------|
| `draft` | Project created but not submitted | IU only | Submit to Secretariat |
| `submitted` | Submitted to Secretariat for review | Secretariat | Approve/Reject |
| `secretariat_approved` | Approved by Secretariat | MPMEC, Secretariat | MPMEC review |
| `ongoing` | Project in implementation | All roles | Progress updates |
| `completed` | Project finished | All roles | Archive |
| `cancelled` | Project cancelled | All roles | Archive |
| `compiled_for_secretariat` | Reports compiled for Secretariat | Secretariat | Validate |
| `validated_by_secretariat` | Reports validated by Secretariat | All roles | Continue |

---

## 🔧 **Maintenance Scripts**

### **1. Fix Project Workflow**
```bash
npm run fix-workflow
```
**Purpose**: Fixes inconsistent workflow statuses and submission flags

### **2. Check Secretariat Visibility**
```bash
node scripts/check-secretariat-visibility.js
```
**Purpose**: Lists all projects visible to Secretariat

### **3. Reset Project Status**
```bash
node scripts/reset-project-status.js [projectCode]
```
**Purpose**: Reset a specific project to draft status

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Project not showing in Secretariat submissions"**

**Symptoms:**
- Project created by IU but not visible to Secretariat
- Empty submissions list in Secretariat dashboard

**Causes:**
1. `workflowStatus` not set to `'submitted'`
2. `submittedToSecretariat` not set to `true`
3. Secretariat user role not properly configured

**Solutions:**
1. Run `npm run fix-workflow`
2. Check user role permissions
3. Verify API endpoint is being called correctly

### **Issue 2: "Cannot approve project"**

**Symptoms:**
- Approve button not working
- 403 Forbidden error

**Causes:**
1. User doesn't have Secretariat role
2. Project not in `'submitted'` status
3. API endpoint permissions issue

**Solutions:**
1. Verify user role: `'LGU-PMT-MPMEC-SECRETARIAT'`
2. Check project workflow status
3. Ensure proper authentication token

### **Issue 3: "Project stuck in wrong status"**

**Symptoms:**
- Project shows wrong status in dashboard
- Workflow progression blocked

**Causes:**
1. Database inconsistency
2. Missing workflow transitions
3. API error during status update

**Solutions:**
1. Run workflow fix script
2. Check database for inconsistencies
3. Review API logs for errors

---

## 📞 **Support & Debugging**

### **Debug Commands**

#### **Check Project Status**
```bash
# Check specific project
node -e "
const { Project } = require('./backend/models');
Project.findOne({ where: { projectCode: 'PRJ-2025-076329' } })
  .then(p => console.log(JSON.stringify(p, null, 2)));
"
```

#### **Check User Permissions**
```bash
# Check Secretariat user
node -e "
const { User } = require('./backend/models');
User.findOne({ where: { role: 'LGU-PMT-MPMEC-SECRETARIAT' } })
  .then(u => console.log(JSON.stringify(u, null, 2)));
"
```

#### **Test API Endpoint**
```bash
# Test Secretariat submissions endpoint
curl -H "Authorization: Bearer [TOKEN]" \
     http://localhost:3000/api/projects/secretariat/submissions
```

### **Log Files to Check**
- `backend/logs/app.log` - Application logs
- `backend/logs/error.log` - Error logs
- Browser Developer Tools - Network tab for API calls

---

## ✅ **Verification Checklist**

After implementing fixes, verify:

- [ ] Project appears in Secretariat submissions list
- [ ] Project shows correct workflow status
- [ ] Secretariat can approve/reject project
- [ ] Project moves to correct status after approval
- [ ] All role permissions working correctly
- [ ] API endpoints responding properly
- [ ] No database inconsistencies

---

## 🔄 **Long-Term Maintenance**

### **Regular Checks**
1. **Weekly**: Run workflow fix script
2. **Monthly**: Review project status consistency
3. **Quarterly**: Audit user role permissions

### **Monitoring**
- Monitor API response times
- Track failed approval attempts
- Review workflow status transitions

### **Updates**
- Keep workflow documentation updated
- Test new features thoroughly
- Maintain backup scripts

---

*Last Updated: July 21, 2025*
*Version: 1.0* 