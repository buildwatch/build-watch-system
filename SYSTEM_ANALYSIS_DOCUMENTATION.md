# BUILD WATCH LGU - SYSTEM ANALYSIS DOCUMENTATION

## 📊 1. DATA FLOW DIAGRAM (DFD)

### Level 0 - Context Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   Build Watch   │    │   External      │
│   Stakeholders  │◄──►│   LGU System    │◄──►│   Systems       │
│                 │    │                 │    │                 │
│ • LGU-PMT       │    │ • Web Interface │    │ • MySQL DB      │
│ • EIU Partners  │    │ • REST API      │    │ • File Storage  │
│ • LGU-IU Staff  │    │ • Auth System   │    │ • Email Service │
│ • EMS Monitors  │    │ • RPMES Engine  │    │ • Excel Export  │
│ • SYS.AD        │    │ • Monitoring    │    │ • Backup System │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Level 1 - System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User          │    │   Frontend      │    │   Backend       │
│   Interface     │◄──►│   (Astro)       │◄──►│   (Node.js)     │
│                 │    │                 │    │                 │
│ • Login Forms   │    │ • Components    │    │ • Express API   │
│ • Dashboards    │    │ • Pages         │    │ • Auth Middleware│
│ • RPMES Forms   │    │ • Services      │    │ • Route Handlers│
│ • Reports       │    │ • State Mgmt    │    │ • Business Logic│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (MySQL)       │
                       │                 │
                       │ • Users         │
                       │ • Projects      │
                       │ • RPMES Forms   │
                       │ • Activity Logs │
                       │ • Files         │
                       └─────────────────┘
```

### Level 2 - Detailed Data Flows

#### Authentication Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───►│   Frontend  │───►│   Auth API  │───►│   Database  │
│   Login     │    │   Login     │    │   /auth     │    │   Users     │
│             │    │   Form      │    │   /login    │    │   Table     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   JWT       │◄───│   Token     │◄───│   Validate  │◄───│   User      │
│   Token     │    │   Storage   │    │   Credentials│   │   Data      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### Project Management Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   EIU/LGU-IU│───►│   Project   │───►│   Project   │───►│   Projects  │
│   Create    │    │   Creation  │    │   API       │    │   Table     │
│   Project   │    │   Form      │    │   /projects │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Project   │◄───│   Project   │◄───│   Create    │◄───│   Project   │
│   Dashboard │    │   List      │    │   Record    │    │   ID        │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### RPMES Form Processing Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───►│   RPMES     │───►│   RPMES     │───►│   RPMES     │
│   Submit    │    │   Form      │    │   API       │    │   Forms     │
│   Form      │    │   Interface │    │   /rpmes    │    │   Table     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Form      │◄───│   Form      │◄───│   Validate  │◄───│   Form      │
│   Status    │    │   Preview   │    │   & Save    │    │   Data      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                │
                                ▼
                       ┌─────────────┐
                       │   Excel     │
                       │   Export    │
                       │   Service   │
                       └─────────────┘
```

#### Monitoring & Reporting Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   EIU       │───►│   Progress  │───►│   Project   │───►│   Project   │
│   Update    │    │   Update    │    │   Updates   │    │   Updates   │
│   Progress  │    │   Form      │    │   API       │    │   Table     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   LGU-PMT   │◄───│   Monitoring│◄───│   Generate  │◄───│   Progress  │
│   Review    │    │   Dashboard │    │   Reports   │    │   Data      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 🔄 2. SYSTEM FLOWCHART

### Main System Flow
```
START
  │
  ▼
┌─────────────────┐
│   User Access   │
│   Login Page    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Authentication│
│   JWT Token     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Role-Based    │
│   Dashboard     │
│   Redirect      │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   User Role?    │
└─────────────────┘
  │
  ├─ LGU-PMT ──► LGU-PMT Dashboard
  ├─ EIU ──────► EIU Dashboard  
  ├─ LGU-IU ───► LGU-IU Dashboard
  ├─ EMS ──────► EMS Dashboard
  └─ SYS.AD ───► SysAdmin Dashboard
  │
  ▼
┌─────────────────┐
│   Dashboard     │
│   Operations    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   User Action?  │
└─────────────────┘
  │
  ├─ Project Management ──► Project CRUD
  ├─ RPMES Forms ────────► Form Processing
  ├─ Monitoring ─────────► Progress Updates
  ├─ Reporting ──────────► Report Generation
  ├─ User Management ────► User CRUD (SYS.AD)
  └─ System Admin ───────► System Operations
  │
  ▼
┌─────────────────┐
│   Logout        │
└─────────────────┘
  │
  ▼
END
```

