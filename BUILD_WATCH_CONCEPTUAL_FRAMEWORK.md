# BUILD WATCH: Project Monitoring and Evaluation System
## Conceptual Framework Documentation

---

## 1. PUBLIC PAGES (Unauthenticated Access)

### 1.1 Home Page (`/` or `/index.astro`)
**Purpose:** Main landing page showcasing Build Watch system
**Features:**
- Interactive hero section with carousel
- System introduction and branding
- Navigation to all public sections
- "Let's Start" button to access system
- 3D background elements

### 1.2 Home (`/home.astro`)
**Purpose:** Extended home page with detailed information
**Features:**
- Featured projects display
- Project statistics overview
- Recent news and updates
- Interactive project map
- Category browsing
- Search functionality

### 1.3 About Page (`/about.astro`)
**Purpose:** System information and mission
**Features:**
- Mission and vision statements
- System architecture overview
- User role descriptions
- System purpose and goals

### 1.4 Projects Page (`/projects.astro`)
**Purpose:** Public project directory
**Features:**
- Browse all approved projects
- Search and filter projects
- Project cards with basic information
- Category, location, status filters
- Project statistics

### 1.5 Project Details (`/project/[id].astro`)
**Purpose:** Individual project information
**Features:**
- Comprehensive project details
- Progress information
- Timeline visualization
- Budget overview
- Photo gallery
- Location map

### 1.6 News & Articles (`/news.astro`)
**Purpose:** Public news and updates
**Features:**
- News articles display
- Project updates
- System announcements
- Article categories
- Search and filter

### 1.7 Contact Us (`/contact-us.astro`)
**Purpose:** Contact information and form
**Features:**
- Contact form submission
- Office information
- Location details
- Communication channels

### 1.8 Open Data Portal (`/open-data.astro`)
**Purpose:** Public data access
**Features:**
- Data category browsing
- Project statistics
- Infrastructure reports
- Budget information
- Performance metrics
- Download options (Excel, CSV, PDF, JSON)

### 1.9 FAQs (`/faqs.astro`)
**Purpose:** Frequently asked questions
**Features:**
- Common questions and answers
- System usage guides
- User help information

### 1.10 Getting Started (`/getting-started.astro`)
**Purpose:** User onboarding guide
**Features:**
- System introduction
- Getting started instructions
- User guides

### 1.11 Barangay Pages (`/barangay/[barangayName].astro`)
**Purpose:** Location-specific project information
**Features:**
- Projects by barangay
- Local statistics
- Community information

---

## 2. AUTHENTICATION & LOGIN

### 2.1 Login Page (`/login/lgu-pmt.astro`)
**Purpose:** User authentication
**Features:**
- Email/username and password login
- Role-based authentication
- Session management
- Password reset functionality
- Automatic role-based dashboard redirect

**User Roles Supported:**
- System Admin (SYS.AD)
- EIU (External Implementing Unit)
- LGU-IU (Internal Implementing Unit)
- LGU-PMT Secretariat
- LGU-PMT MPMEC
- Executive Viewer

---

## 3. SYSTEM ADMIN DASHBOARD (`/dashboard/sysadmin/SysAdminDashboard.astro`)

### 3.1 Dashboard Overview
**Purpose:** System-wide administration and monitoring
**Features:**
- Total users count
- System health metrics
- Recent activity logs
- Office departments count
- Failed login tracking
- Active users monitoring

### 3.2 Modules

#### 3.2.1 User Management (`modules/user-management.astro`)
**Features:**
- Create, edit, delete user accounts
- Assign roles and permissions
- User status management (active/inactive)
- Bulk user operations
- User profile management
- Role assignment (EIU, LGU-IU, LGU-PMT, SYS.AD)
- Sub-role assignment

#### 3.2.2 User Logs Monitoring (`modules/user-logs.astro`)
**Features:**
- View all user activity logs
- Login/logout tracking
- Failed login attempts
- Action audit trail
- Real-time activity monitoring
- Filter by user, date, action type
- Export logs functionality

