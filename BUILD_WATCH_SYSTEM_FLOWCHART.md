# Build Watch Web System - User Flow Diagram

## System Architecture Flowchart

```mermaid
flowchart TD
    Start([🌐 Public Access]) --> PublicPages{Public Pages}
    
    PublicPages --> Home[🏠 Home Page<br/>index.astro]
    PublicPages --> About[📖 About Page<br/>about.astro]
    PublicPages --> Contact[📧 Contact Us<br/>contact-us.astro]
    PublicPages --> OpenData[📊 Open Data Portal<br/>open-data.astro]
    PublicPages --> Projects[📋 Public Projects<br/>projects.astro]
    PublicPages --> News[📰 News & Updates<br/>news.astro]
    PublicPages --> FAQs[❓ FAQs<br/>faqs.astro]
    PublicPages --> Barangay[🏘️ Barangay Pages<br/>barangay/]
    PublicPages --> ProjectDetail[📄 Project Details<br/>project/[id].astro]
    
    Home --> LoginPage[🔐 Login Page<br/>/login/lgu-pmt]
    About --> LoginPage
    Contact --> LoginPage
    OpenData --> LoginPage
    Projects --> LoginPage
    News --> LoginPage
    FAQs --> LoginPage
    Barangay --> LoginPage
    ProjectDetail --> LoginPage
    
    LoginPage --> Auth{Authentication<br/>Username & Password}
    
    Auth -->|Invalid Credentials| LoginPage
    Auth -->|Valid Credentials| RoleCheck{User Role Check}
    
    RoleCheck -->|Role: SYS.AD<br/>subRole: EXECUTIVE| ExecutiveDashboard[👔 Executive Viewer Dashboard<br/>/dashboard/executive-viewer/ExecutiveDashboard]
    RoleCheck -->|Role: SYS.AD<br/>subRole: Other| SysAdminDashboard[⚙️ System Admin Dashboard<br/>/dashboard/sysadmin/SysAdminDashboard]
    RoleCheck -->|Role: EIU| EIUDashboard[🔵 EIU Dashboard<br/>/dashboard/eiu/EIUDashboard]
    RoleCheck -->|Role: LGU-IU| LGUIUDashboard[🟡 LGU-IU Dashboard<br/>/dashboard/iu-implementing-office/ImplementingOfficeDashboard]
    RoleCheck -->|Role: LGU-PMT<br/>subRole: SECRETARIAT| SecretariatDashboard[🔴 MPMEC Secretariat Dashboard<br/>/dashboard/lgu-pmt-mpmec-secretariat/SECRETARIATDashboard]
    RoleCheck -->|Role: LGU-PMT<br/>subRole: MPMEC| MPMECDashboard[🔴 MPMEC Dashboard<br/>/dashboard/lgu-pmt-mpmec/MPMECDashboard]
    
    %% System Admin Dashboard Modules
    SysAdminDashboard --> SysAdminModules{System Admin Modules}
    SysAdminModules --> SysAdminUserMgmt[👥 User Management<br/>modules/user-management]
    SysAdminModules --> SysAdminUserLogs[📋 User Logs / Audit Trail<br/>modules/user-logs]
    SysAdminModules --> SysAdminOfficeGroups[🏢 Departments & User Groups<br/>modules/office-groups]
    SysAdminModules --> SysAdminAnnouncements[📢 Announcements<br/>modules/announcements]
    SysAdminModules --> SysAdminMessaging[💬 Messaging<br/>modules/messaging]
    SysAdminModules --> SysAdminProfile[👤 My Profile<br/>modules/my-profile]
    SysAdminModules --> SysAdminSystemHealth[💚 System Health<br/>modules/system-health]
    SysAdminModules --> SysAdminSecurity[🔒 Security<br/>modules/security]
    SysAdminModules --> SysAdminConfig[⚙️ Configuration<br/>modules/configuration]
    SysAdminModules --> SysAdminBackup[💾 Backup & Maintenance<br/>modules/backup-maintenance]
    
    %% Executive Viewer Dashboard Modules
    ExecutiveDashboard --> ExecutiveModules{Executive Viewer Modules}
    ExecutiveModules --> ExecutiveProjects[📊 Projects<br/>modules/projects]
    ExecutiveModules --> ExecutiveReports[📈 Reports<br/>modules/reports]
    ExecutiveModules --> ExecutiveHeatmap[🗺️ Heatmap<br/>modules/heatmap]
    ExecutiveModules --> ExecutiveExport[📥 Export<br/>modules/export]
    ExecutiveModules --> ExecutiveSearch[🔍 Search<br/>modules/search]
    ExecutiveModules --> ExecutiveNotices[📢 Notices<br/>modules/notices]
    ExecutiveModules --> ExecutiveMessaging[💬 Messaging<br/>modules/messaging]
    ExecutiveModules --> ExecutiveAnnouncements[📢 Announcements<br/>modules/announcements]
    ExecutiveModules --> ExecutiveProfile[👤 Profile<br/>modules/profile]
    ExecutiveModules --> ExecutiveSystemHealth[💚 System Health<br/>modules/system-health]
    
    %% EIU Dashboard Modules
    EIUDashboard --> EIUModules{EIU Modules}
    EIUModules --> EIUProjects[📁 My Projects<br/>modules/projects]
    EIUModules --> EIUSubmitUpdate[📝 Submit Update<br/>modules/submit-update]
    EIUModules --> EIUUploadDocs[📤 Upload Documents<br/>modules/upload-documents]
    EIUModules --> EIULGUFeedback[📬 LGU Feedback<br/>modules/lgu-feedback]
    EIUModules --> EIUReminders[📅 Reminders & Timeline<br/>modules/reminders]
    EIUModules --> EIUCompliance[✅ Compliance Tracker<br/>modules/compliance]
    EIUModules --> EIUProfile[👤 My Profile<br/>modules/profile]
    EIUModules --> EIUAnnouncements[📢 Announcements<br/>modules/announcements]
    EIUModules --> EIUCreateActivity[➕ Create Activity<br/>modules/create-activity]
    EIUModules --> EIUMessaging[💬 Messaging<br/>modules/messaging]
    EIUModules --> EIUSystemHealth[💚 System Health<br/>modules/system-health]
    
    %% LGU-IU Dashboard Modules
    LGUIUDashboard --> LGUIUModules{LGU-IU Modules}
    LGUIUModules --> LGUIUProjectMgmt[📋 My Projects & Programs<br/>modules/project-management]
    LGUIUModules --> LGUIUProgressTimeline[📊 Progress Timeline<br/>modules/progress-timeline]
    LGUIUModules --> LGUIUDisbursement[💰 Disbursement Updates<br/>modules/disbursement-tracker]
    LGUIUModules --> LGUIUSummary[📈 Summary Module<br/>modules/summary-module]
    LGUIUModules --> LGUIUEIUFeed[🔄 EIU Update Feed<br/>modules/eiu-activity-feed]
    LGUIUModules --> LGUIUMessages[📬 Messages<br/>modules/message-center]
    LGUIUModules --> LGUIUNotifications[🔔 Notifications<br/>modules/notifications]
    LGUIUModules --> LGUIUOfficeProfile[🏢 My Office Profile<br/>modules/office-profile]
    LGUIUModules --> LGUIUAnnouncements[📢 Announcements<br/>modules/announcements]
    LGUIUModules --> LGUIUSystemHealth[💚 System Health<br/>modules/system-health]
    
    %% MPMEC Secretariat Dashboard Modules
    SecretariatDashboard --> SecretariatModules{MPMEC Secretariat Modules}
    SecretariatModules --> SecretariatSubmissions[📥 Submissions & Tracker<br/>modules/submissions]
    SecretariatModules --> SecretariatCompilation[📊 Compilation Summary<br/>modules/compilation]
    SecretariatModules --> SecretariatValidation[✅ Validate & Tag Reports<br/>modules/validation]
    SecretariatModules --> SecretariatTemplates[📄 Templates & Forms<br/>modules/templates]
    SecretariatModules --> SecretariatTaskAssignment[📋 Create Projects & Schedule Tasks<br/>modules/task-assignment]
    SecretariatModules --> SecretariatReportDrafting[📝 Draft Reports QPR/Annual<br/>modules/report-drafting]
    SecretariatModules --> SecretariatCommunication[💬 MPMEC Communication<br/>modules/communication]
    SecretariatModules --> SecretariatCoordination[📅 Coordination Calendar<br/>modules/coordination]
    SecretariatModules --> SecretariatEscalation[⬆️ Escalate to PPMC<br/>modules/escalation]
    SecretariatModules --> SecretariatUserAssignment[👥 User Assignment Panel<br/>modules/user-assignment]
    SecretariatModules --> SecretariatAnnouncements[📢 Announcements<br/>modules/announcements]
    SecretariatModules --> SecretariatProfile[👤 Profile<br/>modules/profile]
    SecretariatModules --> SecretariatSystemHealth[💚 System Health<br/>modules/system-health]
    
    %% MPMEC Dashboard Modules
    MPMECDashboard --> MPMECModules{MPMEC Modules}
    MPMECModules --> MPMECApprovedProjects[📋 Approved Projects FY 2025<br/>modules/approved-projects]
    MPMECModules --> MPMECProgressTimeline[📊 Progress & Timeline<br/>modules/progress-timeline]
    MPMECModules --> MPMECPolicyDocs[📚 Policy Documents<br/>modules/policy-documents]
    MPMECModules --> MPMECSecretariatInbox[📬 Secretariat Reports Inbox<br/>modules/secretariat-inbox]
    MPMECModules --> MPMECSendFeedback[💬 Send Feedback to Secretariat<br/>modules/send-feedback]
    MPMECModules --> MPMECCommitteeProfile[👥 Committee Profile<br/>modules/committee-profile]
    MPMECModules --> MPMECPolicyDashboard[📈 Policy Dashboard<br/>modules/policy-dashboard]
    MPMECModules --> MPMECEventsSchedules[📅 Events & Schedules<br/>modules/events-schedules]
    MPMECModules --> MPMECAnnouncements[📢 Announcements<br/>modules/announcements]
    MPMECModules --> MPMECSystemHealth[💚 System Health<br/>modules/system-health]
    
    %% Logout Flow
    SysAdminDashboard --> Logout[🚪 Logout]
    ExecutiveDashboard --> Logout
    EIUDashboard --> Logout
    LGUIUDashboard --> Logout
    SecretariatDashboard --> Logout
    MPMECDashboard --> Logout
    
    Logout --> PublicPages
    
    %% Styling
    classDef publicPage fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef loginPage fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    classDef dashboard fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000
    classDef module fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#000
    
    class Home,About,Contact,OpenData,Projects,News,FAQs,Barangay,ProjectDetail publicPage
    class LoginPage loginPage
    class SysAdminDashboard,EIUDashboard,LGUIUDashboard,SecretariatDashboard,MPMECDashboard,ExecutiveDashboard dashboard
    class SysAdminUserMgmt,SysAdminUserLogs,SysAdminOfficeGroups,EIUProjects,EIUSubmitUpdate,LGUIUProjectMgmt,SecretariatSubmissions,MPMECApprovedProjects module
```

