# MASTER PROMPT FOR GEMINI AI
## Build Watch Conceptual Framework Diagram Generation

---

## PROMPT:

Create a comprehensive conceptual framework diagram for "BUILD WATCH: A Project Monitoring and Evaluation System" similar in style to the VGUIDE touring companion application framework. The reference photo is uploaded. The diagram should be visually appealing, professional, and include all system components, user roles, features, and their interconnections.

### VISUAL STYLE REQUIREMENTS:
- Use a modern, clean design with rounded corners and professional color scheme
- Include icons/symbols for each component (use appropriate emojis or visual indicators)
- Use arrows to show information flow and interactions
- Organize components in a logical, hierarchical layout
- Use color coding for different user roles and system components
- Include text labels for all components
- Make it suitable for academic/professional presentation

### CENTRAL APPLICATION:
**BUILD WATCH: Project Monitoring and Evaluation System**
- Position this at the center of the diagram
- Make it prominent and clearly labeled

### USER ROLES & THEIR FEATURES:

#### 1. SYSTEM ADMIN (Top Center)
**Icon:** ⚙️ Admin Head with Settings
**Color Theme:** Black/Dark Gray
**Features:**
- User Management (Create, Edit, Delete user accounts, Assign roles)
- User Logs Monitoring (View activity logs, Login/logout tracking, Audit trail)
- Departments & User Groups (Manage departments, Organize user groups)
- Announcements (Create system-wide announcements)
- Messaging (Internal messaging system)
- System Health (Performance monitoring, Server status)
- Security (Security settings, Password policies)
- Configuration (System configuration, Feature toggles)
- Backup & Maintenance (Database backup, System maintenance)

#### 2. EIU USERS - External Implementing Unit (Top Left)
**Icon:** 👷 Contractor/Builder with Hard Hat
**Color Theme:** Green
**User Actions:**
- View assigned projects
- Submit milestone/phase updates
- Upload evidence files (photos, videos, documents)
- View project progress and status
- Respond to Messages and Announcement

**App Features for EIU:**
- My Projects (View all assigned projects)
- Submit Update (Timeline, Budget, Physical divisions)
- Evidence Files & Documents (Upload and manage files)
- Project Summary & Report (Generate reports)
- Project Ledger (View transaction history)
- Profile Management (Company and user profile)
- Announcements (Create system-wide announcements)
- Messaging (Internal messaging system)
- System Health (Performance monitoring, Server status)

