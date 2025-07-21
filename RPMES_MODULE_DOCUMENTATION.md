# RPMES Module Documentation
## Regional Project Monitoring and Evaluation System

### 📋 Overview
The RPMES module provides comprehensive project monitoring and evaluation capabilities for LGU Santa Cruz, supporting all 11 official RPMES forms with role-based access control and Excel export functionality.

### 🏗️ System Architecture

#### Backend (Node.js + Express + Sequelize)
- **Database Model**: Enhanced RPMESForm with versioning and access control
- **API Endpoints**: Complete CRUD operations with validation workflow
- **Excel Export**: ExcelJS integration for official form export
- **Role-based Access**: Middleware for form-specific permissions

#### Frontend (React + Tailwind CSS)
- **Form Components**: Dynamic form generation based on form type
- **Access Control**: Role-based UI rendering and validation
- **Excel Integration**: Client-side file download handling
- **Responsive Design**: Mobile-friendly form interfaces

### 📊 Form Structure & Access Control

#### Input Forms (1-4) - LGU Implementing Office (LGU-IU)
**Editable by**: LGU-IU only  
**Viewable by**: LGU-PMT, LGU-IU, SYS.AD

| Form | Title | Description |
|------|-------|-------------|
| **Form 1** | Project Identification and Basic Information | Basic project details, location, budget, timeline |
| **Form 2** | Project Objectives and Expected Outputs | Objectives, outputs, beneficiaries, success indicators |
| **Form 3** | Project Implementation Details | Strategy, activities, timeline, resources, risks |
| **Form 4** | Project Monitoring and Evaluation | Monitoring mechanisms, evaluation criteria, reporting |

#### Output Forms (5-11) - MPMEC Secretariat (LGU-PMT)
**Editable by**: LGU-PMT only  
**Viewable by**: LGU-IU, EMS, SYS.AD

| Form | Title | Description |
|------|-------|-------------|
| **Form 5** | Project Progress Report | Progress updates, accomplishments, challenges |
| **Form 6** | Project Completion Report | Final outcomes, lessons learned, completion status |
| **Form 7** | Project Impact Assessment | Impact areas, beneficiary feedback, recommendations |
| **Form 8** | Financial Report | Budget utilization, expenditures, financial status |
| **Form 9** | Environmental Compliance Report | Environmental impact, compliance measures |
| **Form 10** | Social Impact Report | Social benefits, community participation |
| **Form 11** | Project Sustainability Report | Sustainability factors, maintenance plans |

### 🔐 Access Control Matrix

| User Role | Input Forms (1-4) | Output Forms (5-11) |
|-----------|-------------------|---------------------|
| **LGU-IU** | ✅ Edit/View | 👁️ View Only |
| **LGU-PMT** | 👁️ View Only | ✅ Edit/View |
| **EMS** | ❌ No Access | 👁️ View Only |
| **SYS.AD** | 👁️ View Only | 👁️ View Only |

### 🚀 Key Features

#### 1. **Dynamic Form Generation**
- Form fields automatically generated based on form type
- Validation rules applied per field type
- Real-time error feedback

#### 2. **Version Control**
- Automatic versioning when forms are updated after submission
- Previous versions preserved for audit trail
- Latest version tracking

#### 3. **Workflow Management**
- Draft → Submitted → Under Review → Approved/Rejected
- Role-based validation workflow
- Feedback and comments system

#### 4. **Excel Export**
- Official form layout preservation
- Project-specific file naming: `RPMES-Form-[project-code]-[year].xlsx`
- Export tracking and analytics

#### 5. **Project Integration**
- Forms automatically linked to projects
- Project-specific form lists
- Cross-form data consistency

### 📱 User Interface

#### Form List View
- **Grid Layout**: Visual cards for each form type
- **Status Indicators**: Color-coded status badges
- **Quick Actions**: View, Edit, Export buttons
- **Filtering**: By category, status, form type

#### Form Editor
- **Dynamic Fields**: Auto-generated based on form type
- **Validation**: Real-time field validation
- **Save Options**: Draft or Submit
- **Version Info**: Current version and history

#### Dashboard Integration
- **Role-based Access**: Forms visible based on user role
- **Quick Access**: Direct links from dashboard
- **Status Overview**: Form completion status

### 🔧 Technical Implementation

#### Database Schema
```sql
CREATE TABLE rpmes_forms (
  id CHAR(36) PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  submitted_by_id CHAR(36) NOT NULL,
  form_type ENUM('RPMES Form 1-11') NOT NULL,
  form_category ENUM('Input', 'Output') NOT NULL,
  version INT DEFAULT 1,
  reporting_year INT NOT NULL,
  form_data JSON NOT NULL,
  status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'),
  editable_by ENUM('LGU-IU', 'LGU-PMT', 'EMS', 'SYS.AD') NOT NULL,
  viewable_by JSON NOT NULL,
  -- Additional fields for versioning, export tracking, etc.
);
```

