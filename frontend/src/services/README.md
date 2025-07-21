# Frontend Services - Build Watch LGU

This directory contains modular Axios-based services for interacting with the Build Watch LGU API.

## Services Overview

### Core Services
- **`api.js`** - Base Axios configuration with interceptors
- **`auth.js`** - Authentication and user management
- **`users.js`** - User management (System Admin)
- **`projects.js`** - Project management and progress tracking
- **`rpmes.js`** - RPMES form management
- **`monitoring.js`** - Monitoring activities and validation
- **`reports.js`** - Report generation and exports
- **`uploads.js`** - File upload and document management

## Quick Start

### 1. Import Services
```javascript
import authService from '../services/auth';
import projectService from '../services/projects';
import rpmesService from '../services/rpmes';
```

### 2. Use in Components
```javascript
import React, { useState, useEffect } from 'react';
import projectService from '../services/projects';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getAllProjects();
      setProjects(response.projects);
    } catch (err) {
      setError(err.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

## Service Details

### Authentication Service (`auth.js`)

**Key Methods:**
- `login(username, password)` - User login
- `logout()` - User logout
- `isAuthenticated()` - Check authentication status
- `getCurrentUser()` - Get current user data
- `hasRole(role)` - Check user role
- `hasAnyRole(roles)` - Check multiple roles

**Usage:**
```javascript
// Login
const handleLogin = async (username, password) => {
  try {
    const response = await authService.login(username, password);
    if (response.success) {
      // Redirect to dashboard
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Check role-based access
if (authService.hasRole('LGU-PMT')) {
  // Show PMT-specific features
}

// Check multiple roles
if (authService.hasAnyRole(['LGU-PMT', 'SYS.AD'])) {
  // Show admin features
}
```

### Project Service (`projects.js`)

**Key Methods:**
- `getAllProjects(params)` - Get projects with filters
- `getProjectById(id)` - Get specific project
- `createProject(data)` - Create new project
- `submitProgressUpdate(id, data)` - Submit progress
- `getProjectStats()` - Get project statistics

**Usage:**
```javascript
// Get projects with filters
const loadProjects = async () => {
  const response = await projectService.getAllProjects({
    status: 'ongoing',
    implementingUnit: 'EIU',
    page: 1,
    limit: 10
  });
  setProjects(response.projects);
};

// Submit progress update
const submitUpdate = async (projectId, progress, costSpent, remarks) => {
  try {
    await projectService.submitProgressUpdate(projectId, {
      progress,
      costSpent,
      remarks
    });
    // Show success message
  } catch (error) {
    // Handle error
  }
};
```

### RPMES Service (`rpmes.js`)

**Key Methods:**
- `getAllForms(params)` - Get RPMES forms
- `submitForm(data)` - Submit RPMES form
- `validateForm(id, data)` - Validate form (LGU-PMT)
- `getFormTemplate(type)` - Get form template

**Usage:**
```javascript
// Submit RPMES form
const submitRPMES = async (formData) => {
  try {
    const response = await rpmesService.submitForm({
      formType: 'RPMES Form 1',
      projectId: 'project-id',
      content: {
        projectDescription: '...',
        objectives: '...',
        budget: 1000000
      }
    });
    // Handle success
  } catch (error) {
    // Handle error
  }
};

// Get form template
const loadTemplate = async () => {
  const template = await rpmesService.getFormTemplate('RPMES Form 1');
  setFormStructure(template);
};
```

### Monitoring Service (`monitoring.js`)

**Key Methods:**
- `submitMonitoringReport(data)` - Submit monitoring report
- `validateProjectUpdate(id, data)` - Validate updates
- `scheduleSiteVisit(data)` - Schedule site visit
- `provideFeedback(projectId, data)` - Provide feedback

**Usage:**
```javascript
// Submit monitoring report
const submitReport = async (projectId, findings, recommendations) => {
  try {
    await monitoringService.submitMonitoringReport({
      projectId,
      monitoringType: 'Physical Progress Validation',
      monitoringDate: new Date(),
      findings,
      recommendations
    });
  } catch (error) {
    // Handle error
  }
};

// Validate project update
const validateUpdate = async (updateId, status, feedback) => {
  try {
    await monitoringService.validateProjectUpdate(updateId, {
      status,
      feedback
    });
  } catch (error) {
    // Handle error
  }
};
```

### Reports Service (`reports.js`)

**Key Methods:**
- `generateProgressReport(params)` - Generate progress report
- `exportToPDF(type, params)` - Export to PDF
- `exportToExcel(type, params)` - Export to Excel
- `scheduleReport(data)` - Schedule automated report

**Usage:**
```javascript
// Generate and download report
const downloadReport = async () => {
  try {
    const blob = await reportService.exportToPDF('progress', {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    
    // Download file
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'progress-report.pdf';
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    // Handle error
  }
};
```

### Upload Service (`uploads.js`)

**Key Methods:**
- `uploadFile(file, category)` - Upload single file
- `uploadMultipleFiles(files, category)` - Upload multiple files
- `downloadFile(fileId)` - Download file
- `validateFileUpload(file)` - Validate file before upload

**Usage:**
```javascript
// Upload file
const handleFileUpload = async (file) => {
  try {
    // Validate file
    const errors = uploadService.validateFileUpload(file);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    // Upload file
    const response = await uploadService.uploadFile(file, 'project-documents');
    console.log('File uploaded:', response.file);
  } catch (error) {
    // Handle error
  }
};

// Upload project document
const uploadProjectDoc = async (projectId, file, documentType) => {
  try {
    const response = await uploadService.uploadProjectDocument(
      projectId, 
      file, 
      documentType
    );
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## Error Handling

All services include comprehensive error handling:

```javascript
try {
  const response = await projectService.getAllProjects();
  // Handle success
} catch (error) {
  // Error object structure:
  // { error: "Error message", details?: "Additional details" }
  console.error('API Error:', error.error);
  
  // Show user-friendly error message
  setError(error.error || 'An unexpected error occurred');
}
```

## Authentication Flow

1. **Login**: User submits credentials
2. **Token Storage**: JWT token stored in localStorage
3. **Automatic Headers**: Token automatically included in API requests
4. **Token Expiry**: Automatic logout on 401 responses
5. **Role Checking**: Use `authService.hasRole()` for conditional rendering

```javascript
// Protected component example
function AdminDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      setUser(authService.getCurrentUser());
    } else {
      navigate('/login');
    }
  }, []);

  if (!authService.hasRole('SYS.AD')) {
    return <div>Access denied</div>;
  }

  return <div>Admin Dashboard</div>;
}
```

## Data Validation

Services include validation helpers:

```javascript
// Validate project data
const errors = projectService.validateProjectData({
  name: '',
  budget: -1000,
  startDate: null
});

if (errors.length > 0) {
  // Show validation errors
  setErrors(errors);
  return;
}

// Validate file upload
const fileErrors = uploadService.validateFileUpload(file);
if (fileErrors.length > 0) {
  alert(fileErrors.join('\n'));
  return;
}
```

## Best Practices

1. **Loading States**: Always show loading indicators during API calls
2. **Error Handling**: Provide user-friendly error messages
3. **Validation**: Validate data before API calls
4. **Role-Based Access**: Check user roles before rendering features
5. **File Uploads**: Validate files before upload
6. **Pagination**: Use pagination for large data sets
7. **Caching**: Consider caching frequently accessed data

## Environment Configuration

Set the API base URL in your environment:

```bash
# .env
REACT_APP_API_URL=http://localhost:5000/api
```

The service will fall back to `http://localhost:5000/api` if not configured.

## Integration with React Context

For global state management, consider using React Context with these services:

```javascript
// AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      setUser(authService.getCurrentUser());
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await authService.login(username, password);
    if (response.success) {
      setUser(response.user);
    }
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

This provides a clean, modular approach to API integration in your React components. 