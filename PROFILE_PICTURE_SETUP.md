# Profile Picture Functionality Setup Guide

## Overview
This guide explains how to set up the profile picture editing functionality in the Build Watch System Administration dashboard.

## Features Implemented

### Frontend (My Profile Module)
- ✅ Clickable profile picture with hover effects
- ✅ Professional modal interface for editing
- ✅ Drag & drop file upload
- ✅ Image preview before saving
- ✅ File validation (image types, 5MB limit)
- ✅ Loading states and error handling
- ✅ Fallback to localStorage if server upload fails
- ✅ Persistent storage across page reloads

### Backend (API Endpoints)
- ✅ `/api/profile/upload-picture` - POST endpoint for file uploads
- ✅ File storage in `backend/uploads/profile-pictures/`
- ✅ File type validation (PNG, JPG, GIF)
- ✅ File size validation (5MB limit)
- ✅ Unique filename generation

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
The required packages are already installed:
- `multer` - File upload handling
- `express` - Web framework
- `fs` - File system operations

#### File Structure
```
backend/
├── routes/
│   └── profile.js          # Profile picture routes
├── uploads/
│   └── profile-pictures/   # Uploaded images (auto-created)
└── server.js               # Main server file (already updated)
```

#### API Endpoints
- **POST** `/api/profile/upload-picture` - Upload new profile picture
- **GET** `/api/profile/picture/:userId` - Get profile picture URL
- **DELETE** `/api/profile/picture/:userId` - Delete profile picture

### 2. Frontend Setup

#### File Location
```
frontend/src/pages/dashboard/sysadmin/modules/my-profile.astro
```

#### Features
- Profile picture is clickable and shows edit overlay on hover
- Modal opens with drag & drop zone and file browser
- Supports image preview before saving
- Automatic fallback to localStorage if server upload fails

### 3. Database Integration (Optional)

To fully integrate with the database, uncomment and modify the database update code in `backend/routes/profile.js`:

```javascript
// Example database update
const db = require('../config/database');
await db.query(
  'UPDATE users SET profile_picture_url = ? WHERE employee_id = ?',
  [profilePictureUrl, userId]
);
```

### 4. File Storage

#### Local Storage
- Files are stored in `backend/uploads/profile-pictures/`
- Directory is automatically created if it doesn't exist
- Files are served statically at `/uploads/profile-pictures/`

#### File Naming
- Format: `profile-{userId}-{timestamp}-{random}.{extension}`
- Example: `profile-SA-001-1703123456789-123456789.jpg`

### 5. Security Features

- File type validation (images only)
- File size limits (5MB)
- Unique filename generation
- CORS configuration for file uploads
- Rate limiting (inherited from main server)

## Usage

### For Users
1. Navigate to My Profile module
2. Click on profile picture
3. Drag & drop image or click to browse
4. Preview the image
5. Click "Save Changes"

### For Developers
1. The system automatically handles file uploads
2. Fallback to localStorage ensures functionality even if backend is unavailable
3. Error handling provides user-friendly messages
4. Loading states improve user experience

## Troubleshooting

### Common Issues

#### Profile Picture Not Persisting
- Check if backend server is running
- Verify `/api/profile/upload-picture` endpoint is accessible
- Check browser console for error messages
- Ensure uploads directory has write permissions

#### File Upload Fails
- Verify file is under 5MB
- Ensure file is an image (PNG, JPG, GIF)
- Check network connectivity
- Review server logs for errors

#### Frontend Errors
- Check browser console for JavaScript errors
- Verify all required elements have correct IDs
- Ensure localStorage is enabled in browser

### Debug Mode
Enable detailed logging by checking:
- Browser console for frontend errors
- Server console for backend errors
- Network tab for API request/response details

## Future Enhancements

- Image cropping and resizing
- Multiple profile picture support
- Profile picture history
- Integration with user authentication
- Cloud storage integration (AWS S3, etc.)
- Image optimization and compression

## Support

For technical support or questions about the profile picture functionality, refer to the main Build Watch documentation or contact the development team.
