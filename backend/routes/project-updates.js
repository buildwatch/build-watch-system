const express = require('express');
const router = express.Router();
const { ProjectUpdate, ProjectMilestone, Project, User, ProjectUpdateFile } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/project-updates';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, document, and video files are allowed'));
    }
  }
});

// Get all updates for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, updateType } = req.query;
    
    const whereClause = { projectId };
    if (status) whereClause.status = status;
    if (updateType) whereClause.updateType = updateType;
    
    const updates = await ProjectUpdate.findAll({
      where: whereClause,
      include: [
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'name', 'weight']
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: User,
          as: 'iuReviewerUser',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: User,
          as: 'secretariatReviewerUser',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: ProjectUpdateFile,
          as: 'files',
          attributes: ['id', 'fileName', 'originalName', 'fileType', 'description']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      updates
    });
  } catch (error) {
    console.error('Error fetching project updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project updates',
      error: error.message
    });
  }
});

// Submit a new update (EIU)
router.post('/submit', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const {
      projectId,
      milestoneId,
      updateType,
      claimedProgress,
      budgetUsed,
      remarks
    } = req.body;

    // Validate required fields
    if (!projectId || !milestoneId || !updateType || !claimedProgress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate user role (only EIU can submit updates)
    if (req.user.role !== 'EIU') {
      return res.status(403).json({
        success: false,
        message: 'Only EIU users can submit updates'
      });
    }

    // Validate milestone exists and belongs to project
    const milestone = await ProjectMilestone.findOne({
      where: { id: milestoneId, projectId }
    });
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    // Create the update
    const update = await ProjectUpdate.create({
      projectId,
      milestoneId,
      submittedBy: req.user.id,
      updateType,
      claimedProgress: parseFloat(claimedProgress),
      budgetUsed: budgetUsed ? parseFloat(budgetUsed) : 0,
      remarks,
      status: 'submitted'
    });

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const fileRecords = req.files.map(file => ({
        projectUpdateId: update.id,
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType: getFileType(file.mimetype),
        uploadedBy: req.user.id
      }));

      await ProjectUpdateFile.bulkCreate(fileRecords);
    }

    // Reload update with associations
    const createdUpdate = await ProjectUpdate.findByPk(update.id, {
      include: [
        {
          model: ProjectMilestone,
          as: 'milestone'
        },
        {
          model: User,
          as: 'submitter'
        },
        {
          model: ProjectUpdateFile,
          as: 'files'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Update submitted successfully',
      update: createdUpdate
    });
  } catch (error) {
    console.error('Error submitting update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit update',
      error: error.message
    });
  }
});

// IU Review update
router.put('/:updateId/iu-review', authenticateToken, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { action, adjustedProgress, remarks } = req.body;

    // Validate user role (only IU can review)
    if (req.user.role !== 'LGU-IU') {
      return res.status(403).json({
        success: false,
        message: 'Only IU users can review updates'
      });
    }

    const update = await ProjectUpdate.findByPk(updateId);
    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }

    if (update.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Update is not in submitted status'
      });
    }

    // Update based on action
    const updateData = {
      iuReviewer: req.user.id,
      iuReviewDate: new Date(),
      iuReviewRemarks: remarks
    };

    if (action === 'approve') {
      updateData.status = 'iu_approved';
      updateData.adjustedProgress = adjustedProgress || update.claimedProgress;
    } else if (action === 'reject') {
      updateData.status = 'iu_rejected';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    await update.update(updateData);

    res.json({
      success: true,
      message: `Update ${action}d successfully`,
      update
    });
  } catch (error) {
    console.error('Error reviewing update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review update',
      error: error.message
    });
  }
});

// Secretariat Review update
router.put('/:updateId/secretariat-review', authenticateToken, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { action, finalProgress, remarks } = req.body;

    // Validate user role (only Secretariat can review)
    if (req.user.role !== 'LGU-PMT-MPMEC-SECRETARIAT') {
      return res.status(403).json({
        success: false,
        message: 'Only Secretariat users can review updates'
      });
    }

    const update = await ProjectUpdate.findByPk(updateId, {
      include: [
        {
          model: ProjectMilestone,
          as: 'milestone'
        },
        {
          model: Project,
          as: 'project'
        }
      ]
    });

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }

    if (update.status !== 'iu_approved') {
      return res.status(400).json({
        success: false,
        message: 'Update must be approved by IU first'
      });
    }

    // Update based on action
    const updateData = {
      secretariatReviewer: req.user.id,
      secretariatReviewDate: new Date(),
      secretariatReviewRemarks: remarks
    };

    if (action === 'approve') {
      updateData.status = 'secretariat_approved';
      updateData.finalProgress = finalProgress || update.adjustedProgress || update.claimedProgress;
      
      // Update milestone status if completed
      if (updateData.finalProgress >= 100) {
        await update.milestone.update({ status: 'completed' });
      } else if (updateData.finalProgress > 0) {
        await update.milestone.update({ status: 'in_progress' });
      }

      // Recalculate project automated progress
      await recalculateProjectProgress(update.projectId);
      
    } else if (action === 'reject') {
      updateData.status = 'secretariat_rejected';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    await update.update(updateData);

    res.json({
      success: true,
      message: `Update ${action}d successfully`,
      update
    });
  } catch (error) {
    console.error('Error reviewing update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review update',
      error: error.message
    });
  }
});

// Check if milestone has pending updates (for blocking new submissions)
router.get('/milestone/:milestoneId/pending-status', authenticateToken, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    
    // Check for any pending updates for this milestone
    const pendingUpdates = await ProjectUpdate.findAll({
      where: {
        milestoneId,
        status: {
          [require('sequelize').Op.in]: ['submitted', 'iu_approved'] // These statuses block new submissions
        }
      },
      include: [
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'weight']
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get latest approved update for this milestone
    const latestApprovedUpdate = await ProjectUpdate.findOne({
      where: {
        milestoneId,
        status: 'secretariat_approved'
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      hasPendingUpdates: pendingUpdates.length > 0,
      pendingUpdates: pendingUpdates,
      latestApprovedUpdate: latestApprovedUpdate
    });

  } catch (error) {
    console.error('Error checking milestone pending status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check milestone pending status',
      error: error.message
    });
  }
});

// Helper function to recalculate project progress
async function recalculateProjectProgress(projectId) {
  try {
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: ProjectMilestone,
          as: 'milestones'
        }
      ]
    });

    if (!project) return;

    // Calculate total progress based on approved milestone weights
    let totalProgress = 0;
    let totalWeight = 0;

    for (const milestone of project.milestones) {
      totalWeight += parseFloat(milestone.weight);
      
      // Get the latest approved update for this milestone
      const latestApprovedUpdate = await ProjectUpdate.findOne({
        where: {
          milestoneId: milestone.id,
          status: 'secretariat_approved'
        },
        order: [['createdAt', 'DESC']]
      });

      if (latestApprovedUpdate) {
        const milestoneProgress = parseFloat(latestApprovedUpdate.finalProgress);
        totalProgress += (milestoneProgress / 100) * parseFloat(milestone.weight);
      }
    }

    // Update project automated progress
    const automatedProgress = totalWeight > 0 ? (totalProgress / totalWeight) * 100 : 0;
    
    await project.update({
      automatedProgress: Math.min(100, Math.max(0, automatedProgress)),
      lastProgressUpdate: new Date()
    });

  } catch (error) {
    console.error('Error recalculating project progress:', error);
  }
}

// Helper function to determine file type
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  return 'other';
}

module.exports = router; 