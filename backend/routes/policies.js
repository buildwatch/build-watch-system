const express = require('express');
const router = express.Router();
const { Policy, PolicyCompliance, Project, User } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotification, createNotificationForRole } = require('./notifications');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/policies';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'policy-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, XLS, XLSX files are allowed'));
    }
  }
});

// Get all policies with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      documentType,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by document type
    if (documentType) {
      whereClause.documentType = documentType;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    const policies = await Policy.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username', 'email']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      policies: policies.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: policies.count,
        pages: Math.ceil(policies.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policies',
      error: error.message
    });
  }
});

// Get policy by ID
router.get('/:id', async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username', 'email']
        }
      ]
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    // Increment view count
    await policy.increment('viewCount');

    res.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy',
      error: error.message
    });
  }
});

// Create new policy
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const {
      title,
      description,
      documentType,
      category,
      version,
      effectiveDate,
      expiryDate,
      tags,
      metadata
    } = req.body;

    const policyData = {
      title,
      description,
      documentType,
      category,
      version: version || '1.0',
      effectiveDate: effectiveDate || null,
      expiryDate: expiryDate || null,
      tags: tags ? JSON.parse(tags) : [],
      metadata: metadata ? JSON.parse(metadata) : {},
      createdBy: req.user.id,
      status: 'draft'
    };

    // Handle file upload
    if (req.file) {
      policyData.filePath = req.file.path;
      policyData.fileName = req.file.originalname;
      policyData.fileSize = req.file.size;
    }

    const policy = await Policy.create(policyData);

    res.status(201).json({
      success: true,
      message: 'Policy created successfully',
      policy
    });
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create policy',
      error: error.message
    });
  }
});

// Update policy
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    const updateData = { ...req.body };

    // Handle file upload
    if (req.file) {
      // Delete old file if exists
      if (policy.filePath && fs.existsSync(policy.filePath)) {
        fs.unlinkSync(policy.filePath);
      }
      updateData.filePath = req.file.path;
      updateData.fileName = req.file.originalname;
      updateData.fileSize = req.file.size;
    }

    // Parse JSON fields
    if (updateData.tags) {
      updateData.tags = JSON.parse(updateData.tags);
    }
    if (updateData.metadata) {
      updateData.metadata = JSON.parse(updateData.metadata);
    }

    await policy.update(updateData);

    // Send automated notifications about policy update
    try {
      console.log('🔔 Sending policy update notifications...');
      
      // Notify all implementing offices about policy update
      const implementingOffices = await User.findAll({
        where: {
          role: { [Op.in]: ['iu', 'LGU-IU'] },
          status: 'active'
        }
      });

      for (const office of implementingOffices) {
        await createNotification(
          office.id,
          'Policy Update Notification',
          `Policy "${policy.title}" has been updated. Please review the changes and ensure your projects comply with the updated requirements.`,
          'Info',
          'Policy',
          'Policy',
          policy.id,
          'Medium'
        );
      }

      // Notify MPMEC members about policy update
      const mpmecUsers = await User.findAll({
        where: {
          role: 'LGU-PMT',
          subRole: { [Op.like]: '%MPMEC%' },
          status: 'active'
        }
      });

      for (const mpmecUser of mpmecUsers) {
        await createNotification(
          mpmecUser.id,
          'Policy Update - Compliance Review Required',
          `Policy "${policy.title}" has been updated. Please review existing projects for compliance with the new requirements.`,
          'Warning',
          'Policy',
          'Policy',
          policy.id,
          'High'
        );
      }

      console.log(`✅ Sent policy update notifications to ${implementingOffices.length} implementing offices and ${mpmecUsers.length} MPMEC members`);
    } catch (notificationError) {
      console.error('❌ Error sending policy update notifications:', notificationError);
      // Don't fail the policy update if notifications fail
    }

    res.json({
      success: true,
      message: 'Policy updated successfully',
      policy
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy',
      error: error.message
    });
  }
});

// Delete policy
router.delete('/:id', async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    // Delete associated file
    if (policy.filePath && fs.existsSync(policy.filePath)) {
      fs.unlinkSync(policy.filePath);
    }

    await policy.destroy();

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete policy',
      error: error.message
    });
  }
});

// Download policy file
router.get('/:id/download', async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    if (!policy || !policy.filePath) {
      return res.status(404).json({
        success: false,
        message: 'Policy file not found'
      });
    }

    if (!fs.existsSync(policy.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Policy file not found on server'
      });
    }

    // Increment download count
    await policy.increment('downloadCount');

    res.download(policy.filePath, policy.fileName);
  } catch (error) {
    console.error('Error downloading policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download policy',
      error: error.message
    });
  }
});