#### 3.2.3 Departments & User Groups (`modules/office-groups.astro`)
**Features:**
- Create and manage departments
- Organize users into groups
- Department hierarchy management
- Group permissions assignment
- Office structure management

#### 3.2.4 Announcements (`modules/announcements.astro`)
**Features:**
- Create system-wide announcements
- Target specific user groups
- Announcement scheduling
- Priority announcements
- Read/unread tracking

#### 3.2.5 Messaging (`modules/messaging.astro`)
**Features:**
- Internal messaging system
- Send messages to users/groups
- Message history
- Notification system

#### 3.2.6 My Profile (`modules/my-profile.astro`)
**Features:**
- Admin profile management
- Update personal information
- Change password
- Profile picture upload

#### 3.2.7 System Health (`modules/system-health.astro`)
**Features:**
- System performance metrics
- Server status monitoring
- Database health checks
- API response times
- Error rate tracking
- System uptime monitoring

#### 3.2.8 Security (`modules/security.astro`)
**Features:**
- Security settings configuration
- Password policies
- Session management
- Access control settings
- Security audit logs

#### 3.2.9 Configuration (`modules/configuration.astro`)
**Features:**
- System configuration settings
- Feature toggles
- System parameters
- Environment settings

#### 3.2.10 Backup & Maintenance (`modules/backup-maintenance.astro`)
**Features:**
- Database backup management
- System maintenance tasks
- Data export/import
- System updates
- Maintenance scheduling

---

## 4. EIU DASHBOARD (`/dashboard/eiu/EIUDashboard.astro`)

### 4.1 Dashboard Overview
**Purpose:** External Implementing Unit project management
**Features:**
- Assigned projects overview
- Project statistics (total, ongoing, completed)
- Budget utilization tracking
- Average progress calculation
- Recent project updates
- Quick action buttons

### 4.2 Modules

#### 4.2.1 My Projects (`modules/projects.astro`)
**Features:**
- View all assigned projects
- Project details and information
- Project status tracking
- Filter and search projects
- Project progress monitoring
- Budget information

#### 4.2.2 Submit Update (`modules/submit-update.astro`)
**Features:**
- Submit milestone/phase updates
- Timeline Division submission:
  - Activity date selection
  - Activities & deliverables entry
  - Timeline progress reporting
- Budget Division submission:
  - Used budget amount entry
  - Budget breakdown and allocation
  - Budget utilization tracking
- Physical Division submission:
  - Physical progress description
  - Photo evidence upload
  - Video evidence upload
  - Document files upload
- Submission date tracking
- Form validation
- Evidence file management

#### 4.2.3 Evidence Files & Documents (`modules/project-ledger.astro`)
**Features:**
- View all uploaded documents
- Document categorization
- Download documents
- Document history
- File management

#### 4.2.4 Project Summary & Report (`modules/project-summary-report.astro`)
**Features:**
- Comprehensive project reports
- Progress summaries
- Budget reports
- Timeline reports
- Export reports (PDF, Excel)

#### 4.2.5 Project Ledger (`modules/project-ledger.astro`)
**Features:**
- Complete project transaction history
- All submissions and updates
- Approval status tracking
- Revision history
- Activity timeline

#### 4.2.6 Create Activity (`modules/create-activity.astro`)
**Features:**
- Create new activity entries
- Activity logging
- Activity categorization

#### 4.2.7 Messaging (`modules/messaging.astro`)
**Features:**
- Communication with LGU-IU
- Communication with Secretariat
- Message inbox
- Send messages
- Message history

#### 4.2.8 Announcements (`modules/announcements.astro`)
**Features:**
- View system announcements
- Project-specific announcements
- Read/unread status

#### 4.2.9 Profile (`modules/profile.astro`)
**Features:**
- EIU company profile management
- User profile information
- Contact details
- Company credentials

