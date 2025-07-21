const express = require('express');
const router = express.Router();
const { ProjectMilestone, Project, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

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

module.exports = router; 