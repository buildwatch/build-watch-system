const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos and large files
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Mock uploads data
const mockUploads = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    fileName: 'road_progress_1.jpg',
    originalName: 'road_progress_1.jpg',
    fileType: 'image/jpeg',
    fileSize: 2048576,
    uploadedBy: 'Engr. Roberto Garcia',
    uploadDate: '2024-06-01',
    category: 'Progress Photos',
    description: 'Foundation completion photos'
  },
  {
    id: 2,
    projectId: 1,
    projectName: 'Road Construction - Barangay A',
    fileName: 'cost_breakdown.pdf',
    originalName: 'cost_breakdown.pdf',
    fileType: 'application/pdf',
    fileSize: 512000,
    uploadedBy: 'Engr. Roberto Garcia',
    uploadDate: '2024-06-01',
    category: 'Documents',
    description: 'Detailed cost breakdown'
  },
  {
    id: 3,
    projectId: 2,
    projectName: 'School Renovation - Elementary School',
    fileName: 'school_progress_1.jpg',
    originalName: 'school_progress_1.jpg',
    fileType: 'image/jpeg',
    fileSize: 1536000,
    uploadedBy: 'Engr. Carlos Rodriguez',
    uploadDate: '2024-06-02',
    category: 'Progress Photos',
    description: 'Structural repairs completed'
  }
];

// Upload single file
router.post('/single', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId, category, description } = req.body;
    
    const newUpload = {
      id: mockUploads.length + 1,
      projectId: parseInt(projectId),
      projectName: 'Sample Project', // TODO: Get from database
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: 'Current User', // TODO: Get from auth
      uploadDate: new Date().toISOString().split('T')[0],
      category: category || 'General',
      description: description || ''
    };
    
    mockUploads.push(newUpload);
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      upload: newUpload
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { projectId, category, description } = req.body;
    const uploadedFiles = [];
    
    req.files.forEach((file, index) => {
      const newUpload = {
        id: mockUploads.length + 1 + index,
        projectId: parseInt(projectId),
        projectName: 'Sample Project', // TODO: Get from database
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: 'Current User', // TODO: Get from auth
        uploadDate: new Date().toISOString().split('T')[0],
        category: category || 'General',
        description: description || ''
      };
      
      mockUploads.push(newUpload);
      uploadedFiles.push(newUpload);
    });
    
    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      uploads: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Get uploads by project
router.get('/project/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { category, fileType } = req.query;
  
  let filteredUploads = mockUploads.filter(u => u.projectId === parseInt(projectId));
  
  if (category) {
    filteredUploads = filteredUploads.filter(u => u.category === category);
  }
  
  if (fileType) {
    filteredUploads = filteredUploads.filter(u => u.fileType.startsWith(fileType));
  }
  
  res.json({
    success: true,
    uploads: filteredUploads
  });
});

// Get all uploads
router.get('/', (req, res) => {
  const { projectId, category, uploadedBy, fileType } = req.query;
  
  let filteredUploads = [...mockUploads];
  
  if (projectId) {
    filteredUploads = filteredUploads.filter(u => u.projectId === parseInt(projectId));
  }
  
  if (category) {
    filteredUploads = filteredUploads.filter(u => u.category === category);
  }
  
  if (uploadedBy) {
    filteredUploads = filteredUploads.filter(u => u.uploadedBy === uploadedBy);
  }
  
  if (fileType) {
    filteredUploads = filteredUploads.filter(u => u.fileType.startsWith(fileType));
  }
  
  res.json({
    success: true,
    uploads: filteredUploads
  });
});

// Get upload by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const upload = mockUploads.find(u => u.id === parseInt(id));
  if (!upload) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  
  res.json({
    success: true,
    upload
  });
});

// Download file by filename
router.get('/:filename/download', (req, res) => {
  const { filename } = req.params;
  
  // Find the upload by filename
  const upload = mockUploads.find(u => u.fileName === filename);
  if (!upload) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Construct the file path
  const filePath = `uploads/${upload.fileName}`;
  
  // Check if file exists
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found on server' });
  }
  
  // Set appropriate headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${upload.originalName}"`);
  res.setHeader('Content-Type', upload.fileType);
  
  // Stream the file
  const fileStream = fs.createReadStream(fullPath);
  fileStream.pipe(res);
});

// Delete upload
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const uploadIndex = mockUploads.findIndex(u => u.id === parseInt(id));
  if (uploadIndex === -1) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  
  const deletedUpload = mockUploads.splice(uploadIndex, 1)[0];
  
  // TODO: Delete actual file from filesystem
  
  res.json({
    success: true,
    message: 'File deleted successfully',
    upload: deletedUpload
  });
});

// Get upload statistics
router.get('/stats/overview', (req, res) => {
  const totalUploads = mockUploads.length;
  const totalSize = mockUploads.reduce((sum, u) => sum + u.fileSize, 0);
  
  const uploadsByCategory = {
    'Progress Photos': mockUploads.filter(u => u.category === 'Progress Photos').length,
    'Documents': mockUploads.filter(u => u.category === 'Documents').length,
    'General': mockUploads.filter(u => u.category === 'General').length
  };
  
  const uploadsByType = {
    'Images': mockUploads.filter(u => u.fileType.startsWith('image/')).length,
    'PDFs': mockUploads.filter(u => u.fileType === 'application/pdf').length,
    'Documents': mockUploads.filter(u => u.fileType.includes('word')).length
  };
  
  res.json({
    success: true,
    stats: {
      totalUploads,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
      uploadsByCategory,
      uploadsByType
    }
  });
});

// Get upload categories
router.get('/categories', (req, res) => {
  const categories = [
    'Progress Photos',
    'Documents',
    'Permits',
    'Contracts',
    'Reports',
    'General'
  ];
  
  res.json({
    success: true,
    categories
  });
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
  }
  
  if (error.message === 'Invalid file type') {
    return res.status(400).json({ error: 'Invalid file type. Only images, PDFs, and Word documents are allowed.' });
  }
  
  res.status(500).json({ error: 'Upload error', details: error.message });
});

module.exports = router; 