#### 4.2.10 Templates (`modules/templates.astro`)
**Features:**
- View report templates
- Download templates
- Template guidelines

#### 4.2.11 System Health (`modules/system-health.astro`)
**Features:**
- View system status
- Service availability

---

## 5. LGU-IU DASHBOARD (`/dashboard/iu-implementing-office/ImplementingOfficeDashboard.astro`)

### 5.1 Dashboard Overview
**Purpose:** Internal Implementing Unit project management
**Features:**
- Office projects overview
- Project statistics
- Budget utilization
- Average progress
- Pending approvals count
- Recent activities

### 5.2 Modules

#### 5.2.1 Project Management (`modules/project-management.astro`)
**Features:**
- Create new projects
- Edit project details
- Delete projects
- Project configuration:
  - Project name, code, description
  - Location and coordinates
  - Budget allocation
  - Timeline setup
  - Milestone creation
  - Funding source assignment
- Project status management
- Assign projects to EIU
- Project search and filter

#### 5.2.2 Progress Timeline (`modules/progress-timeline.astro`)
**Features:**
- View project timelines
- Milestone submission review
- Approve/reject milestone submissions
- Timeline visualization
- Progress tracking
- Milestone approval workflow:
  - Review EIU submissions
  - Validate timeline, budget, physical divisions
  - Approve and forward to MPMEC Secretariat
  - Request revisions
  - Add remarks and recommendations

#### 5.2.3 Project Ledger (`modules/project-ledger.astro`)
**Features:**
- Complete project transaction history
- All milestone submissions
- Approval/rejection history
- Activity logs
- Document tracking

#### 5.2.4 Project Summary & Report (`modules/project-summary-report.astro`)
**Features:**
- Comprehensive project reports
- Progress summaries
- Budget utilization reports
- Timeline reports
- Export functionality

#### 5.2.5 EIU Activity Feed (`modules/eiu-activity-feed.astro`)
**Features:**
- View EIU-submitted updates (read-only)
- Monitor EIU activity
- Review EIU submissions
- Activity timeline

#### 5.2.6 Message Center (`modules/message-center.astro`)
**Features:**
- Communication with MPMEC Secretariat
- Two-way messaging
- Message history
- Notifications

#### 5.2.7 Office Profile (`modules/office-profile.astro`)
**Features:**
- Department information management
- Office details
- Contact information
- Historical project data

#### 5.2.8 Announcements (`modules/announcements.astro`)
**Features:**
- View system announcements
- Office-specific announcements

#### 5.2.9 Templates (`modules/templates.astro`)
**Features:**
- View report templates
- Download templates
- Template management

#### 5.2.10 System Health (`modules/system-health.astro`)
**Features:**
- View system status

---

## 6. MPMEC SECRETARIAT DASHBOARD (`/dashboard/lgu-pmt-mpmec-secretariat/SECRETARIATDashboard.astro`)

### 6.1 Dashboard Overview
**Purpose:** Central monitoring and validation hub
**Features:**
- Total submissions count
- Pending approvals
- Active projects
- Budget statistics
- Average progress
- Recent submissions

### 6.2 Modules

#### 6.2.1 Submissions (`modules/submissions.astro`)
**Features:**
- Monitor all incoming milestone submissions
- View submission status (pending, approved, rejected)
- Filter submissions by project, office, status
- Submission details review
- Real-time submission tracking

#### 6.2.2 Compilation (`modules/compilation.astro`)
**Features:**
- Consolidated project summaries
- Office-wise project compilation
- Data aggregation and analysis
- Performance metrics
- Progress trends
- Budget utilization summaries
- Generate comprehensive reports
- Export compilation reports

#### 6.2.3 Communication (`modules/communication.astro`)
**Features:**
- Communication with LGU-IU
- Communication with MPMEC
- Send directives and feedback
- Message history
- Internal messaging system

