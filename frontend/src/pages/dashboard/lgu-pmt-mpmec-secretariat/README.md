# LGU-PMT: MPMEC Secretariat Dashboard

## Overview
The MPMEC Secretariat serves as the administrative backbone and central monitoring team of the LGU's Project Monitoring and Evaluation System (PMES). This dashboard provides comprehensive tools for consolidating, validating, scheduling, reporting, and coordinating project data from all implementing offices and external partners.

## 🎨 Design Theme
- **Primary Color**: #FE5353 (Red)
- **Secondary Color**: #EB3C3C (Darker Red)
- **Base Design**: Modern, elevated UI/UX following the LGU-PMT: MPMEC pattern
- **Layout**: Responsive grid system with rounded-2xl cards and shadow-lg

## 🏗️ File Structure
```
lgu-pmt-mpmec-secretariat/
├── SECRETARIATDashboard.astro          # Main dashboard
├── modules/                            # Individual module pages
│   ├── submissions.astro              # Submissions & Tracker
│   ├── compilation.astro              # Compilation Summary
│   ├── validation.astro               # Validate & Tag Reports
│   ├── templates.astro                # Templates & Forms
│   ├── task-assignment.astro          # Create Projects & Schedule Tasks
│   ├── report-drafting.astro          # Draft Reports (QPR / Annual)
│   ├── communication.astro            # MPMEC Communication
│   ├── coordination.astro             # Coordination Calendar
│   ├── escalation.astro               # Escalate to PPMC
│   └── user-assignment.astro          # User Assignment Panel
└── README.md                          # This file
```

## 🎯 Core Functionality

### 1. **Submissions & Tracker**
- Monitor all incoming reports, updates, and files in real-time
- Show per-project graphs: budget usage & timeline
- Overview of pending, submitted, returned, and overdue entries

### 2. **Compilation Summary**
- Consolidated summary of reports per office
- Data aggregation and analysis tools
- Performance metrics and trends

### 3. **Validate & Tag Reports**
- Review and flag inconsistencies (e.g., budget mismatches, delays, missing media)
- Provide feedback to user groups (especially LGU-IU)
- Quality assurance and data validation

### 4. **Templates & Forms**
- Upload/manage standard forms and templates for project reporting
- Assign appropriate templates per office or implementer
- Template version control and updates

### 5. **Create Projects & Schedule Tasks**
- Create and assign projects to LGU-IU and EIU
- Schedule visits, set deadlines, and define scopes of work
- Track monitoring tasks assigned to specific users/teams

### 6. **Draft Reports (QPR / Annual)**
- Auto-generate RPMES Reports:
  - Forms 1-4: Populated from office encoders
  - Forms 5-11: Handled directly by the Secretariat
- Export drafts to PDF/Word for submission to Mayor, MDC, PPMC, and MPMEC

### 7. **MPMEC Communication**
- Exchange summary reports, directives, and feedback
- Maintain full audit trail of communication
- Internal messaging system

### 8. **Coordination Calendar**
- Maintain LGU-wide monitoring calendar
- Track meetings, deadlines, and field inspections
- Schedule management and coordination

### 9. **Escalate to PPMC**
- Escalate unresolved validation issues to PPMC
- Include notes, actions taken, urgency indicators
- Issue tracking and resolution workflow

### 10. **User Assignment Panel**
- Manage access and permissions of encoders and validators
- Assign roles and responsibilities across user groups
- User management and access control

## 🔐 Authentication
- **Login Page**: `/login/lgu-pmt`
- **User Type**: Multi-user (multiple accounts allowed)
- **Role**: LGU-PMT with subRole: SECRETARIAT
- **Default Password**: LGU_Pass

## 🧭 Navigation Structure
1. **Dashboard Overview** - Main dashboard with key metrics
2. **Submissions & Tracker** - Monitor incoming reports
3. **Compilation Summary** - Consolidated reports per office
4. **Validate & Tag Reports** - Review and flag inconsistencies
5. **Templates & Forms** - Manage report templates
6. **Create Projects & Schedule Tasks** - Assign monitoring activities
7. **Draft Reports (QPR / Annual)** - Generate reports
8. **MPMEC Communication** - Exchange updates and feedback
9. **Coordination Calendar** - LGU-wide inspection activities
10. **Escalate to PPMC** - Forward unresolved issues
11. **User Assignment Panel** - Manage permissions and roles
12. **Logout** - Secure logout functionality

## 📊 Key Metrics Dashboard
- **Total Submissions**: Track all incoming reports
- **Pending Validation**: Items awaiting review
- **Active Projects**: Currently monitored projects
- **Issues Escalated**: Problems forwarded to PPMC

## 🎨 UI Components
- **Sidebar**: Elevated design with gradient background
- **Topbar**: Clean header with notifications and user info
- **Cards**: Rounded-2xl with shadow-lg for modern look
- **Buttons**: Consistent styling with hover effects
- **Tables**: Responsive data tables with sorting/filtering
- **Modals**: Form dialogs for data entry and editing

## 🔧 Technical Features
- **Responsive Design**: Works on all screen sizes
- **Authentication**: Role-based access control
- **Real-time Updates**: Live data refresh capabilities
- **Export Functionality**: PDF/Word report generation
- **Data Validation**: Form validation and error handling
- **Search & Filter**: Advanced data filtering options

## 🚀 Future Enhancements
- Real-time notifications
- Advanced analytics dashboard
- Mobile app integration
- API integration with external systems
- Advanced reporting tools
- Workflow automation

## 📝 Notes
- All modules use placeholder data for now
- User accounts will be created via System Admin
- Follows the same design patterns as other dashboards
- Maintains consistency with LGU-PMT branding 