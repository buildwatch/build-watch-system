const express = require('express');
const router = express.Router();
const { MilestoneSubmission, ProjectMilestone, Project, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for RPMES form uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/rpmes-forms');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'rpmes-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common document formats
  if (file.mimetype === 'application/pdf' || 
      file.mimetype === 'application/msword' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word, and Excel files are allowed for RPMES forms!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Function to get default files of each type (most recent)
function getDefaultFiles(type) {
  const fs = require('fs');
  const path = require('path');
  const baseUrl = 'http://localhost:3000';
  
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    let extensions = [];
    switch (type) {
      case 'image':
        extensions = ['.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp', '.bmp'];
        break;
      case 'video':
        extensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv'];
        break;
      case 'document':
        extensions = ['.xlsx', '.xls', '.pdf', '.doc', '.docx'];
        break;
      default:
        return [];
    }
    
    // Find files matching the type
    const matchingFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return extensions.includes(ext) && !fs.statSync(path.join(uploadsDir, file)).isDirectory();
    });
    
    // Sort by modification time (newest first)
    matchingFiles.sort((a, b) => {
      const statA = fs.statSync(path.join(uploadsDir, a));
      const statB = fs.statSync(path.join(uploadsDir, b));
      return statB.mtime - statA.mtime;
    });
    
    // Return the most recent file as a properly formatted object
    if (matchingFiles.length > 0) {
      const fileName = matchingFiles[0];
      const stats = fs.statSync(path.join(uploadsDir, fileName));
      
      console.log(`🔄 Using default ${type} file: ${fileName}`);
      
      return [{
        name: fileName,
        originalName: fileName,
        url: `${baseUrl}/uploads/${fileName}`,
        src: `${baseUrl}/uploads/${fileName}`,
        size: stats.size,
        exists: true,
        isDefault: true
      }];
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting default ${type} files:`, error);
    return [];
  }
}

// Helper function to convert file paths to full URLs with smart file matching
function convertToFullUrl(fileData) {
  if (!fileData) return fileData;
  
  const baseUrl = 'http://localhost:3000';
  const fs = require('fs');
  const path = require('path');
  
  // Function to find actual file in uploads directory
  function findActualFile(fileName) {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const files = fs.readdirSync(uploadsDir);
      
      // First try exact match
      if (files.includes(fileName)) {
        return fileName;
      }
      
      // If no exact match, try to find similar file based on extension and partial name
      const fileExt = path.extname(fileName).toLowerCase();
      const baseName = path.basename(fileName, fileExt).toLowerCase();
      
      // Look for files with same extension
      const matchingFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === fileExt && !fs.statSync(path.join(uploadsDir, file)).isDirectory();
      });
      
      // Sort by modification time (newest first)
      matchingFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(uploadsDir, a));
        const statB = fs.statSync(path.join(uploadsDir, b));
        return statB.mtime - statA.mtime;
      });
      
      // If only one file with same extension, use it
      if (matchingFiles.length === 1) {
        console.log(`📎 File mapping: ${fileName} -> ${matchingFiles[0]} (only match)`);
        return matchingFiles[0];
      }
      
      // If multiple files, try to find by partial name match first
      const partialMatch = matchingFiles.find(file => {
        const fileBaseName = path.basename(file, path.extname(file)).toLowerCase();
        return fileBaseName.includes(baseName.substring(0, 10)) || baseName.includes(fileBaseName.substring(0, 10));
      });
      
      if (partialMatch) {
        console.log(`📎 File mapping: ${fileName} -> ${partialMatch} (partial match)`);
        return partialMatch;
      }
      
      // If no partial match, use the most recent file with same extension
      if (matchingFiles.length > 0) {
        console.log(`📎 File mapping: ${fileName} -> ${matchingFiles[0]} (newest with same extension)`);
        return matchingFiles[0];
      }
      
      console.log(`❌ No matching file found for: ${fileName}`);
      return fileName; // Return original if no match found
    } catch (error) {
      console.error(`Error finding file ${fileName}:`, error);
      return fileName;
    }
  }
  
  if (Array.isArray(fileData)) {
    return fileData.map(file => {
      if (typeof file === 'string') {
        const actualFileName = findActualFile(file);
        const fullUrl = actualFileName.startsWith('http') ? actualFileName : `${baseUrl}/uploads/${actualFileName}`;
        
        // Check if file exists
        const filePath = path.join(__dirname, '..', 'uploads', actualFileName);
        const exists = fs.existsSync(filePath);
        console.log(`🔍 File check: ${actualFileName} -> exists: ${exists}`);
        
        return fullUrl;
      } else if (file && typeof file === 'object') {
        const fileName = file.url || file.src || file.path || file.fileName;
        if (fileName && !fileName.startsWith('http')) {
          const actualFileName = findActualFile(fileName);
          const fullUrl = `${baseUrl}/uploads/${actualFileName}`;
          
          // Check if file exists
          const filePath = path.join(__dirname, '..', 'uploads', actualFileName);
          const exists = fs.existsSync(filePath);
          console.log(`🔍 File check: ${actualFileName} -> exists: ${exists}`);
          
          return {
            ...file,
            url: fullUrl,
            src: fullUrl,
            actualFileName: actualFileName,
            exists: exists
          };
        }
        return file;
      }
      return file;
    });
  } else if (typeof fileData === 'string') {
    const actualFileName = findActualFile(fileData);
    const fullUrl = actualFileName.startsWith('http') ? actualFileName : `${baseUrl}/uploads/${actualFileName}`;
    
    // Check if file exists
    const filePath = path.join(__dirname, '..', 'uploads', actualFileName);
    const exists = fs.existsSync(filePath);
    console.log(`🔍 File check: ${actualFileName} -> exists: ${exists}`);
    
    return fullUrl;
  } else if (fileData && typeof fileData === 'object') {
    const fileName = fileData.url || fileData.src || fileData.path || fileData.fileName;
    if (fileName && !fileName.startsWith('http')) {
      const actualFileName = findActualFile(fileName);
      const fullUrl = `${baseUrl}/uploads/${actualFileName}`;
      
      // Check if file exists
      const filePath = path.join(__dirname, '..', 'uploads', actualFileName);
      const exists = fs.existsSync(filePath);
      console.log(`🔍 File check: ${actualFileName} -> exists: ${exists}`);
      
      return {
        ...fileData,
        url: fullUrl,
        src: fullUrl,
        actualFileName: actualFileName,
        exists: exists
      };
    }
  }
  
  return fileData;
}

// Get all milestones for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode']
        }
      ],
      order: [['order', 'ASC']]
    });

    res.json({
      success: true,
      milestones
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch milestones',
      error: error.message
    });
  }
});

// Get all milestones for a project (public - no authentication required)
router.get('/project/:projectId/public', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // First check if the project exists and is approved for public viewing
    const project = await Project.findByPk(projectId, {
      attributes: ['id', 'name', 'approvedBySecretariat', 'submittedToSecretariat', 'status']
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Only show milestones for approved projects
    if (!project.approvedBySecretariat && !project.submittedToSecretariat) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const milestones = await ProjectMilestone.findAll({
      where: { projectId },
      attributes: [
        'id', 'title', 'description', 'weight', 'plannedBudget', 'dueDate', 
        'completedDate', 'status', 'progress', 'priority', 'order',
        'timelineWeight', 'timelineStartDate', 'timelineEndDate', 'timelineDescription', 'timelineStatus',
        'budgetWeight', 'budgetPlanned', 'budgetBreakdown', 'budgetStatus',
        'physicalWeight', 'physicalProofType', 'physicalDescription', 'physicalStatus',
        'validationDate', 'validationComments', 'completionNotes'
      ],
      order: [['order', 'ASC'], ['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      milestones
    });
  } catch (error) {
    console.error('Error fetching public milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch milestones',
      error: error.message
    });
  }
});

// Create milestones for a project (during project creation)
router.post('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { milestones } = req.body;

    // Validate that the project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate milestones data
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Milestones data is required'
      });
    }

    // Validate total weight equals 100%
    const totalWeight = milestones.reduce((sum, milestone) => sum + parseFloat(milestone.weight), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Total milestone weight must equal 100%'
      });
    }

    // Create milestones
    const createdMilestones = await ProjectMilestone.bulkCreate(
      milestones.map((milestone, index) => ({
        ...milestone,
        projectId,
        order: index + 1
      }))
    );

    res.json({
      success: true,
      message: 'Milestones created successfully',
      milestones: createdMilestones
    });
  } catch (error) {
    console.error('Error creating milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create milestones',
      error: error.message
    });
  }
});

// Update a milestone
router.put('/:milestoneId', authenticateToken, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const updateData = req.body;

    const milestone = await ProjectMilestone.findByPk(milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    // Only allow updating certain fields (not weight once project is approved)
    const allowedFields = ['name', 'description', 'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate', 'status'];
    const filteredData = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    await milestone.update(filteredData);

    res.json({
      success: true,
      message: 'Milestone updated successfully',
      milestone
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update milestone',
      error: error.message
    });
  }
});

// Delete a milestone (only if project is in draft status)
router.delete('/:milestoneId', authenticateToken, async (req, res) => {
  try {
    const { milestoneId } = req.params;

    const milestone = await ProjectMilestone.findByPk(milestoneId, {
      include: [
        {
          model: Project,
          as: 'project'
        }
      ]
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    // Only allow deletion if project is in draft status
    if (milestone.project.workflowStatus !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete milestone after project has been submitted'
      });
    }

    await milestone.destroy();

    res.json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete milestone',
      error: error.message
    });
  }
});

// Submit milestone update from EIU
router.post('/milestone-submissions', authenticateToken, async (req, res) => {
  try {
    const {
      milestoneId,
      projectId,
      submissionData,
      submittedBy,
      submissionDate,
      status
    } = req.body;

    console.log('📋 Milestone submission received:', {
      milestoneId,
      projectId,
      submittedBy,
      submissionDate,
      status
    });

    console.log('💰 Budget data debugging:', {
      'submissionData.divisions?.budget?.usedBudget': submissionData.divisions?.budget?.usedBudget,
      'submissionData.budget?.amount': submissionData.budget?.amount,
      'submissionData.divisions?.budget?.usedBudgetAmount': submissionData.divisions?.budget?.usedBudgetAmount,
      'submissionData structure': Object.keys(submissionData)
    });

    // Validate required fields
    if (!milestoneId || !projectId || !submissionData) {
      return res.status(400).json({
        success: false,
        error: 'Milestone ID, Project ID, and submission data are required'
      });
    }

    // Verify project exists and user has access
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'implementingOffice',
          attributes: ['id', 'name', 'department']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Verify milestone exists and belongs to project
    const milestone = await ProjectMilestone.findOne({
      where: {
        id: milestoneId,
        projectId: projectId
      }
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found or does not belong to this project'
      });
    }

    // Calculate budget utilization percentages
    const plannedBudget = parseFloat(milestone.plannedBudget) || 0;
    const usedBudget = parseFloat(
      submissionData.divisions?.budget?.usedBudget || 
      submissionData.divisions?.budget?.usedBudgetAmount || 
      submissionData.budget?.amount || 
      0
    );
    const remainingBudget = Math.max(0, plannedBudget - usedBudget);
    const budgetUtilizationPercentage = plannedBudget > 0 ? (usedBudget / plannedBudget) * 100 : 0;
    const milestoneUtilizationPercentage = parseFloat(milestone.weight) || 0;

    console.log('💰 Budget calculation results:', {
      plannedBudget,
      usedBudget,
      remainingBudget,
      budgetUtilizationPercentage,
      milestoneUtilizationPercentage
    });

    // Get funding source from project data (same logic as submit-update.astro)
    let fundingSource = 'local_fund'; // Default value
    if (project.fundingSource) {
      fundingSource = project.fundingSource;
    }

    // Prepare submission data
    const submissionPayload = {
      projectId,
      milestoneId,
      submittedBy: req.user.id,
      status: status || 'pending_review',
      
      // Timeline Division
      timelineStartDate: submissionData.divisions?.timeline?.startDate || submissionData.timeline?.startDate,
      timelineEndDate: submissionData.divisions?.timeline?.endDate || submissionData.timeline?.endDate,
      submissionDate: submissionDate || new Date().toISOString().split('T')[0],
      timelineActivitiesDeliverables: submissionData.divisions?.timeline?.activities ? 
        JSON.stringify(submissionData.divisions.timeline.activities) : 
        (submissionData.timeline?.description || ''),
      
      // Budget Division
      plannedBudget,
      usedBudget,
      remainingBudget,
      budgetUtilizationPercentage: Math.min(100, budgetUtilizationPercentage),
      milestoneUtilizationPercentage,
      budgetBreakdownAllocation: submissionData.divisions?.budget?.budgetBreakdown || submissionData.budget?.breakdown,
      fundingSource: fundingSource, // Use calculated funding source instead of hardcoded
      
      // Physical Division
      requiredProofs: 'Photo, Video, Excel',
      physicalProgressDescription: submissionData.divisions?.physical?.physicalDescription || submissionData.physical?.description,
      
      // File Evidence (store as JSON objects, not strings)
      photoEvidence: submissionData.divisions?.physical?.photoEvidence || submissionData.physical?.photoFiles || [],
      videoEvidence: submissionData.divisions?.physical?.videoEvidence || submissionData.physical?.videoFiles || [],
      documentFiles: submissionData.divisions?.physical?.documentEvidence || submissionData.physical?.documentFiles || [],
      
      // Additional Information
      additionalNotes: submissionData.additionalNotes,
      
      // Submitter Information (store as JSON object)
      submitterInfo: {
        fullName: submittedBy?.fullName || req.user.fullName || req.user.name,
        subrole: submittedBy?.subrole || req.user.subrole || req.user.subRole,
        contactNumber: submittedBy?.contactNumber || req.user.contactNumber,
        department: submittedBy?.department || req.user.department,
        company: submittedBy?.company || 'External Partner'
      },
      
      // Division Weights (from milestone or defaults)
      timelineWeight: submissionData.divisions?.timeline?.weight || milestone.timelineWeight || 33.33,
      budgetWeight: submissionData.divisions?.budget?.weight || milestone.budgetWeight || 33.33,
      physicalWeight: submissionData.divisions?.physical?.weight || milestone.physicalWeight || 33.34,
      
      submittedAt: new Date()
    };

    console.log('💾 Creating milestone submission with data:', {
      projectId: submissionPayload.projectId,
      milestoneId: submissionPayload.milestoneId,
      submittedBy: submissionPayload.submittedBy,
      status: submissionPayload.status,
      dataTypes: {
        projectId: typeof submissionPayload.projectId,
        milestoneId: typeof submissionPayload.milestoneId,
        submittedBy: typeof submissionPayload.submittedBy
      }
    });

    // Create the milestone submission
    const milestoneSubmission = await MilestoneSubmission.create(submissionPayload);
    
    console.log('✅ Milestone submission created with ID:', milestoneSubmission.id);
    console.log('📋 Created submission details:', {
      id: milestoneSubmission.id,
      projectId: milestoneSubmission.projectId,
      milestoneId: milestoneSubmission.milestoneId,
      status: milestoneSubmission.status
    });

    // Reload with associations for complete response
    const createdSubmission = await MilestoneSubmission.findByPk(milestoneSubmission.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'totalBudget', 'startDate', 'endDate', 'overallProgress']
        },
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'description', 'plannedBudget', 'weight', 'dueDate']
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'email', 'department']
        }
      ]
    });

    console.log('✅ Milestone submission created successfully:', createdSubmission.id);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Milestone submission created successfully',
      submission: createdSubmission,
      submissionId: createdSubmission.id
    });

  } catch (error) {
    console.error('❌ Error creating milestone submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create milestone submission',
      details: error.message
    });
  }
});

// Get evidence files from approved milestone submissions for Secretariat
router.get('/secretariat/evidence-files', authenticateToken, async (req, res) => {
  try {
    console.log('📁 Fetching evidence files from approved milestone submissions for Secretariat');
    
    const submissions = await MilestoneSubmission.findAll({
      where: {
        status: 'approved'
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode']
        },
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'description']
        }
      ],
      order: [['reviewedAt', 'DESC']]
    });

    // Extract evidence files from submissions
    const evidenceFiles = [];
    submissions.forEach(submission => {
      const submissionData = submission.toJSON();
      
      // Process photo evidence
      if (submissionData.photoEvidence && Array.isArray(submissionData.photoEvidence)) {
        submissionData.photoEvidence.forEach(photo => {
          evidenceFiles.push({
            id: `photo-${submission.id}-${photo.name || Math.random()}`,
            projectId: submissionData.projectId,
            milestoneId: submissionData.milestoneId,
            projectName: submissionData.project?.name,
            milestoneTitle: submissionData.milestone?.title,
            name: photo.name || 'Photo Evidence',
            type: 'photos',
            url: photo.url || photo.src || photo,
            status: 'approved',
            approvedBy: 'LGU-IU IOO Admin',
            uploadDate: submissionData.reviewedAt || submissionData.submittedAt,
            submissionId: submission.id
          });
        });
      }
      
      // Process video evidence
      if (submissionData.videoEvidence && Array.isArray(submissionData.videoEvidence)) {
        submissionData.videoEvidence.forEach(video => {
          evidenceFiles.push({
            id: `video-${submission.id}-${video.name || Math.random()}`,
            projectId: submissionData.projectId,
            milestoneId: submissionData.milestoneId,
            projectName: submissionData.project?.name,
            milestoneTitle: submissionData.milestone?.title,
            name: video.name || 'Video Evidence',
            type: 'videos',
            url: video.url || video.src || video,
            status: 'approved',
            approvedBy: 'LGU-IU IOO Admin',
            uploadDate: submissionData.reviewedAt || submissionData.submittedAt,
            submissionId: submission.id
          });
        });
      }
      
      // Process document files
      if (submissionData.documentFiles && Array.isArray(submissionData.documentFiles)) {
        submissionData.documentFiles.forEach(doc => {
          evidenceFiles.push({
            id: `doc-${submission.id}-${doc.name || Math.random()}`,
            projectId: submissionData.projectId,
            milestoneId: submissionData.milestoneId,
            projectName: submissionData.project?.name,
            milestoneTitle: submissionData.milestone?.title,
            name: doc.name || 'Document Evidence',
            type: 'documents',
            url: doc.url || doc.src || doc,
            status: 'approved',
            approvedBy: 'LGU-IU IOO Admin',
            uploadDate: submissionData.reviewedAt || submissionData.submittedAt,
            submissionId: submission.id
          });
        });
      }
    });

    console.log(`📊 Found ${evidenceFiles.length} evidence files from approved submissions`);

    res.json({
      success: true,
      files: evidenceFiles,
      count: evidenceFiles.length
    });

  } catch (error) {
    console.error('❌ Error fetching evidence files from approved submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evidence files from approved submissions',
      details: error.message
    });
  }
});

// Get approved milestone submissions for Secretariat review
router.get('/secretariat/approved-submissions', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching approved milestone submissions for Secretariat');
    
    const submissions = await MilestoneSubmission.findAll({
      where: {
        status: 'approved'
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'totalBudget', 'startDate', 'endDate', 'overallProgress']
        },
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'description', 'plannedBudget', 'weight', 'dueDate']
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'fullName', 'email', 'department', 'subRole', 'contactNumber', 'externalCompanyName', 'profilePictureUrl']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email'],
        }
      ],
      order: [['reviewedAt', 'DESC']]
    });

    console.log(`📊 Found ${submissions.length} approved milestone submissions`);

    // Process file URLs for all submissions
    const processedSubmissions = submissions.map(submission => {
      const submissionData = submission.toJSON();
      submissionData.photoEvidence = convertToFullUrl(submissionData.photoEvidence);
      submissionData.videoEvidence = convertToFullUrl(submissionData.videoEvidence);
      submissionData.documentFiles = convertToFullUrl(submissionData.documentFiles);
      return submissionData;
    });

    res.json({
      success: true,
      submissions: processedSubmissions,
      count: processedSubmissions.length
    });

  } catch (error) {
    console.error('❌ Error fetching approved milestone submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approved milestone submissions',
      details: error.message
    });
  }
});

// Get milestone submissions for review (LGU-IU)
router.get('/milestone-submissions', authenticateToken, async (req, res) => {
  try {
    const { status, projectId } = req.query;
    
    console.log('🔍 Milestone submissions request - User:', req.user.id, 'ProjectId:', projectId, 'Status:', status);
    
    // Build where clause
    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (projectId) {
      // Keep projectId as string since it's a UUID
      whereClause.projectId = projectId;
      console.log('🔍 Filtering submissions by projectId:', whereClause.projectId, 'Type:', typeof whereClause.projectId);
    }

    console.log('🔍 Final where clause:', whereClause);

    // First, let's check how many total submissions exist
    const totalSubmissions = await MilestoneSubmission.count();
    console.log('📊 Total submissions in database:', totalSubmissions);
    
    // Check submissions for this specific project without filters
    const projectSubmissionsCount = await MilestoneSubmission.count({
      where: { projectId: projectId }
    });
    console.log('📊 Submissions for project', projectId, ':', projectSubmissionsCount);

    const submissions = await MilestoneSubmission.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'totalBudget', 'startDate', 'endDate', 'overallProgress', 'description']
        },
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'description', 'plannedBudget', 'weight', 'dueDate']
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'fullName', 'email', 'department', 'subRole', 'contactNumber', 'externalCompanyName', 'profilePictureUrl']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    console.log('📦 Found submissions:', submissions.length, 'for whereClause:', whereClause);
    console.log('📋 Submission project IDs:', submissions.map(s => ({ 
      id: s.id, 
      projectId: s.projectId, 
      projectName: s.project?.name,
      status: s.status,
      submittedAt: s.submittedAt
    })));

    // Process file URLs for all submissions
    const processedSubmissions = submissions.map(submission => {
      const submissionData = submission.toJSON();
      submissionData.photoEvidence = convertToFullUrl(submissionData.photoEvidence);
      submissionData.videoEvidence = convertToFullUrl(submissionData.videoEvidence);
      submissionData.documentFiles = convertToFullUrl(submissionData.documentFiles);
      return submissionData;
    });

    res.json({
      success: true,
      submissions: processedSubmissions,
      total: processedSubmissions.length
    });

  } catch (error) {
    console.error('❌ Error fetching milestone submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestone submissions',
      details: error.message
    });
  }
});

// Get single milestone submission for modal display
router.get('/milestone-submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await MilestoneSubmission.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode', 'totalBudget', 'startDate', 'endDate', 'overallProgress', 'description']
        },
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title', 'description', 'plannedBudget', 'weight', 'dueDate']
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'fullName', 'email', 'department', 'subRole', 'contactNumber', 'externalCompanyName', 'profilePictureUrl']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Milestone submission not found'
      });
    }

    // Convert file paths to full URLs
    const submissionData = submission.toJSON();
    
    // Enhanced file processing with fallbacks
    submissionData.photoEvidence = convertToFullUrl(submissionData.photoEvidence) || getDefaultFiles('image');
    submissionData.videoEvidence = convertToFullUrl(submissionData.videoEvidence) || getDefaultFiles('video');
    submissionData.documentFiles = convertToFullUrl(submissionData.documentFiles) || getDefaultFiles('document');

    console.log('📸 Processed photo evidence URLs:', submissionData.photoEvidence);
    console.log('🎥 Processed video evidence URLs:', submissionData.videoEvidence);
    console.log('📄 Processed document file URLs:', submissionData.documentFiles);

    res.json({
      success: true,
      submission: submissionData
    });

  } catch (error) {
    console.error('❌ Error fetching milestone submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestone submission',
      details: error.message
    });
  }
});

// Update milestone submission status (approve/reject)
router.put('/milestone-submissions/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    console.log('🔍 Updating milestone submission status:', {
      id,
      status,
      reviewNotes,
      userId: req.user.id
    });
    
    const validStatuses = ['pending_review', 'under_review', 'approved', 'needs_revision', 'rejected'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const submission = await MilestoneSubmission.findByPk(id);
    if (!submission) {
      console.log('❌ Milestone submission not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Milestone submission not found'
      });
    }
    
    console.log('✅ Found milestone submission:', {
      id: submission.id,
      currentStatus: submission.status,
      projectId: submission.projectId,
      milestoneId: submission.milestoneId
    });

    // Update submission
    await submission.update({
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNotes
    });

    // Reload with associations
    const updatedSubmission = await MilestoneSubmission.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectCode']
        },
        {
          model: ProjectMilestone,
          as: 'milestone',
          attributes: ['id', 'title']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Milestone submission status updated successfully',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('❌ Error updating milestone submission status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update milestone submission status',
      details: error.message
    });
  }
});

// Upload RPMES form for milestone submission
router.post('/milestone-submissions/:id/upload-rpmes', authenticateToken, upload.single('rpmesForm'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    
    const submission = await MilestoneSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Milestone submission not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'RPMES form file is required'
      });
    }

    // Update submission with RPMES form path and review notes
    const rpmesFormPath = `/uploads/rpmes-forms/${req.file.filename}`;
    submission.rpmesFormPath = rpmesFormPath;
    submission.rpmesFormName = req.file.originalname;
    submission.rpmesFormSize = req.file.size;
    
    if (reviewNotes) {
      submission.reviewNotes = reviewNotes;
    }
    
    submission.reviewedAt = new Date();
    submission.reviewerId = req.user.id;

    await submission.save();

    console.log(`✅ RPMES form uploaded for submission ${id}: ${req.file.originalname}`);

    res.json({
      success: true,
      message: 'RPMES form uploaded successfully',
      file: {
        name: req.file.originalname,
        path: rpmesFormPath,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('❌ Error uploading RPMES form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload RPMES form',
      details: error.message
    });
  }
});

// Delete milestone submission
router.delete('/milestone-submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await MilestoneSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Milestone submission not found'
      });
    }

    // Delete the submission
    await submission.destroy();

    res.json({
      success: true,
      message: 'Milestone submission deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting milestone submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete milestone submission',
      details: error.message
    });
  }
});

// Debug endpoint to list all files in uploads directory
router.get('/debug-files', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    const fileDetails = files.map(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        name: file,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtime,
        url: `http://localhost:3000/uploads/${file}`
      };
    }).filter(file => !file.isDirectory);

    res.json({
      success: true,
      uploadsDirectory: uploadsDir,
      totalFiles: fileDetails.length,
      files: fileDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read uploads directory',
      details: error.message
    });
  }
});