// Get policy analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const totalPolicies = await Policy.count();
    const publishedPolicies = await Policy.count({ where: { status: 'published' } });
    const draftPolicies = await Policy.count({ where: { status: 'draft' } });
    const archivedPolicies = await Policy.count({ where: { status: 'archived' } });

    // Category distribution
    const categoryStats = await Policy.findAll({
      attributes: [
        'category',
        [Policy.sequelize.fn('COUNT', Policy.sequelize.col('id')), 'count']
      ],
      group: ['category']
    });

    // Document type distribution
    const documentTypeStats = await Policy.findAll({
      attributes: [
        'documentType',
        [Policy.sequelize.fn('COUNT', Policy.sequelize.col('id')), 'count']
      ],
      group: ['documentType']
    });

    // Recent policies
    const recentPolicies = await Policy.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name']
        }
      ]
    });

    // Compliance statistics
    const complianceStats = await PolicyCompliance.findAll({
      attributes: [
        'complianceStatus',
        [PolicyCompliance.sequelize.fn('COUNT', PolicyCompliance.sequelize.col('id')), 'count']
      ],
      group: ['complianceStatus']
    });

    res.json({
      success: true,
      analytics: {
        totalPolicies,
        publishedPolicies,
        draftPolicies,
        archivedPolicies,
        categoryStats,
        documentTypeStats,
        recentPolicies,
        complianceStats
      }
    });
  } catch (error) {
    console.error('Error fetching policy analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy analytics',
      error: error.message
    });
  }
});

// Get policy compliance for projects
router.get('/:id/compliance', async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    const compliance = await PolicyCompliance.findAll({
      where: { policyId: req.params.id },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'category', 'status']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    res.json({
      success: true,
      policy,
      compliance
    });
  } catch (error) {
    console.error('Error fetching policy compliance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy compliance',
      error: error.message
    });
  }
});

// Update policy compliance
router.post('/:id/compliance', async (req, res) => {
  try {
    const {
      projectId,
      complianceStatus,
      complianceScore,
      findings,
      recommendations,
      nextReviewDate
    } = req.body;

    const [compliance, created] = await PolicyCompliance.findOrCreate({
      where: {
        policyId: req.params.id,
        projectId
      },
      defaults: {
        complianceStatus,
        complianceScore,
        findings,
        recommendations,
        nextReviewDate,
        reviewedBy: req.user.id,
        reviewDate: new Date()
      }
    });

    if (!created) {
      await compliance.update({
        complianceStatus,
        complianceScore,
        findings,
        recommendations,
        nextReviewDate,
        reviewedBy: req.user.id,
        reviewDate: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Policy compliance updated successfully',
      compliance
    });
  } catch (error) {
    console.error('Error updating policy compliance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy compliance',
      error: error.message
    });
  }
});

// Generate policy compliance report
router.get('/reports/compliance', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      category,
      complianceStatus,
      projectId
    } = req.query;

    const whereClause = {};
    const includeClause = [
      {
        model: Policy,
        as: 'policy',
        attributes: ['id', 'title', 'documentType', 'category', 'status']
      },
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'projectCode', 'category', 'status']
      },
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'name', 'username']
      }
    ];

    // Add date filters
    if (startDate && endDate) {
      whereClause.reviewDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Add compliance status filter
    if (complianceStatus) {
      whereClause.complianceStatus = complianceStatus;
    }

    // Add project filter
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Add category filter through policy
    if (category) {
      includeClause[0].where = { category };
    }

    const complianceRecords = await PolicyCompliance.findAll({
      where: whereClause,
      include: includeClause,
      order: [['reviewDate', 'DESC']]
    });

    // Calculate summary statistics
    const totalRecords = complianceRecords.length;
    const compliantRecords = complianceRecords.filter(record => record.complianceStatus === 'compliant').length;
    const nonCompliantRecords = complianceRecords.filter(record => record.complianceStatus === 'non_compliant').length;
    const partiallyCompliantRecords = complianceRecords.filter(record => record.complianceStatus === 'partially_compliant').length;
    const pendingReviewRecords = complianceRecords.filter(record => record.complianceStatus === 'pending_review').length;

    const averageComplianceScore = totalRecords > 0 
      ? complianceRecords.reduce((sum, record) => sum + parseFloat(record.complianceScore || 0), 0) / totalRecords 
      : 0;

    // Group by policy
    const policySummary = {};
    complianceRecords.forEach(record => {
      const policyTitle = record.policy?.title || 'Unknown Policy';
      if (!policySummary[policyTitle]) {
        policySummary[policyTitle] = {
          total: 0,
          compliant: 0,
          nonCompliant: 0,
          partiallyCompliant: 0,
          pendingReview: 0,
          averageScore: 0,
          scores: []
        };
      }
      
      policySummary[policyTitle].total++;
      policySummary[policyTitle].scores.push(parseFloat(record.complianceScore || 0));
      
      switch (record.complianceStatus) {
        case 'compliant':
          policySummary[policyTitle].compliant++;
          break;
        case 'non_compliant':
          policySummary[policyTitle].nonCompliant++;
          break;
        case 'partially_compliant':
          policySummary[policyTitle].partiallyCompliant++;
          break;
        case 'pending_review':
          policySummary[policyTitle].pendingReview++;
          break;
      }
    });

    // Calculate average scores for each policy
    Object.keys(policySummary).forEach(policyTitle => {
      const scores = policySummary[policyTitle].scores;
      policySummary[policyTitle].averageScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
      delete policySummary[policyTitle].scores; // Remove scores array from response
    });

    res.json({
      success: true,
      report: {
        summary: {
          totalRecords,
          compliantRecords,
          nonCompliantRecords,
          partiallyCompliantRecords,
          pendingReviewRecords,
          averageComplianceScore: Math.round(averageComplianceScore * 100) / 100,
          complianceRate: totalRecords > 0 ? Math.round((compliantRecords / totalRecords) * 100) : 0
        },
        policySummary,
        records: complianceRecords
      }
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error.message
    });
  }
});

module.exports = router; 