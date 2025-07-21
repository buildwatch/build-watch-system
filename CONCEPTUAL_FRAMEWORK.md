# BUILD WATCH LGU - CONCEPTUAL FRAMEWORK

## 🏗️ 1. SYSTEM ARCHITECTURE FRAMEWORK

### High-Level Architecture
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

### Technology Stack Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   FRONTEND  │  │   BACKEND   │  │   DATABASE  │  │   SERVICES  │
│             │  │             │  │             │  │             │
│ • Astro     │  │ • Node.js   │  │ • MySQL     │  │ • JWT Auth  │
│ • Tailwind  │  │ • Express   │  │ • Sequelize │  │ • ExcelJS   │
│ • JavaScript│  │ • Multer    │  │ • Migrations│  │ • Email     │
│ • Responsive│  │ • Helmet    │  │ • Seeders   │  │ • Backup    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

## 👥 2. USER ROLE FRAMEWORK

### Role Hierarchy
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

### Permission Matrix
```
┌─────────────────────────────────────────────────────────────────┐
│                        PERMISSION MATRIX                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
│   Feature   ││   LGU-PMT   ││     EIU     ││   LGU-IU    ││     EMS     ││   SYS.AD    │
├─────────────┤├─────────────┤├─────────────┤├─────────────┤├─────────────┤
│ RPMES 1-4   ││    View     ││    Edit     ││    Edit     ││    View     ││    View     │
│ RPMES 5-11  ││    Edit     ││    View     ││    View     ││    View     ││    View     │
│ Projects    ││    View     ││    Edit     ││    Edit     ││    View     ││    Edit     │
│ Users       ││    None     ││    None     ││    None     ││    None     ││    Edit     │
│ Reports     ││    Export   ││    Export   ││    Export   ││    Export   ││    Export   │
│ Monitoring  ││    Full     ││    Submit   ││    Submit   ││    Monitor  ││    Full     │
│ System      ││    None     ││    None     ││    None     ││    None     ││    Full     │
└─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘
```

## 🗄️ 3. DATA MODEL FRAMEWORK

### Core Entity Relationships
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

### Database Schema Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   USERS     │    │  DEPARTMENTS│    │    GROUPS   │
│             │    │             │    │             │
│ • id (UUID) │    │ • id        │    │ • id        │
│ • name      │    │ • name      │    │ • name      │
│ • username  │    │ • code      │    │ • code      │
│ • email     │    │ • type      │    │ • type      │
│ • role      │    │ • status    │    │ • status    │
│ • status    │    │ • createdAt │    │ • createdAt │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  PROJECTS   │    │ MILESTONES  │    │    UPDATES  │
│             │    │             │    │             │
│ • id (UUID) │    │ • id        │    │ • id        │
│ • code      │    │ • projectId │    │ • projectId │
│ • name      │    │ • name      │    │ • milestoneId│
│ • category  │    │ • weight    │    │ • progress  │
│ • budget    │    │ • startDate │    │ • budget    │
│ • status    │    │ • endDate   │    │ • status    │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔄 4. PROCESS FRAMEWORK

### Project Lifecycle Process
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