### Project Lifecycle Flow
```
START
  │
  ▼
┌─────────────────┐
│   Project       │
│   Creation      │
│   (EIU/LGU-IU)  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Project       │
│   Configuration │
│   • Timeline    │
│   • Budget      │
│   • Milestones  │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Project       │
│   Approval      │
│   (Secretariat) │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Project       │
│   Active        │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Progress      │
│   Updates       │
│   (EIU)         │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Monitoring    │
│   & Review      │
│   (LGU-PMT)     │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   RPMES         │
│   Compliance    │
│   Forms 1-11    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Project       │
│   Completion    │
└─────────────────┘
  │
  ▼
END
```

### RPMES Form Processing Flow
```
START
  │
  ▼
┌─────────────────┐
│   Form          │
│   Selection     │
└─────────────────┐
  │
  ▼
┌─────────────────┐
│   User Role     │
│   Check         │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Forms 1-4?    │
└─────────────────┘
  │
  ├─ YES ──► LGU-IU/EIU Access
  └─ NO ───► Forms 5-11?
  │
  ├─ YES ──► LGU-PMT Access
  └─ NO ───► Access Denied
  │
  ▼
┌─────────────────┐
│   Form          │
│   Data Entry    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Validation    │
└─────────────────┘
  │
  ▼
┌─────────────────┐
│   Save Draft    │
│   or Submit?    │
└─────────────────┘
  │
  ├─ Draft ──► Save to Database
  └─ Submit ──► Submit for Review
  │
  ▼
┌─────────────────┐
│   Export        │
│   Excel?        │
└─────────────────┘
  │
  ├─ YES ──► Generate Excel File
  └─ NO ───► Continue
  │
  ▼
END
```

---

## 🏗️ 3. CONCEPTUAL FRAMEWORK

### System Architecture Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD WATCH LGU SYSTEM                       │
│                    CONCEPTUAL FRAMEWORK                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PRESENTATION  │    │   BUSINESS      │    │   DATA          │
│   LAYER         │    │   LOGIC LAYER   │    │   LAYER         │
│                 │    │                 │    │                 │
│ • Astro Frontend│    │ • Express API   │    │ • MySQL Database│
│ • Role-Based UI │    │ • Route Handlers│    │ • Sequelize ORM │
│ • Responsive    │    │ • Auth Middleware│   │ • Data Models   │
│ • JWT Auth      │    │ • Business Rules│    │ • Migrations    │
│ • Excel Export  │    │ • Validation    │    │ • Seeders       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### User Role Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ROLES                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   LGU-PMT   │  │     EIU     │  │   LGU-IU    │  │     EMS     │
│             │  │             │  │             │  │             │
│ • Chair     │  │ • Partners  │  │ • Internal  │  │ • NGO       │
│ • Vice Chair│  │ • Contractors│  │ • Units     │  │ • CSO       │
│ • Secretariat│  │ • External  │  │ • Staff     │  │ • PPMC      │
│ • Monitoring│  │ • Projects  │  │ • Projects  │  │ • Monitoring│
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
        │               │               │               │
        └───────────────┼───────────────┼───────────────┘
                        │               │
                ┌─────────────┐  ┌─────────────┐
                │   SYS.AD    │  │   Executive │
                │             │  │   Viewer    │
                │ • Admin     │  │ • Read-Only │
                │ • System    │  │ • Reports   │
                │ • Users     │  │ • Analytics │
                └─────────────┘  └─────────────┘