#### 6.2.4 Project Ledger (`modules/project-ledger.astro`)
**Features:**
- Complete project history
- All submissions and approvals
- Validation history
- Activity logs

#### 6.2.5 Project Summary & Report (`modules/project-summary-report.astro`)
**Features:**
- Comprehensive reports
- Office performance reports
- Budget reports
- Timeline reports
- Export functionality

#### 6.2.6 Profile (`modules/profile.astro`)
**Features:**
- Secretariat profile management
- User information

#### 6.2.7 Templates (`modules/templates.astro`)
**Features:**
- Manage report templates
- Upload/manage standard forms
- Template version control
- Assign templates to offices

#### 6.2.8 System Health (`modules/system-health.astro`)
**Features:**
- View system status

---

## 7. MPMEC DASHBOARD (`/dashboard/lgu-pmt-mpmec/MPMECDashboard.astro`)

### 7.1 Dashboard Overview
**Purpose:** Policy-level oversight and monitoring
**Features:**
- Approved projects overview
- Total projects count
- Budget statistics
- Average progress
- Policy metrics

### 7.2 Modules

#### 7.2.1 Approved Projects (`modules/approved-projects.astro`)
**Features:**
- View all committee-approved projects
- Project details (title, office, status, budget)
- Read-only project information
- Filter by office, category, status

#### 7.2.2 Progress Timeline (`modules/progress-timeline.astro`)
**Features:**
- View project progress and timelines
- Gantt-style visualizations
- Budget charts
- Status indicators (Ongoing, Completed, Delayed)
- Read-only access

#### 7.2.3 Project Ledger (`modules/project-ledger.astro`)
**Features:**
- Complete project history
- Approval history
- Activity logs

#### 7.2.4 Project Summary & Report (`modules/project-summary-report.astro`)
**Features:**
- Comprehensive project reports
- Policy impact reports
- Export functionality

#### 7.2.5 Send Feedback (`modules/send-feedback.astro`)
**Features:**
- Two-way communication with Secretariat
- Send policy reviews and recommendations
- Receive summary reports from Secretariat
- Message history

#### 7.2.6 Committee Profile (`modules/committee-profile.astro`)
**Features:**
- Display committee members
- Member information and roles
- Department assignments
- Contact information
- MPMEC structure

#### 7.2.7 Announcements (`modules/announcements.astro`)
**Features:**
- View system announcements
- Policy updates
- Meeting schedules

#### 7.2.8 Templates (`modules/templates.astro`)
**Features:**
- View policy documents
- Download templates

#### 7.2.9 System Health (`modules/system-health.astro`)
**Features:**
- View system status

---

## 8. EXECUTIVE VIEWER DASHBOARD (`/dashboard/executive-viewer/ExecutiveDashboard.astro`)

### 8.1 Dashboard Overview
**Purpose:** Executive-level oversight (Read-Only)
**Features:**
- All projects overview
- System-wide statistics
- Budget overview
- Progress summaries
- Key metrics dashboard

### 8.2 Modules

#### 8.2.1 Projects (`modules/projects.astro`)
**Features:**
- View all projects (read-only)
- Filter by office, status, category
- Project details viewing
- Search functionality

#### 8.2.2 Reports (`modules/reports.astro`)
**Features:**
- View all reports (read-only)
- Monitoring reports
- Financial reports
- Activity logs
- PDF/Excel export

#### 8.2.3 Heatmap (`modules/heatmap.astro`)
**Features:**
- Geographic visualization
- Projects by barangay
- Projects by office
- Projects by funding source
- Color-coded status indicators
- Interactive map view

#### 8.2.4 Export (`modules/export.astro`)
**Features:**
- Export dashboard data
- PDF generation
- Excel export
- Print-ready formats
- Custom report export

#### 8.2.5 Search (`modules/search.astro`)
**Features:**
- Advanced search functionality
- Filter by keyword, office, type, timeline
- Search across all projects
- Quick navigation

#### 8.2.6 Notices (`modules/notices.astro`)
**Features:**
- Executive notices
- Important notifications
- System alerts

