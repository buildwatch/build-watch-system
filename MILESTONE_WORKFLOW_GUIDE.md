# 📋 Milestone Workflow System Guide

## 🔄 **Complete Milestone Workflow Overview**

### **1. Milestone Update Flow**

```
EIU Partner → Implementing Office → Secretariat → Compilation
```

#### **Step 1: EIU Partner Submits Milestone Update**
- **Role**: `EIU` (External Implementation Unit)
- **Action**: Submit milestone update with progress details
- **Status**: `ProjectUpdate.status: 'submitted'`
- **Contains**: Timeline, Budget, Physical progress data

#### **Step 2: Implementing Office Reviews**
- **Role**: `LGU-IU` (Implementing Office)
- **Action**: Review and approve/reject milestone update
- **Status**: `ProjectUpdate.status: 'iu_approved'` or `'iu_rejected'`
- **Result**: Milestone update approved for Secretariat review

#### **Step 3: Secretariat Review**
- **Role**: `LGU-PMT-MPMEC-SECRETARIAT`
- **Action**: Review approved milestone updates
- **Status**: `ProjectUpdate.status: 'secretariat_approved'`
- **Result**: Progress validated and applied to project

#### **Step 4: Project Compilation**
- **Status**: `Project.workflowStatus: 'validated_by_secretariat'`
- **Result**: Project appears in Compilation Summary

---

## 🛠️ **API Endpoints**

### **For EIU Users**

#### **1. Submit Milestone Update**
```http
POST /api/projects/{projectId}/updates
Authorization: Bearer [token]
Content-Type: application/json

{
  "updateType": "milestone",
  "title": "Milestone 1 Completion",
  "description": "Completed excavation and site preparation",
  "currentProgress": 25,
  "milestoneUpdates": [
    {
      "milestoneId": "uuid",
      "status": "completed",
      "progress": 100,
      "physicalDescription": "Area cleared and excavated",
      "budgetAllocation": 900000,
      "budgetBreakdown": "Detailed cost breakdown"
    }
  ]
}
```

### **For Implementing Office**

#### **1. Review Milestone Updates**
```http
PUT /api/project-updates/{updateId}/iu-review
Authorization: Bearer [token]
Content-Type: application/json

{
  "action": "approve",
  "adjustedProgress": 25,
  "remarks": "Approved milestone completion"
}
```

### **For Secretariat**

#### **1. Review Approved Updates**
```http
PUT /api/project-updates/{updateId}/secretariat-review
Authorization: Bearer [token]
Content-Type: application/json

{
  "action": "approve",
  "finalProgress": 25,
  "remarks": "Progress validated"
}
```

---

## 🔍 **Troubleshooting Guide**

### **Issue: "Milestone update not showing in Secretariat"**

#### **Check 1: Update Status**
```sql
SELECT updateType, status, submittedByRole, createdAt 
FROM project_updates 
WHERE projectId = '[PROJECT_ID]' 
ORDER BY createdAt DESC;
```

**Expected Values:**
- `status`: `'iu_approved'` (for Secretariat review)
- `submittedByRole`: `'eiu'`

#### **Check 2: Project Workflow Status**
```sql
SELECT workflowStatus, submittedToSecretariat, approvedBySecretariat 
FROM projects 
WHERE projectCode = 'PRJ-2025-076329';
```

**Expected Values:**
- `workflowStatus`: `'submitted'` or `'secretariat_approved'`
- `submittedToSecretariat`: `true`

#### **Check 3: User Role Permissions**
```sql
SELECT role, subRole FROM users WHERE id = '[SECRETARIAT_USER_ID]';
```

**Valid Secretariat Roles:**
- `role`: `'LGU-PMT'`
- `subRole`: `'MPMEC Secretariat'`

### **Issue: "Project not in Submissions & Tracker"**

#### **Root Cause Analysis:**
- **Approved projects** move to **Compilation Summary**
- **Pending projects** appear in **Submissions & Tracker**
- **Validated projects** appear in **Compilation Summary**

