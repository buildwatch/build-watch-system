# Build Watch LGU - API Documentation

## Overview
Build Watch is a government project monitoring system for LGU Santa Cruz. This API provides endpoints for project management, RPMES compliance, monitoring, reporting, and user management.

**Base URL:** `http://localhost:5000/api`

## Authentication
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## User Roles
- **LGU-PMT**: Project Monitoring Team (Chair, Vice Chair, Secretariat)
- **EIU**: External Implementing Units (EPIU Manager, EPIU Staff)
- **LGU-IU**: Internal Units (MDC Chair, Oversight Officer, Implementing Staff)
- **EMS**: External Monitoring (NGO, CSO, PPMC Representatives)
- **SYS.AD**: System Administrators

---

## Authentication Endpoints

### POST /auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-string",
  "user": {
    "id": "string",
    "name": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "subRole": "string",
    "status": "string"
  }
}
```

### POST /auth/logout
Logout and invalidate token.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/verify
Verify current token validity.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "name": "string",
    "role": "string"
  }
}
```

### GET /auth/profile
Get current user profile.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "name": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "subRole": "string",
    "status": "string",
    "createdAt": "date"
  }
}
```

---

## User Management Endpoints (SYS.AD only)

### GET /users
Get all users with pagination and filters.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `role`: Filter by role
- `status`: Filter by status
- `search`: Search by name or username

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "string",
      "name": "string",
      "username": "string",
      "email": "string",
      "role": "string",
      "subRole": "string",
      "status": "string",
      "createdAt": "date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### GET /users/role/:role
Get users by specific role.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "string",
      "name": "string",
      "role": "string",
      "subRole": "string"
    }
  ]
}
```

### POST /users
Create new user account.

**Request Body:**
```json
{
  "name": "string",
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "string",
  "subRole": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "string",
    "name": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "subRole": "string"
  }
}
```

### PATCH /users/:id/status
Update user status.

**Request Body:**
```json
{
  "status": "active|blocked|deactivated"
}
```

### PATCH /users/:id/role
Assign role to user.

**Request Body:**
```json
{
  "role": "string",
  "subRole": "string"
}
```

### DELETE /users/:id
Delete user account.

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### GET /users/logs
Get user activity logs.

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "string",
      "userId": "string",
      "action": "string",
      "details": "string",
      "timestamp": "date"
    }
  ]
}
```

---

## Project Management Endpoints

### GET /projects
Get all projects with filters.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `category`: Filter by category
- `implementingUnit`: Filter by implementing unit
- `priority`: Filter by priority

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "location": "string",
      "budget": "number",
      "startDate": "date",
      "targetDate": "date",
      "implementingUnit": "string",
      "category": "string",
      "priority": "string",
      "status": "string",
      "progress": "number",
      "costSpent": "number"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### GET /projects/:id
Get project by ID.

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "string",
    "name": "string",
    "description": "string",
    "location": "string",
    "budget": "number",
    "startDate": "date",
    "targetDate": "date",
    "implementingUnit": "string",
    "category": "string",
    "priority": "string",
    "status": "string",
    "progress": "number",
    "costSpent": "number",
    "updates": [
      {
        "id": "string",
        "progress": "number",
        "costSpent": "number",
        "remarks": "string",
        "submittedBy": "string",
        "submittedAt": "date",
        "status": "string"
      }
    ]
  }
}
```

### POST /projects
Create new project.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "location": "string",
  "budget": "number",
  "startDate": "date",
  "targetDate": "date",
  "implementingUnit": "string",
  "category": "string",
  "priority": "string"
}
```

### PUT /projects/:id
Update project details.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "location": "string",
  "budget": "number",
  "startDate": "date",
  "targetDate": "date",
  "implementingUnit": "string",
  "category": "string",
  "priority": "string"
}
```

### POST /projects/:id/updates
Submit progress update.

**Request Body:**
```json
{
  "progress": "number",
  "costSpent": "number",
  "remarks": "string",
  "attachments": ["file-ids"]
}
```

### PATCH /projects/updates/:id/validate
Validate project update (LGU-PMT only).

**Request Body:**
```json
{
  "status": "approved|rejected|pending",
  "feedback": "string"
}
```

### POST /projects/:id/issues
Report project issue.

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "severity": "low|medium|high|critical",
  "category": "string"
}
```

### GET /projects/unit/:unit
Get projects by implementing unit.

### GET /projects/stats/overview
Get project statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": "number",
    "ongoing": "number",
    "completed": "number",
    "delayed": "number",
    "totalBudget": "number",
    "totalSpent": "number",
    "byCategory": {},
    "byStatus": {},
    "byPriority": {}
  }
}
```

---

## RPMES Form Endpoints

### GET /rpmes
Get all RPMES forms.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `formType`: Filter by form type
- `status`: Filter by status
- `projectId`: Filter by project

**Response:**
```json
{
  "success": true,
  "forms": [
    {
      "id": "string",
      "formType": "string",
      "projectId": "string",
      "projectName": "string",
      "submittedBy": "string",
      "status": "string",
      "submittedAt": "date",
      "validatedAt": "date"
    }
  ]
}
```

### GET /rpmes/:id
Get RPMES form by ID.

**Response:**
```json
{
  "success": true,
  "form": {
    "id": "string",
    "formType": "string",
    "projectId": "string",
    "projectName": "string",
    "content": "object",
    "submittedBy": "string",
    "status": "string",
    "submittedAt": "date",
    "validatedAt": "date",
    "feedback": "string"
  }
}
```

### POST /rpmes
Submit RPMES form.