### RPMES Compliance Process
```
┌─────────────────────────────────────────────────────────────────┐
│                        RPMES COMPLIANCE                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   INPUT     │───►│   PROCESSING│───►│   VALIDATION│───►│   OUTPUT    │
│   FORMS     │    │             │    │             │    │   FORMS     │
│             │    │             │    │             │    │             │
│ • Form 1    │    │ • Data      │    │ • LGU-PMT   │    │ • Form 5    │
│ • Form 2    │    │ • Aggregation│   │ • Review    │    │ • Form 6    │
│ • Form 3    │    │ • Analysis  │    │ • Approval  │    │ • Form 7    │
│ • Form 4    │    │ • Reporting │    │ • Compliance│    │ • Form 8-11 │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   EIU/LGU-IU│    │   SYSTEM    │    │   SECRETARIAT│   │   EXECUTIVE │
│   SUBMISSION│    │   PROCESSING│    │   REVIEW     │   │   REPORTING │
│             │    │             │    │             │    │             │
│ • Data Entry│    │ • Validation│    │ • Compliance│    │ • Analytics │
│ • Validation│    │ • Storage   │    │ • Approval  │    │ • Export    │
│ • Submission│    │ • Logging   │    │ • Feedback  │    │ • Archive   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🔐 5. SECURITY FRAMEWORK

### Security Model
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

### Access Control Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        ACCESS CONTROL                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   USER      │───►│   ROLE      │───►│   PERMISSION│
│   AUTH      │    │   VALIDATION│    │   CHECK     │
│             │    │             │    │             │
│ • Login     │    │ • Role      │    │ • Feature   │
│ • Token     │    │ • SubRole   │    │ • Action    │
│ • Session   │    │ • Status    │    │ • Resource  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   GRANT     │    │   DENY      │    │   LOG       │
│   ACCESS    │    │   ACCESS    │    │   ACTIVITY  │
│             │    │             │    │             │
│ • Dashboard │    │ • Error     │    │ • User      │
│ • Features  │    │ • Redirect  │    │ • Action    │
│ • Resources │    │ • Message   │    │ • Timestamp │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔗 6. INTEGRATION FRAMEWORK

### System Integration
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

### API Integration Framework
```
┌─────────────────────────────────────────────────────────────────┐
│                        API INTEGRATION                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CLIENT    │    │   API       │    │   DATABASE  │
│   REQUEST   │───►│   GATEWAY   │───►│   LAYER     │
│             │    │             │    │             │
│ • HTTP      │    │ • Routes    │    │ • Models    │
│ • Headers   │    │ • Middleware│    │ • Queries   │
│ • Body      │    │ • Validation│    │ • Relations │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   RESPONSE  │◄───│   PROCESSING│◄───│   DATA      │
│   HANDLING  │    │   LOGIC     │    │   RETRIEVAL │
│             │    │             │    │             │
│ • JSON      │    │ • Business  │    │ • Results   │
│ • Status    │    │ • Rules     │    │ • Format    │
│ • Headers   │    │ • Logic     │    │ • Return    │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 📊 7. REPORTING FRAMEWORK

### Reporting Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                        REPORTING                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   DATA      │───►│   PROCESSING│───►│   FORMATTING│───►│   DELIVERY  │
│   COLLECTION│    │             │    │             │    │             │
│             │    │             │    │             │    │             │
│ • Projects  │    │ • Aggregation│   │ • RPMES     │    │ • Excel     │
│ • Progress  │    │ • Analysis  │    │ • Templates │    │ • PDF       │
│ • Milestones│    │ • Validation│    │ • Charts    │    │ • Email     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   STORAGE   │    │   VALIDATION│    │   TEMPLATES │    │   NOTIFICATION│
│             │    │             │    │             │    │             │
│ • Database  │    │ • Business  │    │ • Government│    │ • Users     │
│ • Files     │    │ • Rules     │    │ • Standards │    │ • Alerts    │
│ • Logs      │    │ • Compliance│    │ • Custom    │    │ • Reminders │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🎯 8. BUSINESS RULES FRAMEWORK

### Core Business Rules
```
┌─────────────────────────────────────────────────────────────────┐
│                        BUSINESS RULES                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   USER      │    │   PROJECT   │    │   RPMES     │
│   RULES     │    │   RULES     │    │   RULES     │
│             │    │             │    │             │
│ • Role-based│    │ • One form  │    │ • Forms 1-4 │
│ • Permissions│   │   per type  │    │   for EIU   │
│ • Status    │    │ • Approval  │    │ • Forms 5-11│
│ • Validation│    │   workflow  │    │   for LGU   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MONITORING│    │   REPORTING │    │   COMPLIANCE│
│   RULES     │    │   RULES     │    │   RULES     │
│             │    │             │    │             │
│ • Progress  │    │ • Export    │    │ • Validation│
│ • Validation│    │   format    │    │ • Approval  │
│ • Feedback  │    │ • Schedule  │    │ • Tracking  │
└─────────────┘    └─────────────┘    └─────────────┘
```

This conceptual framework provides a comprehensive understanding of the Build Watch LGU system's architecture, processes, and relationships, serving as a foundation for system development, maintenance, and enhancement. 