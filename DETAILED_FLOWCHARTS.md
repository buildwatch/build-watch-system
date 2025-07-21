# BUILD WATCH LGU - DETAILED FLOWCHARTS

## 🔄 1. USER AUTHENTICATION FLOW

```
START
  │
  ▼
┌─────────────────┐
│   User visits   │
│   login page    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Enter         │
│   credentials   │
│   (username/    │
│    password)    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   validates     │
│   input format  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Send POST     │
│   to /auth/login│
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Backend       │
│   receives      │
│   request       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Check if      │
│   user exists   │
│   in database   │
└─────────────────┘
  │
  ├─ NO ──► Return error: "Invalid credentials"
  │
  ▼
┌─────────────────┐
│   Verify        │
│   password      │
│   with bcrypt   │
└─────────────────┘
  │
  ├─ FAIL ──► Return error: "Invalid credentials"
  │
  ▼
┌─────────────────┐
│   Check user    │
│   status        │
│   (active/      │
│    blocked)     │
└─────────────────┘
  │
  ├─ BLOCKED ──► Return error: "Account blocked"
  │
  ▼
┌─────────────────┐
│   Generate      │
│   JWT token     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Update        │
│   lastLoginAt   │
│   timestamp     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Return        │
│   success with  │
│   token & user  │
│   data          │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   stores token  │
│   in localStorage│
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Redirect to   │
│   role-based    │
│   dashboard     │
└─────────────────┘
  │
  ▼
END
```

## 🔄 2. PROJECT CREATION FLOW

```
START
  │
  ▼
┌─────────────────┐
│   EIU/LGU-IU    │
│   user logs in  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Navigate to   │
│   Projects      │
│   module        │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Click "Create │
│   New Project"  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Fill project  │
│   form:         │
│   • Name        │
│   • Description │
│   • Category    │
│   • Location    │
│   • Budget      │
│   • Timeline    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   validates     │
│   form data     │
└─────────────────┘
  │
  ├─ FAIL ──► Show validation errors
  │
  ▼
┌─────────────────┐
│   Submit form   │
│   to /projects  │
│   API           │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Backend       │
│   validates     │
│   user role     │
│   (EIU/LGU-IU)  │
└─────────────────┘
  │
  ├─ FAIL ──► Return error: "Insufficient permissions"
  │
  ▼
┌─────────────────┐
│   Validate      │
│   project data  │
│   format        │
└─────────────────┘
  │
  ├─ FAIL ──► Return validation errors
  │
  ▼
┌─────────────────┐
│   Generate      │
│   unique        │
│   project code  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Create        │
│   project       │
│   record in DB  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Create        │
│   initial       │
│   milestones    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Log activity  │
│   in audit      │
│   trail         │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Return        │
│   success with  │
│   project ID    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   shows success │
│   message       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Redirect to   │
│   project       │
│   details page  │
└─────────────────┘
  │
  ▼
END
```

## 🔄 3. RPMES FORM PROCESSING FLOW

```
START
  │
  ▼
┌─────────────────┐
│   User selects  │
│   RPMES form    │
│   (1-11)        │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Check user    │
│   role and      │
│   permissions   │
└─────────────────┘
  │
  ├─ Forms 1-4 ──► Check if EIU/LGU-IU
  ├─ Forms 5-11 ──► Check if LGU-PMT
  └─ FAIL ──► Show "Access Denied"
  │
  ▼
┌─────────────────┐
│   Check if      │
│   form already  │
│   exists for    │
│   project       │
└─────────────────┘
  │
  ├─ EXISTS ──► Load existing form data
  └─ NEW ──► Show empty form
  │
  ▼
┌─────────────────┐
│   User fills    │
│   form data     │
│   according to  │
│   RPMES format  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   validates     │
│   form fields   │
└─────────────────┘
  │
  ├─ FAIL ──► Show validation errors
  │
  ▼
┌─────────────────┐
│   User chooses  │
│   action:       │
│   • Save Draft  │
│   • Submit      │
└─────────────────┘
  │
  ├─ DRAFT ──► Save to database with "Draft" status
  └─ SUBMIT ──► Continue to submission
  │
  ▼
┌─────────────────┐
│   Backend       │
│   validates     │
│   form data     │
└─────────────────┘
  │
  ├─ FAIL ──► Return validation errors
  │
  ▼
┌─────────────────┐
│   Check form    │
│   uniqueness    │
│   (one per      │
│    project)     │
└─────────────────┘
  │
  ├─ DUPLICATE ──► Return error: "Form already exists"
  │
  ▼
┌─────────────────┐
│   Save form     │
│   to database   │
│   with status   │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Log activity  │
│   in audit      │
│   trail         │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   User chooses  │
│   to export     │
│   Excel?        │
└─────────────────┘
  │
  ├─ YES ──► Generate Excel file with RPMES format
  └─ NO ──► Continue
  │
  ▼
┌─────────────────┐
│   Return        │
│   success       │
│   response      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   shows success │
│   message       │
└─────────────────┘
  │
  ▼
END
```

