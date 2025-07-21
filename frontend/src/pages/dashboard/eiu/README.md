# EIU Personnel Dashboard

## Overview
The EIU (External Implementing Unit) Personnel Dashboard provides a secure, dedicated space for external contractors, companies, or partner organizations that were awarded LGU projects/programs. This account enables them to track, update, and submit key progress data on their assigned projects—ensuring transparency, real-time updates, and accountability in collaboration with LGU offices and the LGU-PMT.

## User Role & Purpose
- **Primary Function**: Official handler of projects awarded by the LGU
- **Reporting Responsibility**: Updates system on physical and financial progress based on set reporting schedules
- **Collaboration**: Works directly with LGU-PMT - MPMEC and MPMEC - Secretariat for compliance, clarification, and transparency requirements
- **Communication**: Acts as the primary reporting line from contractor to local government throughout project lifecycle

## Dashboard Features

### Core Functionality
1. **Project Assignment Overview**
   - View all awarded/assigned projects or programs
   - Project details: name, code, location, implementing office, budget, funding source
   - External implementing unit partner information
   - Timeline and status tracking

2. **Progress Reporting Interface**
   - Submit physical updates (% complete, stage, progress)
   - Submit financial reports (expenses, disbursement, liquidation)
   - Attach visuals (site images, delivery proofs, receipts)

3. **Forms and Feedback Handling**
   - Receive clarification forms from LGU-PMT or Secretariat
   - Submit feedback and re-upload documents
   - Track conversation history

4. **Reminders and Timeline Tracker**
   - Auto-alerts for deadlines and report schedules
   - Visual timeline of project milestones
   - Pending request notifications

5. **Document Upload Portal**
   - Upload required documents: reports, images, certifications, proofs
   - Track uploads and download files as needed

6. **Profile & Accreditation Info**
   - Contractor profile with company name, representative, license
   - Project history and credentials

7. **Compliance Tracker**
   - Visual indicators of report completeness
   - Missing files and late submission alerts
   - Aims to avoid delays and penalties

8. **Activity Logs (Read-Only)**
   - Timeline of updates submitted by the EIU
   - Viewable by LGU-PMT MPMEC, Secretariat, LGU-IU, MDC Personnel, and Executive Viewer

## Navigation Structure

### Main Navigation Items
- 🏠 **Dashboard Overview** - Main dashboard with project summary and quick actions
- 📁 **My Projects** - Detailed view of assigned projects
- 📝 **Submit Update** - Progress and financial reporting forms
- 📤 **Upload Documents** - Document upload and management
- 📬 **LGU Feedback** - View and respond to LGU communications
- 📅 **Reminders & Timeline** - Calendar and deadline tracking
- 📊 **Compliance Tracker** - Visual compliance monitoring
- 👤 **My Profile** - Company and user profile management

### Quick Access Panel
- Pending Updates
- LGU Requests
- Recent Submissions

## Technical Implementation

### Color Scheme
- **Primary Theme**: #3C9CEB (Enhanced blue)
- **Secondary**: #2a7bb8 (Darker blue for gradients)
- **Complementary**: Green, purple, orange for status indicators

### File Structure
```
frontend/src/pages/dashboard/eiu/
├── EIUDashboard.astro          # Main dashboard
├── modules/                    # Individual modules
│   ├── projects.astro         # My Projects
│   ├── submit-update.astro    # Progress Update Forms
│   ├── upload-documents.astro # Document Upload
│   ├── lgu-feedback.astro     # LGU Feedback Inbox
│   ├── reminders.astro        # Timeline & Reminders
│   ├── compliance.astro       # Compliance Tracker
│   └── profile.astro          # Company Profile
└── README.md                  # This file
```

### Components
- `EIUSidebar.astro` - Navigation sidebar with EIU-specific menu
- `EIUTopbar.astro` - Header with notifications and user info
- `EIULayout.astro` - Layout wrapper for EIU pages

## Authentication & Security
- **Login**: Email-based authentication
- **Default Password**: LGU_Pass
- **Role**: EIU (External Implementing Unit)
- **Access Control**: Project-specific access based on assignments

## Data Integration Points
- Project assignments from LGU-IU
- Progress updates to LGU-PMT
- Document uploads to central repository
- Feedback communication with LGU offices
- Compliance reporting to Secretariat

## Future Enhancements
- Real-time notifications
- Mobile-responsive design
- Advanced reporting tools
- Integration with external project management systems
- Automated compliance checking
- Multi-language support

## Development Notes
- Built using Astro framework
- TailwindCSS for styling
- Responsive design for all screen sizes
- Modular architecture for easy maintenance
- Placeholder data ready for real data integration 