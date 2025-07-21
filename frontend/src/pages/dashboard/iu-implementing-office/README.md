# LGU-IU: Implementing Office-Officer Dashboard

## Overview
The LGU-IU (Implementing Unit Officer) dashboard serves as the authorized project lead and office-level system administrator for a specific LGU department or office. It allows them to create, manage, and track assigned projects/programs — including physical progress, budget disbursements, and timeline reporting — in compliance with LGU standards and transparency protocols.

## Theme Colors
- **Primary**: #F8C734 (Golden Yellow)
- **Secondary**: #92751F (Dark Gold)
- **Complementary**: Various shades to support clean, modern UI design

## User Role & Purpose
The Implementing Office Officer acts as the main administrator for projects assigned to or proposed by their office, with responsibilities including:
- Creating and maintaining project entries and timelines
- Managing budget usage and submitting updates regularly
- Coordinating directly with assigned EIU Personnel
- Submitting reports for validation by the MPMEC Secretariat
- Serving as the primary point of contact for Secretariat communication

## Core Functionalities

### 🛠 Project & Program Management Panel
- Create/update/delete project records under their department
- Input project name, location, duration, goals, and target outcomes
- Upload proposal documents or briefs

### 📊 Project Progress Monitoring
- Track and update % completion and implementation stage
- Maintain daily activity logs
- Visual indicators (timeline bar or Gantt chart) showing real vs. expected progress

### 💸 Budget Disbursement & Tracking
- Enter financial usage per update or milestone
- Automatically calculate remaining funds and scale % disbursement
- Visuals: bar chart/graph showing budget consumption over time

### 📈 Integrated Progress + Disbursement Summary
A combined timeline module showing:
- Physical progress
- Fund disbursement rate
- Completion estimate based on trend and scaling

### 🔁 EIU Update Feed
- View EIU-submitted updates (read-only)
- Access to EIU's logs, attachments, and documentation
- For internal review before forwarding to LGU-PMT

### 📬 Messaging Module (with MPMEC Secretariat)
- Two-way communication channel for inquiries, reports, and reminders
- Archive of message history and instructions received

### 🛎 Notifications Center
- Alerts for pending reports, deadlines, and updates from Secretariat or EIU

### 🏢 Office Profile Panel
- Editable department info, contact persons, and historical project data
- Used for internal reference across LGU-PMT ecosystem

### 📋 Validation & Submission Tracker
- View report status: validated, pending, or flagged
- Not editable, view-only for awareness and monitoring

## Navigation Structure

### Main Dashboard
- **Dashboard Overview**: Summary statistics and quick actions
- **My Projects & Programs**: Project management interface
- **Progress Timeline**: Visual progress tracking
- **Disbursement Updates**: Budget tracking and updates
- **Summary Module**: Combined progress and budget view
- **EIU Activity Feed**: View EIU submissions and updates
- **Messages**: Communication with MPMEC Secretariat
- **Notifications**: System alerts and reminders
- **My Office Profile**: Department information management

## File Structure
```
iu-implementing-office/
├── ImplementingOfficeDashboard.astro    # Main dashboard page
├── modules/
│   ├── project-management.astro         # Project creation and management
│   ├── progress-timeline.astro          # Progress tracking interface
│   ├── disbursement-tracker.astro       # Budget and disbursement tracking
│   ├── summary-module.astro             # Combined progress and budget view
│   ├── eiu-activity-feed.astro          # EIU submission monitoring
│   ├── message-center.astro             # Secretariat communication
│   ├── notifications.astro              # System notifications
│   └── office-profile.astro             # Department profile management
└── README.md                            # This documentation
```

## Components Used
- **IUImplementingOfficeSidebar.astro**: Navigation sidebar with theme colors
- **IUImplementingOfficeTopbar.astro**: Header with search and notifications
- **IUImplementingOfficeLayout.astro**: Main layout wrapper

## Key Features

### Dashboard Overview
- Quick stats: Active Projects, Total Budget, Average Progress, Pending Reports
- Recent project updates with status indicators
- Quick actions for common tasks
- Project status overview with visual indicators
- Budget utilization tracking
- Upcoming deadlines display

### Project Management
- Create new projects with comprehensive form
- Filter and search existing projects
- Edit project details and status
- Delete projects with confirmation
- View detailed project information
- Update progress and generate reports

### Data Visualization
- Progress bars for project completion
- Budget utilization charts
- Timeline visualizations
- Status indicators with color coding
- Real-time statistics updates

## Technical Implementation

### Frontend Framework
- **Astro**: Main framework for static site generation
- **TailwindCSS**: Utility-first CSS framework for styling
- **JavaScript**: Interactive functionality and data handling

### Responsive Design
- Mobile-first approach
- Responsive grid layouts
- Adaptive navigation
- Touch-friendly interfaces

### Performance
- Optimized images and assets
- Efficient data loading
- Smooth animations and transitions
- Fast page load times

## Security & Access Control
- Role-based access control
- Secure authentication
- Data validation and sanitization
- Audit trail for all actions

## Integration Points
- **Backend API**: RESTful API for data operations
- **Database**: MySQL with Sequelize ORM
- **Email Service**: Gmail SMTP for notifications
- **File Upload**: Document and attachment handling

## Future Enhancements
- Real-time notifications
- Advanced reporting features
- Mobile app integration
- Enhanced data analytics
- Workflow automation
- Integration with external systems

## Support & Maintenance
- Regular updates and bug fixes
- Performance monitoring
- User feedback integration
- Documentation updates
- Training and support materials

---

**Last Updated**: July 2025
**Version**: 1.0.0
**Maintainer**: Build Watch Development Team 