## 🔄 4. PROJECT MONITORING FLOW

```
START
  │
  ▼
┌─────────────────┐
│   EIU user      │
│   logs in       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Navigate to   │
│   "Submit       │
│   Update"       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Select        │
│   project from  │
│   assigned list │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Choose        │
│   milestone     │
│   to update     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Fill progress │
│   data:         │
│   • % Complete  │
│   • Budget Used │
│   • Remarks     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Upload        │
│   supporting    │
│   documents     │
│   (photos,      │
│    receipts)    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Submit        │
│   update to     │
│   /project-     │
│   updates API   │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Backend       │
│   validates     │
│   data          │
└─────────────────┘
  │
  ├─ FAIL ──► Return validation errors
  │
  ▼
┌─────────────────┐
│   Save update   │
│   to database   │
│   with status   │
│   "submitted"   │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Process file  │
│   uploads       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Recalculate   │
│   project       │
│   progress      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Send          │
│   notification  │
│   to LGU-PMT    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   LGU-PMT       │
│   reviews       │
│   update        │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   LGU-PMT       │
│   approves or   │
│   requests      │
│   changes       │
└─────────────────┘
  │
  ├─ APPROVE ──► Update status to "approved"
  └─ REQUEST CHANGES ──► Send feedback to EIU
  │
  ▼
┌─────────────────┐
│   Update        │
│   project       │
│   progress      │
│   dashboard     │
└─────────────────┘
  │
  ▼
END
```

## 🔄 5. SYSTEM ADMINISTRATION FLOW

```
START
  │
  ▼
┌─────────────────┐
│   SYS.AD user   │
│   logs in       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Access        │
│   SysAdmin      │
│   Dashboard     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Choose        │
│   admin action: │
│   • User Mgmt   │
│   • System Logs │
│   • Backup      │
│   • Config      │
└─────────────────┘
  │
  ├─ USER MGMT ──► User Management Flow
  ├─ SYSTEM LOGS ──► Audit Logs Flow
  ├─ BACKUP ──► Backup Management Flow
  └─ CONFIG ──► System Configuration Flow
  │
  ▼
┌─────────────────┐
│   Perform       │
│   selected      │
│   action        │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Log admin     │
│   activity in   │
│   audit trail   │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Return        │
│   success/      │
│   error         │
│   response      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Update        │
│   admin         │
│   dashboard     │
└─────────────────┘
  │
  ▼
END
```

## 🔄 6. EXCEL EXPORT FLOW

```
START
  │
  ▼
┌─────────────────┐
│   User requests │
│   Excel export  │
│   (RPMES form)  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   calls export  │
│   API endpoint  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Backend       │
│   validates     │
│   user          │
│   permissions   │
└─────────────────┘
  │
  ├─ FAIL ──► Return error: "Access denied"
  │
  ▼
┌─────────────────┐
│   Fetch form    │
│   data from     │
│   database      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Format data   │
│   according to  │
│   RPMES         │
│   template      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Create Excel  │
│   workbook      │
│   using ExcelJS │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Apply RPMES   │
│   formatting:   │
│   • Headers     │
│   • Borders     │
│   • Fonts       │
│   • Colors      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Add form      │
│   data to       │
│   worksheet     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Generate      │
│   filename with │
│   timestamp     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Set response  │
│   headers for   │
│   file download │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Stream Excel  │
│   file to       │
│   client        │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Frontend      │
│   triggers      │
│   file download │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Log export    │
│   activity in   │
│   audit trail   │
└─────────────────┘
  │
  ▼
END
```

## 🔄 7. NOTIFICATION SYSTEM FLOW

```
START
  │
  ▼
┌─────────────────┐
│   System event  │
│   occurs        │
│   (update,      │
│    approval,    │
│    deadline)    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Determine     │
│   notification  │
│   type and      │
│   recipients    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Create        │
│   notification  │
│   record in DB  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Store         │
│   notification  │
│   data:         │
│   • Type        │
│   • Message     │
│   • Recipients  │
│   • Priority    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Update user   │
│   notification  │
│   count in      │
│   frontend      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   User views    │
│   notifications │
│   in dashboard  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Mark          │
│   notification  │
│   as read       │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Update        │
│   notification  │
│   status in DB  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Update        │
│   notification  │
│   count         │
└─────────────────┘
  │
  ▼
END
```

These detailed flowcharts provide comprehensive understanding of the key processes in the Build Watch LGU system, showing the step-by-step flow of data and actions through the system. 