#### **Solution:**
1. **Check Compilation Summary** for approved projects
2. **Use proper workflow status** for filtering
3. **Update frontend logic** to show correct projects

---

## 📊 **Workflow Status Reference**

| Project Status | Update Status | Visible In | Next Action |
|----------------|---------------|------------|-------------|
| `submitted` | `submitted` | Submissions & Tracker | Secretariat Review |
| `submitted` | `iu_approved` | Submissions & Tracker | Secretariat Review |
| `secretariat_approved` | `secretariat_approved` | Compilation Summary | Progress Validation |
| `validated_by_secretariat` | `secretariat_approved` | Compilation Summary | Continue Monitoring |
| `ongoing` | `secretariat_approved` | Compilation Summary | Regular Updates |

---

## 🔧 **Maintenance Scripts**

### **1. Check Milestone Workflow**
```bash
npm run check-milestone-workflow
```
**Purpose**: Analyzes milestone workflow status and identifies issues

### **2. Fix Workflow Status**
```bash
npm run fix-workflow
```
**Purpose**: Fixes inconsistent workflow statuses

### **3. Reset Project Status**
```bash
node scripts/reset-project-status.js [projectCode]
```
**Purpose**: Reset project to appropriate workflow status

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Milestone update approved but not visible to Secretariat"**

**Symptoms:**
- EIU submitted milestone update
- IU approved the update
- Secretariat can't see the update

**Causes:**
1. Update status not properly set to `'iu_approved'`
2. Project workflow status not updated
3. API filtering logic incorrect

**Solutions:**
1. Check update status in database
2. Verify project workflow status
3. Update API filtering logic

### **Issue 2: "Project not in Submissions & Tracker"**

**Symptoms:**
- Project exists but not visible in Submissions
- Empty submissions list

**Causes:**
1. Project already approved (moved to Compilation)
2. Workflow status filtering incorrect
3. Role permissions issue

**Solutions:**
1. Check Compilation Summary for approved projects
2. Verify workflow status filtering
3. Check user role permissions

### **Issue 3: "Progress not updating after approval"**

**Symptoms:**
- Milestone approved but project progress unchanged
- Progress calculation not working

**Causes:**
1. Progress calculation service not triggered
2. Milestone weight not properly applied
3. Database update failed

**Solutions:**
1. Trigger progress recalculation
2. Verify milestone weight values
3. Check database constraints

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

#### **Check Milestone Updates**
```bash
# Check milestone updates for project
node -e "
const { ProjectUpdate } = require('./backend/models');
ProjectUpdate.findAll({ 
  where: { projectId: 'dbd25936-6900-4470-b634-8630ac165c9b' },
  order: [['createdAt', 'DESC']]
})
.then(updates => console.log(JSON.stringify(updates, null, 2)));
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

- [ ] EIU can submit milestone updates
- [ ] IU can approve milestone updates
- [ ] Secretariat can see approved updates
- [ ] Project appears in correct dashboard section
- [ ] Progress calculations work correctly
- [ ] Workflow status transitions properly
- [ ] All role permissions working
- [ ] API endpoints responding correctly

---

## 🔄 **Long-Term Maintenance**

### **Regular Checks**
1. **Weekly**: Run milestone workflow check script
2. **Monthly**: Review workflow status consistency
3. **Quarterly**: Audit milestone weight calculations

### **Monitoring**
- Monitor milestone update submissions
- Track approval workflow times
- Review progress calculation accuracy

### **Updates**
- Keep workflow documentation updated
- Test new features thoroughly
- Maintain backup scripts

---

## 🎯 **Key Workflow Rules**

### **1. Project Visibility Rules**
- **Submissions & Tracker**: Projects with `workflowStatus: 'submitted'`
- **Compilation Summary**: Projects with `workflowStatus: 'secretariat_approved'` or `'validated_by_secretariat'`

### **2. Update Status Progression**
- `submitted` → `iu_approved` → `secretariat_approved`

### **3. Progress Calculation**
- Milestone weight determines project progress
- Secretariat approval triggers progress update
- Automated calculation based on approved milestones

---

*Last Updated: July 21, 2025*
*Version: 1.0* 