**Request Body:**
```json
{
  "formType": "string",
  "projectId": "string",
  "content": "object"
}
```

### PUT /rpmes/:id
Update RPMES form.

**Request Body:**
```json
{
  "content": "object"
}
```

### PATCH /rpmes/:id/validate
Validate RPMES form (LGU-PMT only).

**Request Body:**
```json
{
  "status": "approved|rejected|pending",
  "feedback": "string"
}
```

### GET /rpmes/project/:projectId
Get RPMES forms by project.

### GET /rpmes/unit/:unit
Get RPMES forms by implementing unit.

### GET /rpmes/stats/overview
Get RPMES statistics.

### GET /rpmes/templates/:formType
Get RPMES form template.

---

## Monitoring Endpoints

### GET /monitoring
Get all monitoring activities.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `monitoringType`: Filter by type
- `projectId`: Filter by project

**Response:**
```json
{
  "success": true,
  "activities": [
    {
      "id": "string",
      "projectId": "string",
      "projectName": "string",
      "monitoringType": "string",
      "monitoringDate": "date",
      "findings": "string",
      "recommendations": "string",
      "conductedBy": "string"
    }
  ]
}
```

### GET /monitoring/:id
Get monitoring activity by ID.

### POST /monitoring
Submit monitoring report.

**Request Body:**
```json
{
  "projectId": "string",
  "monitoringType": "string",
  "monitoringDate": "date",
  "findings": "string",
  "recommendations": "string",
  "attachments": ["file-ids"]
}
```

### PUT /monitoring/:id
Update monitoring report.

### PATCH /monitoring/validate/:updateId
Validate project update (LGU-PMT only).

**Request Body:**
```json
{
  "status": "approved|rejected|pending",
  "feedback": "string"
}
```

### POST /monitoring/:projectId/feedback
Provide feedback on project.

**Request Body:**
```json
{
  "feedback": "string",
  "type": "positive|negative|suggestion"
}
```

### POST /monitoring/site-visits
Schedule site visit.

**Request Body:**
```json
{
  "projectId": "string",
  "scheduledDate": "date",
  "purpose": "string",
  "participants": ["user-ids"]
}
```

### PUT /monitoring/site-visits/:id
Update site visit.

### GET /monitoring/site-visits/project/:projectId
Get site visits by project.

### GET /monitoring/project/:projectId
Get monitoring by project.

### GET /monitoring/stats/overview
Get monitoring statistics.

---

## Report Endpoints

### GET /reports
Get available reports.

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "type": "string",
      "availableFormats": ["pdf", "excel"]
    }
  ]
}
```

### GET /reports/progress
Generate project progress report.

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `projectId`: Specific project
- `implementingUnit`: Filter by unit
- `status`: Filter by status

### GET /reports/financial
Generate financial report.

### GET /reports/rpmes
Generate RPMES compliance report.

### GET /reports/monitoring
Generate monitoring report.

### GET /reports/executive-summary
Generate executive summary.

### GET /reports/dashboard-analytics
Generate dashboard analytics.

### GET /reports/export/pdf/:reportType
Export report to PDF.

### GET /reports/export/excel/:reportType
Export report to Excel.

### GET /reports/templates
Get report templates.

### POST /reports/schedule
Schedule automated report.

**Request Body:**
```json
{
  "reportType": "string",
  "frequency": "daily|weekly|monthly|quarterly",
  "recipients": ["email-addresses"],
  "parameters": "object"
}
```

### GET /reports/scheduled
Get scheduled reports.

### GET /reports/history
Get report history.

---

## Upload Endpoints

### POST /uploads
Upload single file.

**Request Body:** FormData
- `file`: File to upload
- `category`: File category

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "string",
    "filename": "string",
    "originalName": "string",
    "size": "number",
    "mimeType": "string",
    "category": "string",
    "uploadedBy": "string",
    "uploadedAt": "date"
  }
}
```

### POST /uploads/multiple
Upload multiple files.

**Request Body:** FormData
- `files`: Array of files
- `category`: File category

### POST /uploads/project/:projectId
Upload project document.

**Request Body:** FormData
- `file`: File to upload
- `documentType`: Type of document

### POST /uploads/rpmes/:formId
Upload RPMES form attachment.

**Request Body:** FormData
- `file`: File to upload

### GET /uploads
Get uploaded files.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `category`: Filter by category
- `uploadedBy`: Filter by uploader

### GET /uploads/category/:category
Get files by category.

### GET /uploads/project/:projectId
Get project documents.

### GET /uploads/download/:fileId
Download file.

### DELETE /uploads/:fileId
Delete file.

### PATCH /uploads/:fileId
Update file metadata.

**Request Body:**
```json
{
  "filename": "string",
  "category": "string",
  "description": "string"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

The API implements rate limiting:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

---

## File Upload Limits

- Maximum file size: 10MB
- Supported formats: PDF, Word, Excel, images, ZIP
- Maximum files per upload: 10 files

---

## Development Notes

1. **Mock Data**: All endpoints currently return mock data for development
2. **Database Integration**: Backend developer will replace mock logic with MySQL queries
3. **Authentication**: JWT tokens are simulated; implement proper JWT library
4. **File Storage**: Implement proper file storage solution (local/cloud)
5. **Validation**: Add comprehensive input validation
6. **Security**: Implement proper security measures (CORS, rate limiting, etc.)

---

## Frontend Integration

The frontend services in `src/services/` provide:
- Axios-based API calls
- Error handling and interceptors
- Authentication token management
- File upload utilities
- Data validation helpers

Use these services in React components for seamless API integration. 