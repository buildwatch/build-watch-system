# LGU-PMT: MPMEC Dashboard

## Overview
The LGU-PMT: MPMEC (Municipal Project Monitoring and Evaluation Committee) dashboard serves as the policy-level oversight entity in Santa Cruz's Project Monitoring and Evaluation System (PMES).

## Theme & Design
- **Primary Color**: #FE5353
- **Design Pattern**: Follows the modern EIU dashboard design with elevated UI/UX
- **Layout**: Responsive design with sidebar navigation and topbar

## User Role & Functionality
The MPMEC account serves as the strategic and policy-making body in project monitoring:

- Reviews data summaries that affect policy and governance
- Issues guidelines and monitoring frameworks to implementing bodies via the MPMEC Secretariat
- Receives summary reports from the Secretariat regarding project status
- Submits policy recommendations or strategic assessments to the Secretariat
- Ensures project compliance with LGU development plans and policies

## Dashboard Modules

### 1. Dashboard Overview (`MPMECDashboard.astro`)
- Summary statistics and key metrics
- Recent project approvals
- Policy updates
- Upcoming meetings
- Quick action buttons

### 2. Approved Projects (`modules/approved-projects.astro`)
- Curated list of committee-approved projects for FY 2025
- Project details including title, office/department, status, budget awarded
- Read-only access to project information

### 3. Progress & Timeline (`modules/progress-timeline.astro`)
- Gantt-style visualizations and budget charts
- Status indicators (Ongoing, Completed, Delayed, Cancelled)
- Read-only access to progress data

### 4. Policy Documents (`modules/policy-documents.astro`)
- Repository of all LGU policies, strategic plans, orders, and memos
- Version history and read-only access
- Related to project monitoring

### 5. Secretariat Reports Inbox (`modules/secretariat-inbox.astro`)
- Alerts from System Admin or Secretariat
- Updates on reporting cycles, policies, and meeting schedules
- Internal notices and system alerts

### 6. Send Feedback to Secretariat (`modules/send-feedback.astro`)
- Two-way communication module
- Receiving summaries from Secretariat
- Sending back reviews, policy notes, or official responses

### 7. Committee Profile (`modules/committee-profile.astro`)
- Displays current committee members, term, and departments
- Optional roles and contact information
- MPMEC structure and member directory

### 8. Policy Dashboard (`modules/policy-dashboard.astro`)
- Graphs showing total approved projects by year
- Distribution by barangay or sector
- Budget utilization per department
- Read-only access

### 9. Events & Schedules (`modules/events-schedules.astro`)
- Calendar view of upcoming LGU evaluation or policy meetings
- Internal reminders (view-only)
- Meeting schedules and notifications

## Authentication
- Uses localStorage with 'authToken' key
- Role-based access control for LGU-PMT users
- Automatic redirect to login if unauthorized

## File Structure
```
lgu-pmt-mpmec/
├── MPMECDashboard.astro          # Main dashboard
├── modules/
│   ├── approved-projects.astro   # Approved projects viewer
│   ├── progress-timeline.astro   # Progress & timeline viewer
│   ├── policy-documents.astro    # Policy documents archive
│   ├── secretariat-inbox.astro   # Secretariat reports inbox
│   ├── send-feedback.astro       # Communication module
│   ├── committee-profile.astro   # MPMEC member profiles
│   ├── policy-dashboard.astro    # Policy impact dashboard
│   └── events-schedules.astro    # Events & schedules viewer
└── README.md                     # This file
```

## Components Used
- `LGUPMTSidebar.astro` - Navigation sidebar with #FE5353 theme
- `LGUPMTTopbar.astro` - Top navigation bar
- `LGUPMTLayout.astro` - Layout wrapper component

## Navigation Items
1. 🏠 Dashboard Overview
2. 📋 Approved Projects (FY 2025)
3. 📈 View Progress & Timeline
4. 📂 Policy Documents
5. 📬 Secretariat Reports Inbox
6. 📤 Send Feedback to Secretariat
7. 👤 Committee Profile
8. 📊 Policy Dashboard
9. 🗓 Events & Schedules
10. 🔐 Logout

## Future Enhancements
- Real-time data integration with backend
- Advanced policy impact analytics
- Interactive timeline visualizations
- Document management system
- Meeting scheduling and notifications
- Policy recommendation engine 