#### 8.2.7 Messaging (`modules/messaging.astro`)
**Features:**
- Internal messaging (read-only)
- View messages

#### 8.2.8 Announcements (`modules/announcements.astro`)
**Features:**
- View system announcements

#### 8.2.9 Profile (`modules/profile.astro`)
**Features:**
- Executive profile management
- User information

#### 8.2.10 Project Ledger (`modules/project-ledger.astro`)
**Features:**
- View complete project history (read-only)
- All transactions and activities

#### 8.2.11 Project Summary & Report (`modules/project-summary-report.astro`)
**Features:**
- View comprehensive reports (read-only)
- Export reports

#### 8.2.12 System Health (`modules/system-health.astro`)
**Features:**
- View system status

---

## 9. CORE SYSTEM COMPONENTS

### 9.1 Database
**Stored Information:**
- Project data (name, code, description, location, budget, timeline)
- Milestone information (title, weight, dates, status)
- Milestone submissions (timeline, budget, physical divisions)
- User accounts (all roles)
- Activity logs and audit trails
- Documents and file attachments
- Messages and communications
- Announcements
- Templates and forms
- System configuration

### 9.2 Progress Calculation System
**Features:**
- Overall Progress Calculation (based on evenly split milestones)
- Budget Division Progress (utilized/allocated per milestone)
- Milestone-based progress tracking
- Real-time progress updates
- Automatic progress recalculation on approval

### 9.3 File Management System
**Features:**
- Photo evidence upload
- Video evidence upload
- Document file management
- File categorization
- File download and viewing
- File history tracking

### 9.4 Communication System
**Features:**
- Internal messaging between roles
- Announcement system
- Notification system
- Feedback and remarks
- Communication history

### 9.5 Authentication & Authorization
**Features:**
- Role-based access control
- Session management
- Password management
- User permissions
- Security audit logging

---

## 10. WORKFLOW SUMMARY

### 10.1 Project Creation Workflow
1. **LGU-IU** creates project in Project Management module
2. Project configured with milestones, budget, timeline
3. Project assigned to **EIU** for implementation

### 10.2 Progress Reporting Workflow
1. **EIU** submits milestone updates via Submit Update module
2. Updates include Timeline, Budget, and Physical divisions
3. **LGU-IU** reviews submissions in Progress Timeline module
4. **LGU-IU** approves/rejects and forwards to **MPMEC Secretariat**
5. **MPMEC Secretariat** validates and compiles in Compilation module
6. **MPMEC** reviews approved projects for policy compliance
7. **Executive Viewer** monitors all projects (read-only)

### 10.3 Approval Workflow
1. EIU submits milestone update
2. LGU-IU reviews and approves (if Physical Division has input)
3. Overall Progress updated (milestone weight added)
4. Budget Division progress calculated separately
5. Submission forwarded to MPMEC Secretariat
6. Secretariat validates and compiles
7. MPMEC reviews for policy alignment

---

## 11. KEY FEATURES BY ROLE

### System Admin
- Full system administration
- User management
- System configuration
- Security management
- Backup and maintenance

### EIU
- View assigned projects
- Submit milestone updates
- Upload evidence files
- View feedback and messages
- Track submission status

### LGU-IU
- Create and manage projects
- Review and approve EIU submissions
- Monitor project progress
- Communicate with Secretariat
- Generate reports

### MPMEC Secretariat
- Monitor all submissions
- Validate and compile reports
- Communicate with LGU-IU and MPMEC
- Manage templates
- Generate comprehensive reports

### MPMEC
- View approved projects
- Review progress and timelines
- Send policy feedback
- View policy documents
- Monitor policy compliance

### Executive Viewer
- View all projects (read-only)
- Access all reports (read-only)
- Geographic heatmap visualization
- Export data and reports
- System-wide oversight

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**System:** Build Watch - Project Monitoring and Evaluation System