#### API Endpoints
```
GET    /api/rpmes/project/:projectId     # Get project forms
GET    /api/rpmes/:formId               # Get specific form
POST   /api/rpmes                       # Create new form
PUT    /api/rpmes/:formId               # Update form
POST   /api/rpmes/:formId/validate      # Validate form
GET    /api/rpmes/:formId/export        # Export to Excel
GET    /api/rpmes/stats/project/:id     # Get form statistics
DELETE /api/rpmes/:formId               # Delete draft form
```

#### Frontend Components
- `RPMESFormComponent.jsx`: Main form editor
- `RPMESFormsList.jsx`: Forms list and management
- `rpmesService.js`: API service layer
- Form templates and field configurations

### 📋 Form Field Types

#### Supported Field Types
1. **Text**: Single line text input
2. **Textarea**: Multi-line text input
3. **Number**: Numeric input with validation
4. **Date**: Date picker with validation
5. **Select**: Dropdown selection
6. **Checkbox**: Boolean selection
7. **Radio**: Single choice selection

#### Validation Rules
- **Required Fields**: Marked with asterisk (*)
- **Data Types**: Automatic type validation
- **Custom Rules**: Form-specific validation logic
- **Real-time Feedback**: Immediate error display

### 🎯 Workflow Process

#### Input Forms Workflow (LGU-IU)
1. **Create**: LGU-IU creates Form 1-4
2. **Draft**: Save as draft for editing
3. **Submit**: Submit for validation
4. **Review**: LGU-PMT reviews and provides feedback
5. **Approve/Reject**: Final validation decision

#### Output Forms Workflow (LGU-PMT)
1. **Create**: LGU-PMT creates Form 5-11
2. **Draft**: Save as draft for editing
3. **Submit**: Submit for validation
4. **Review**: EMS reviews and provides feedback
5. **Approve/Reject**: Final validation decision

### 📊 Export Functionality

#### Excel Export Features
- **Official Layout**: Matches original LGU form structure
- **Project Data**: Auto-populated project information
- **Form Data**: All form fields included
- **Metadata**: Submission info, validation status
- **File Naming**: `RPMES-Form-[project-code]-[year].xlsx`

#### Export Process
1. User clicks "Export Excel"
2. Backend generates Excel file using ExcelJS
3. File streamed to client
4. Automatic download with proper filename
5. Export tracking updated in database

### 🔍 Monitoring & Analytics

#### Form Statistics
- **Completion Rate**: Forms completed per project
- **Validation Status**: Approval/rejection rates
- **Export Tracking**: Download frequency
- **User Activity**: Form creation and editing patterns

#### Dashboard Integration
- **Role-based Views**: Statistics filtered by user role
- **Project Overview**: Form status per project
- **Timeline Tracking**: Form submission and validation dates
- **Performance Metrics**: Processing times and efficiency

### 🛡️ Security & Compliance

#### Access Control
- **Role-based Permissions**: Strict form access control
- **Session Validation**: JWT token verification
- **Data Validation**: Server-side form validation
- **Audit Trail**: Complete activity logging

#### Data Protection
- **Encrypted Storage**: Sensitive data encryption
- **Backup Systems**: Regular database backups
- **Version Control**: Complete change history
- **Export Security**: Secure file generation and download

### 🚀 Deployment & Maintenance

#### System Requirements
- **Backend**: Node.js 16+, MySQL 8.0+
- **Frontend**: React 18+, Modern browsers
- **Dependencies**: ExcelJS, Sequelize, JWT

#### Performance Optimization
- **Database Indexing**: Optimized queries for large datasets
- **Caching**: Form template caching
- **Lazy Loading**: Component-level code splitting
- **CDN Integration**: Static asset optimization

#### Monitoring & Support
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Response time tracking
- **User Support**: Role-based help documentation
- **System Health**: Automated health checks

### 📈 Future Enhancements

#### Planned Features
1. **Bulk Export**: Multiple forms in single Excel file
2. **Form Templates**: Customizable form structures
3. **Advanced Analytics**: Detailed reporting dashboards
4. **Mobile App**: Native mobile form access
5. **API Integration**: External system connectivity
6. **Automated Validation**: AI-powered form validation

#### Scalability Considerations
- **Multi-tenant Support**: Multiple LGU deployment
- **Cloud Integration**: AWS/Azure deployment options
- **Microservices**: Service-oriented architecture
- **Real-time Updates**: WebSocket integration

---

## 🎉 Summary

The RPMES module provides a comprehensive, secure, and user-friendly solution for LGU Santa Cruz's project monitoring and evaluation needs. With complete form coverage, role-based access control, and Excel export functionality, it ensures compliance with official LGU requirements while providing an efficient digital workflow for all stakeholders.

**Key Benefits:**
- ✅ Complete RPMES Forms 1-11 coverage
- ✅ Role-based access control and validation
- ✅ Official Excel export functionality
- ✅ Version control and audit trail
- ✅ Mobile-responsive design
- ✅ Real-time validation and feedback
- ✅ Project-specific form management
- ✅ Comprehensive monitoring and analytics

The system is production-ready and fully integrated with the Build Watch LGU platform. 