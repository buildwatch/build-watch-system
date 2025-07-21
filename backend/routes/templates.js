const express = require('express');
const router = express.Router();
const { Template, User, ActivityLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/templates';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|docx|xlsx|doc|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, XLSX, DOC, and XLS files are allowed!'));
    }
  }
});

// Get all templates with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      category, 
      department, 
      status, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    if (category) whereClause.category = category;
    if (department) whereClause.department = department;
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: templates } = await Template.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'username']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate statistics
    const stats = await Template.findAll({
      attributes: [
        'status',
        [Template.sequelize.fn('COUNT', Template.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const totalTemplates = await Template.count();
    const activeTemplates = await Template.count({ where: { status: 'active' } });
    const draftTemplates = await Template.count({ where: { status: 'draft' } });
    
    // Get monthly downloads
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthlyDownloads = await Template.sum('downloadCount', {
      where: {
        lastDownloadedAt: {
          [Op.gte]: currentMonth
        }
      }
    });

    res.json({
      success: true,
      templates,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      stats: {
        totalTemplates,
        activeTemplates,
        draftTemplates,
        monthlyDownloads: monthlyDownloads || 0
      }
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// Get templates by department
router.get('/by-department', authenticateToken, async (req, res) => {
  try {
    const templates = await Template.findAll({
      where: { status: 'active' },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name']
        }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Group templates by department
    const templatesByDepartment = {};
    templates.forEach(template => {
      const dept = template.department || 'General';
      if (!templatesByDepartment[dept]) {
        templatesByDepartment[dept] = [];
      }
      templatesByDepartment[dept].push(template);
    });

    res.json({
      success: true,
      templatesByDepartment
    });

  } catch (error) {
    console.error('Get templates by department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates by department'
    });
  }
});

// Get template by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await Template.findByPk(id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'username']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Upload new template
router.post('/', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), upload.single('templateFile'), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Template file is required'
      });
    }

    const {
      name,
      description,
      category,
      subCategory,
      department,
      version,
      isRequired,
      tags
    } = req.body;

    // Determine file type from uploaded file
    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);

    const template = await Template.create({
      name,
      description,
      category,
      subCategory,
      department,
      fileType,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      version: version || '1.0',
      status: 'draft',
      isRequired: isRequired === 'true',
      tags: tags ? JSON.parse(tags) : [],
      uploadedBy: req.user.id
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPLOAD_TEMPLATE',
      entityType: 'Template',
      entityId: template.id,
      details: `Uploaded template: ${template.name}`,
      module: 'Template Management'
    });

    res.status(201).json({
      success: true,
      message: 'Template uploaded successfully',
      template
    });

  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload template'
    });
  }
});

// Update template
router.put('/:id', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const template = await Template.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    await template.update(updateData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'UPDATE_TEMPLATE',
      entityType: 'Template',
      entityId: template.id,
      details: `Updated template: ${template.name}`,
      module: 'Template Management'
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// Delete template
router.delete('/:id', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const { id } = req.params;

    const template = await Template.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(template.filePath)) {
      fs.unlinkSync(template.filePath);
    }

    await template.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_TEMPLATE',
      entityType: 'Template',
      entityId: id,
      details: `Deleted template: ${template.name}`,
      module: 'Template Management'
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// Download template
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await Template.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(template.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Template file not found'
      });
    }

    // Update download count and last downloaded date
    await template.update({
      downloadCount: template.downloadCount + 1,
      lastDownloadedAt: new Date()
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'DOWNLOAD_TEMPLATE',
      entityType: 'Template',
      entityId: template.id,
      details: `Downloaded template: ${template.name}`,
      module: 'Template Management'
    });

    // Send file
    res.download(template.filePath, template.fileName);

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download template'
    });
  }
});

// Approve template
router.post('/:id/approve', authenticateToken, requireRole(['secretariat', 'LGU-PMT']), async (req, res) => {
  try {
    // Additional check for LGU-PMT users to ensure they have Secretariat subrole
    if (req.user.role === 'LGU-PMT' && 
        req.user.subRole !== 'Secretariat' && 
        req.user.subRole !== 'MPMEC Secretariat') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Secretariat role required.'
      });
    }

    const { id } = req.params;

    const template = await Template.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    await template.update({
      status: 'active',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'APPROVE_TEMPLATE',
      entityType: 'Template',
      entityId: template.id,
      details: `Approved template: ${template.name}`,
      module: 'Template Management'
    });

    res.json({
      success: true,
      message: 'Template approved successfully',
      template
    });

  } catch (error) {
    console.error('Approve template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve template'
    });
  }
});

module.exports = router; 