## User Role Summary

### 🔵 **EIU (External Implementing Unit)**
- **Role**: External contractors and partners
- **Primary Functions**: Project implementation, progress reporting, document submission
- **Theme Color**: Blue (#3C9CEB)
- **Key Modules**: Projects, Submit Updates, Upload Documents, LGU Feedback, Compliance Tracker

### 🟡 **LGU-IU (LGU Implementing Unit)**
- **Role**: Internal LGU departments and offices
- **Primary Functions**: Internal project management, resource coordination, progress tracking
- **Theme Color**: Yellow/Orange
- **Key Modules**: Project Management, Progress Timeline, Disbursement Tracker, EIU Activity Feed

### 🔴 **MPMEC Secretariat (LGU-PMT: Secretariat)**
- **Role**: Administrative backbone and central monitoring team
- **Primary Functions**: Data consolidation, validation, report drafting, coordination
- **Theme Color**: Red (#FE5353)
- **Key Modules**: Submissions Tracker, Compilation Summary, Validation, Templates, Report Drafting

### 🔴 **MPMEC (LGU-PMT: MPMEC)**
- **Role**: Policy-level oversight committee
- **Primary Functions**: Policy review, strategic assessment, approval oversight
- **Theme Color**: Red (#FE5353)
- **Key Modules**: Approved Projects, Policy Documents, Secretariat Inbox, Policy Dashboard

### ⚙️ **System Admin (SYS.AD)**
- **Role**: System administrators
- **Primary Functions**: User management, system configuration, security, audit trails
- **Theme Color**: Black/Dark Gray
- **Key Modules**: User Management, User Logs, Office Groups, Security, Configuration

### 👔 **Executive Viewer (SYS.AD: EXECUTIVE)**
- **Role**: Executive-level viewers
- **Primary Functions**: High-level project overview, reports, analytics
- **Theme Color**: Executive/Professional
- **Key Modules**: Projects, Reports, Heatmap, Export, Search

## Authentication Flow

1. **Public Access**: Users can browse public pages without authentication
2. **Login**: All users authenticate through `/login/lgu-pmt`
3. **Role-Based Routing**: After successful login, users are redirected based on:
   - **Role** (SYS.AD, EIU, LGU-IU, LGU-PMT)
   - **SubRole** (EXECUTIVE, MPMEC, SECRETARIAT)
4. **Session Management**: JWT tokens stored in localStorage and cookies
5. **Access Control**: Each dashboard validates user role before allowing access

## Module Access Patterns

### Common Modules Across Dashboards
- **Announcements**: System-wide announcements and updates
- **System Health**: System status and performance metrics
- **Profile/My Profile**: User account management
- **Messaging**: Internal communication system

### Role-Specific Modules
Each role has specialized modules tailored to their responsibilities:
- **EIU**: Focus on project updates and compliance
- **LGU-IU**: Focus on internal project management
- **Secretariat**: Focus on validation and coordination
- **MPMEC**: Focus on policy and oversight
- **System Admin**: Focus on system management
- **Executive**: Focus on high-level analytics

## Navigation Structure

All dashboards follow a consistent navigation pattern:
1. **Sidebar Navigation**: Role-specific menu items
2. **Top Bar**: User info, notifications, quick actions
3. **Main Content Area**: Dashboard widgets and module content
4. **Footer**: System information and support links

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Strict permission system
- **Session Validation**: Automatic token verification on page load
- **Invalid Session Redirect**: Unauthorized access redirects to login
- **Activity Logging**: All user actions are logged for audit trails