#### 3. LGU-IU USERS - Internal Implementing Unit (Middle Left)
**Icon:** 🏛️ Government Building
**Color Theme:** Blue (#0D7DB5)
**User Actions:**
- Create and manage projects
- Review and approve EIU submissions
- Monitor project progress
- Monitor reports
- Respond to Messages and Announcement

**App Features for LGU-IU:**
- Project Management (Create, edit, delete projects, Assign to EIU)
- Progress Timeline (Review submissions, Approve/reject milestones)
- Project Ledger (View complete history)
- Office Profile (Department information)
- Project Summary & Report (Generate comprehensive reports)
- Announcements (Create system-wide announcements)
- Messaging (Internal messaging system)
- System Health (Performance monitoring, Server status)

#### 4. MPMEC SECRETARIAT (Middle Right)
**Icon:** 📋 Clipboard with Checkmark
**Color Theme:** Professional Blue 
**User Actions:**
- Viewing of Projects Progress
- Review Approved Phases of Projects
- Viewing of comprehensive reports
- Viewing of all Evidence and Files of Projects

**App Features for Secretariat:**
- Submissions (Monitor all created Projects progress)
- Compilation (Viewing of Approved Phases of Projects)
- Project Ledger (Complete project history)
- Templates (Viewing of Evidences of Projects)
- Project Summary & Report (Generate office-wise reports)
- Announcements (Create system-wide announcements)
- Messaging (Internal messaging system)
- System Health (Performance monitoring, Server status)

#### 5. MPMEC USERS - Policy Committee (Bottom Right)
**Icon:** 👥 Committee Members
**Color Theme:** Dark Blue
**User Actions:**
- View approved projects
- Review progress and timelines
- Viewing of Evidence Files and Summary Reports

**App Features for MPMEC:**
- Approved Projects (View committee-approved projects)
- Progress Timeline (View project progress, Gantt charts)
- Committee Profile (View committee members)
- Project Summary & Report (View policy impact reports)
- Announcements (Create system-wide announcements)
- Messaging (Internal messaging system)
- System Health (Performance monitoring, Server status)

### CORE SYSTEM COMPONENTS:

#### DATABASE (Bottom Center)
**Icon:** 🗄️ Database Server
**Stored Information:**
- Project data (name, code, description, location, budget, timeline)
- Phase information (title, weight, dates, status)
- Phase submissions (timeline, budget, physical divisions)
- User accounts (all roles: Public, System Admin, EIU, LGU-IU, Secretariat, and MPMEC)
- Activity logs and audit trails
- Documents and file attachments
- Messages and communications
- Announcements

#### PROGRESS CALCULATION SYSTEM (Left of Database)
**Icon:** 📊 Chart/Graph
**Features:**
- Overall Progress Calculation (based on Physical Division Output Evidences)
- Budget Division Progress (utilized/allocated weight per Phases)
- Phase-based progress tracking
- Timely progress updates
- Automatic progress calculation on approval

#### FILE MANAGEMENT SYSTEM (Right of Database)
**Icon:** 📁 Folder with Files
**Features:**
- Photo evidence upload and storage
- Video evidence upload and storage
- Document file management
- File categorization and organization
- File download and viewing
- File history tracking

#### COMMUNICATION SYSTEM (Above Database)
**Icon:** 💬 Chat/Messages
**Features:**
- Internal messaging between all user roles
- Announcement system
- Notification system
- Feedback and remarks

#### AUTHENTICATION & AUTHORIZATION (Above Communication)
**Icon:** 🔐 Lock/Shield
**Features:**
- Role-based access control
- Session management
- Password management
- User permissions
- Security audit logging
- Login/Logout tracking

### PUBLIC PAGES (Left Side, Outside Authentication)
**Icon:** 🌐 Globe/Public Access
**Pages:**
- Home Page (Landing page, System introduction)
- About Page (Mission, vision, system architecture)
- Projects Page (Public project directory, Search and filter)
- Project Details (Individual project information)
- News & Articles (Public news and updates)
- Contact Us (Contact form and information)
- Open Data Portal (Public data access, Statistics)
- FAQs (Frequently asked questions)
- Getting Started (User onboarding guide)
- Barangay Pages (Location-specific project information)

### WORKFLOW ARROWS & CONNECTIONS:

1. **Public Pages → Login/Authentication** (Users access login from public pages)
2. **Authentication → Role-Based Dashboards** (After login, users redirected to their role dashboard)
3. **EIU → Submit Updates → Database** (EIU submits phase updates to database)
4. **LGU-IU → Review Submissions → Approve → Database** (LGU-IU reviews and approves EIU submissions)
5. **LGU-IU → Forward to Secretariat → Database** (Approved submissions phases forwarded to Secretariat and calculates the progress)
6. **All Roles → Communication System** (All roles use messaging system)
7. **All Roles → File Management** (All roles upload/download files)
8. **Progress Calculation → All Dashboards** (Progress calculated and displayed on all dashboards and components)
9. **Database → All Components** (Database serves all system components)
10. **System Admin → Manage All Users** (System Admin manages all user accounts)

### LAYOUT SPECIFICATIONS:

- **Center:** BUILD WATCH application (large, prominent)
- **Top Center:** System Admin
- **Top Left:** EIU Users
- **Middle Left:** LGU-IU Users
- **Middle Right:** MPMEC Secretariat
- **Bottom Right:** MPMEC Users
- **Bottom Center:** Database
- **Left Side (Outside):** Public Pages
- **Around Database:** Core System Components (Progress Calculation, File Management, Communication, Authentication)

### TEXT LABELS REQUIRED:

For each component, include:
- Component name
- Key features (3-5 main features listed)
- User actions (what users can do)
- Data flow indicators

### ADDITIONAL REQUIREMENTS:

1. Include arrows showing bidirectional communication where applicable
2. Show data flow from users → database → other users
3. Indicate read-only access for Executive Viewer
4. Show approval workflow: EIU → LGU-IU → Secretariat → MPMEC
5. Include visual separation between authenticated and public areas
6. Make the diagram suitable for academic paper or presentation
7. Ensure all text is readable and professional
8. Use consistent icon style throughout
9. Include a legend if needed for symbols/colors
10. Make it visually balanced and aesthetically pleasing

### FINAL INSTRUCTIONS:

Generate a high-quality, professional conceptual framework diagram that clearly shows:
- The central BUILD WATCH application
- All six user roles with their specific features
- Core system components (Database, Progress Calculation, File Management, Communication, Authentication)
- Public pages and their relationship to the system
- Information flow and interactions between components
- Workflow processes (project creation, submission, approval, validation)
- Visual hierarchy and organization

The diagram should be comprehensive, accurate, and visually appealing, suitable for use in academic documentation, system documentation, or presentations about the Build Watch Project Monitoring and Evaluation System.

---

**END OF PROMPT**