```

### Data Model Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA MODELS                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    USERS    │    │   PROJECTS  │    │ RPMES FORMS │
│             │    │             │    │             │
│ • User Info │    │ • Project   │    │ • Form Data │
│ • Roles     │    │ • Timeline  │    │ • Versions  │
│ • Permissions│   │ • Budget    │    │ • Status    │
│ • Activity  │    │ • Progress  │    │ • Approval  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ ACTIVITY    │    │ MILESTONES  │    │ UPDATES     │
│ LOGS        │    │             │    │             │
│             │    │ • Milestone │    │ • Progress  │
│ • User      │    │ • Timeline  │    │ • Budget    │
│ • Action    │    │ • Weight    │    │ • Files     │
│ • Timestamp │    │ • Status    │    │ • Comments  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Process Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        PROCESS FLOW                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PROJECT   │───►│   PROGRESS  │───►│   MONITORING│───►│   REPORTING │
│   CREATION  │    │   UPDATES   │    │   & REVIEW  │    │   & EXPORT  │
│             │    │             │    │             │    │             │
│ • EIU/LGU-IU│    │ • EIU       │    │ • LGU-PMT   │    │ • RPMES     │
│ • Setup     │    │ • Milestones│    │ • Validation│    │ • Excel     │
│ • Approval  │    │ • Budget    │    │ • Feedback  │    │ • Analytics │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ACTIVITY  │    │   NOTIFICATIONS│  │   COMPLIANCE│    │   AUDIT     │
│   LOGGING   │    │             │    │   TRACKING  │    │   TRAIL     │
│             │    │ • Alerts    │    │ • Forms     │    │ • History   │
│ • User      │    │ • Reminders │    │ • Status    │    │ • Reports   │
│ • Action    │    │ • Updates   │    │ • Validation│    │ • Export    │
│ • Security  │    │ • Escalation│    │ • Approval  │    │ • Archive   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Security Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY MODEL                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   AUTHENTICATION│  │   AUTHORIZATION│  │   AUDIT     │
│             │    │             │    │             │
│ • JWT Token │    │ • Role-Based│    │ • Activity  │
│ • Password  │    │ • Permissions│   │ • Logs      │
│ • Session   │    │ • Access    │    │ • Tracking  │
│ • 2FA       │    │ • Control   │    │ • Reports   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   DATA      │    │   API       │    │   BACKUP    │
│   ENCRYPTION│    │   SECURITY  │    │   & RECOVERY│
│             │    │             │    │             │
│ • Passwords │    │ • Rate Limit│    │ • Database  │
│ • Sensitive │    │ • CORS      │    │ • Files     │
│ • Backup    │    │ • Validation│    │ • Logs      │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Integration Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        INTEGRATION                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   FRONTEND  │    │   BACKEND   │    │   EXTERNAL  │
│   INTEGRATION│   │   SERVICES  │    │   SYSTEMS   │
│             │    │             │    │             │
│ • API Calls │    │ • Database  │    │ • Email     │
│ • State Mgmt│    │ • File I/O  │    │ • SMS       │
│ • Auth      │    │ • Excel     │    │ • External  │
│ • UI/UX     │    │ • Reports   │    │ • APIs      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   REAL-TIME │    │   BATCH     │    │   EXPORT    │
│   UPDATES   │    │   PROCESSING│    │   SERVICES  │
│             │    │             │    │             │
│ • WebSocket │    │ • Cron Jobs │    │ • Excel     │
│ • Notifications│  │ • Reports  │    │ • PDF       │
│ • Live Data │    │ • Cleanup   │    │ • CSV       │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 📋 4. SYSTEM COMPONENTS SUMMARY

### Core Components
1. **Authentication System** - JWT-based user authentication and role management
2. **Project Management** - Complete project lifecycle from creation to completion
3. **RPMES Integration** - Government-standard forms 1-11 with Excel export
4. **Monitoring System** - Real-time progress tracking and validation
5. **Reporting Engine** - Comprehensive reporting and analytics
6. **Activity Logging** - Complete audit trail and security monitoring
7. **File Management** - Document upload, storage, and retrieval
8. **User Management** - Role-based access control and user administration

### Technology Stack
- **Frontend**: Astro framework with TailwindCSS
- **Backend**: Node.js with Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT tokens
- **File Handling**: Multer with local storage
- **Excel Export**: ExcelJS library
- **Security**: Helmet, CORS, Rate limiting

### Key Features
- **Multi-role Dashboard System** - 5 distinct user roles with specific interfaces
- **RPMES Compliance** - Official government form structure and validation
- **Real-time Monitoring** - Live progress updates and activity tracking
- **Excel Export System** - Pixel-perfect government-standard reports
- **Comprehensive Logging** - Complete audit trail for compliance
- **Responsive Design** - Mobile-friendly interface for field work
- **Role-based Security** - Granular permissions and access control

This system analysis provides a complete understanding of the Build Watch LGU system architecture, data flows, and operational processes. 