// Test endpoint to verify file URL generation
router.get('/test-files', (req, res) => {
  const testFiles = {
    photoEvidence: [
      { name: 'Recent Photo', url: 'file-1759419287537-217044064.jpg' },
      'file-1759416298510-205609539.jfif'
    ],
    videoEvidence: [
      { name: 'Recent Video', url: 'file-1759419287550-35829800.mp4' }
    ],
    documentFiles: [
      { name: 'Recent Document.xlsx', url: 'file-1759419287565-268446025.xlsx', size: 7980 }
    ]
  };

  const processedFiles = {
    photoEvidence: convertToFullUrl(testFiles.photoEvidence),
    videoEvidence: convertToFullUrl(testFiles.videoEvidence),
    documentFiles: convertToFullUrl(testFiles.documentFiles)
  };

  res.json({
    success: true,
    original: testFiles,
    processed: processedFiles,
    baseUrl: 'http://localhost:3000',
    fallbacks: {
      defaultImages: getDefaultFiles('image'),
      defaultVideos: getDefaultFiles('video'),
      defaultDocuments: getDefaultFiles('document')
    }
  });
});

// Simple HTML test page to verify file serving
router.get('/test-page', (req, res) => {
  const path = require('path');
  
  // Get the most recent files dynamically
  const defaultFiles = {
    image: getDefaultFiles('image')[0],
    video: getDefaultFiles('video')[0],
    document: getDefaultFiles('document')[0]
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>File Serving Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }
            img { max-width: 300px; max-height: 200px; border: 1px solid #ddd; }
            video { max-width: 300px; max-height: 200px; }
            .download-btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .success { border: 2px solid green; }
            .error { border: 2px solid red; }
        </style>
    </head>
    <body>
        <h1>File Serving Test Page - Most Recent Files</h1>
        
        <div class="test-section">
            <h2>Image Test (${defaultFiles.image ? path.extname(defaultFiles.image.name).toUpperCase() : 'No Image'})</h2>
            <p>File: ${defaultFiles.image ? defaultFiles.image.name : 'No image files found'}</p>
            ${defaultFiles.image ? `
            <p>URL: <a href="${defaultFiles.image.url}" target="_blank">${defaultFiles.image.url}</a></p>
            <img src="${defaultFiles.image.url}" alt="Test Image" 
                 onload="console.log('✅ Image loaded successfully'); this.className='success';" 
                 onerror="console.error('❌ Failed to load image'); this.className='error';">
            ` : '<p>No image files available</p>'}
        </div>
        
        <div class="test-section">
            <h2>Video Test (${defaultFiles.video ? path.extname(defaultFiles.video.name).toUpperCase() : 'No Video'})</h2>
            <p>File: ${defaultFiles.video ? defaultFiles.video.name : 'No video files found'}</p>
            ${defaultFiles.video ? `
            <p>URL: <a href="${defaultFiles.video.url}" target="_blank">${defaultFiles.video.url}</a></p>
            <video controls width="300" 
                   onloadstart="console.log('🎥 Video loading started')" 
                   oncanplay="console.log('✅ Video can play'); this.className='success';" 
                   onerror="console.error('❌ Failed to load video'); this.className='error';">
                <source src="${defaultFiles.video.url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            ` : '<p>No video files available</p>'}
        </div>
        
        <div class="test-section">
            <h2>Document Test (${defaultFiles.document ? path.extname(defaultFiles.document.name).toUpperCase() : 'No Document'})</h2>
            <p>File: ${defaultFiles.document ? defaultFiles.document.name : 'No document files found'}</p>
            ${defaultFiles.document ? `
            <p>URL: <a href="${defaultFiles.document.url}" target="_blank">${defaultFiles.document.url}</a></p>
            <a href="${defaultFiles.document.url}" 
               download="${defaultFiles.document.name}" 
               class="download-btn"
               onclick="console.log('📄 Download initiated for:', '${defaultFiles.document.name}');">
                Download Document
            </a>
            ` : '<p>No document files available</p>'}
        </div>
        
        <div class="test-section">
            <h2>Console Logs & Status</h2>
            <p>Open browser console (F12) to see detailed logs for each file type.</p>
            <p><strong>Status:</strong> Using most recent files from uploads directory</p>
            <p><strong>Total Files Found:</strong> ${Object.values(defaultFiles).filter(f => f).length}/3</p>
        </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router; 