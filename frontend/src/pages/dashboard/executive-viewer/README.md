# Executive Viewer Dashboard

## Overview
The Executive Viewer dashboard provides comprehensive oversight of all LGU projects and programs. This is a read-only interface designed for executive-level users such as the Mayor, designated executive officials, or focal persons to monitor project progress, budget usage, timelines, and performance metrics.

## Purpose
- **Transparency & Accountability**: Full visibility of all approved, ongoing, pending, and completed projects
- **Executive Oversight**: Monitor project and program progress across all departments
- **Informed Decision-Making**: Access to comprehensive reports and analytics
- **No Data Manipulation**: Read-only access ensures data integrity

## User Role
- **Chief Overseer**: Monitors all content and data in the system
- **Project Monitor**: Tracks projects from implementation to completion
- **Risk Detector**: Identifies delays, budget discrepancies, and critical areas
- **Transparency Advocate**: Ensures full visibility for improved coordination

## Functional Capabilities

### ✅ Global Oversight Dashboard
- Centralized dashboard with all project summaries
- Status, budget, phase, and implementer details
- Projects sorted by office, location, funding, or timeline

### ✅ Read-Only Access to Reports
- View all reports (monitoring, financial, logs)
- PDF or Excel export capability for offline briefings

### ✅ Visual Heatmaps & Status Indicators
- View by barangay, office, or funding source
- Color indicators for delays, risk levels, budget variance

### ✅ Advanced Filtering & Search
- Filter by keyword, office, type, timeline, etc.
- Instantly display lists of ongoing, delayed, completed projects

### ✅ Quick Navigation Panels
- Top delayed projects
- High-budget programs
- Near-deadline items
- Recent changes

### ✅ Export & Print Tools
- Dashboard and report export in print-ready format
- PDF download for briefings or transparency

## File Structure
```
executive-viewer/
├── ExecutiveDashboard.astro    # Main dashboard page
├── modules/                    # Individual module pages
│   ├── projects.astro         # All projects viewer
│   ├── heatmap.astro          # Heatmap & maps view
│   ├── reports.astro          # Reports & documents
│   ├── export.astro           # Export & print center
│   ├── search.astro           # Advanced search
│   └── notices.astro          # Executive notices
└── README.md                  # This file
```

## Components
- **ExecutiveLayout.astro**: Main layout wrapper
- **ExecutiveSidebar.astro**: Navigation sidebar with enhanced styling
- **ExecutiveTopbar.astro**: Top navigation bar with status indicators

## Theme
- **Primary Color**: #3D50D7 (Executive Blue)
- **Secondary Color**: #2a3bb8 (Dark Blue)
- **Enhanced Visual Treatment**: Gradient backgrounds and modern styling

## Navigation Structure
1. **Dashboard Overview** - Main executive summary
2. **View All Projects** - Complete project listing
3. **Heatmap & Maps View** - Geographic visualization
4. **Reports & Documents** - Full report archive
5. **Export / Print** - Data export center
6. **Advanced Search** - Filter and search tools
7. **Executive Notices** - Important notifications

## Quick Access Features
- Delayed Projects (Red indicators)
- High Budget Items (Yellow indicators)
- Recent Changes (Green indicators)

## Security & Access
- **Read-Only Access**: No data modification capabilities
- **Executive Level**: Full visibility across all departments
- **Audit Trail**: All access is logged for transparency
- **Session Management**: Secure authentication and session handling

## Integration
- **Backend API**: Connects to project management system
- **Real-time Updates**: Live data synchronization
- **Export Integration**: PDF and Excel export capabilities
- **Notification System**: Real-time alerts for critical events

## Future Enhancements
- Public mode for press briefings
- Mobile-responsive design
- Advanced analytics dashboard
- Custom report builder
- Integration with external systems 