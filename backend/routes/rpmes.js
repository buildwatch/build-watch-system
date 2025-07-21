const express = require('express');
const router = express.Router();
const { RPMESForm, Project, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const ExcelExportService = require('../services/excelExportService');
const path = require('path');
const fs = require('fs');

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

// Get all RPMES forms for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { category, status, formType } = req.query;

    const whereClause = { projectId };
    if (category) whereClause.formCategory = category;
    if (status) whereClause.status = status;
    if (formType) whereClause.formType = formType;

    const forms = await RPMESForm.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'validator', attributes: ['id', 'name', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      forms: forms.map(form => ({
        ...form.toJSON(),
        canEdit: form.canEdit(req.user.role),
        canView: form.canView(req.user.role)
      }))
    });
  } catch (error) {
    console.error('Error fetching RPMES forms:', error);
    res.status(500).json({ error: 'Failed to fetch RPMES forms' });
  }
});

// Get specific RPMES form
router.get('/:formId', authenticateToken, async (req, res) => {
  try {
    const { formId } = req.params;
    
    const form = await RPMESForm.findByPk(formId, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'code', 'description'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'role', 'department'] },
        { model: User, as: 'validator', attributes: ['id', 'name', 'role'] }
      ]
    });

    if (!form) {
      return res.status(404).json({ error: 'RPMES form not found' });
    }

    // Check access permissions
    if (!form.canView(req.user.role)) {
      return res.status(403).json({ error: 'Access denied to this form' });
    }

    res.json({
      success: true,
      form: {
        ...form.toJSON(),
        canEdit: form.canEdit(req.user.role),
        canView: form.canView(req.user.role)
      }
    });
  } catch (error) {
    console.error('Error fetching RPMES form:', error);
    res.status(500).json({ error: 'Failed to fetch RPMES form' });
  }
});

// Create new RPMES form (STRICT: One form per project per type)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, formType, formData, reportingYear, reportingPeriod, remarks } = req.body;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Determine form category and access control
    const inputForms = ['RPMES Form 1', 'RPMES Form 2', 'RPMES Form 3', 'RPMES Form 4'];
    const outputForms = ['RPMES Form 5', 'RPMES Form 6', 'RPMES Form 7', 'RPMES Form 8', 'RPMES Form 9', 'RPMES Form 10', 'RPMES Form 11'];
    
    let formCategory, editableBy, viewableBy;
    
    if (inputForms.includes(formType)) {
      formCategory = 'Input';
      editableBy = 'LGU-IU';
      viewableBy = ['LGU-PMT', 'LGU-IU', 'SYS.AD'];
      
      if (req.user.role !== 'LGU-IU') {
        return res.status(403).json({ error: 'Only LGU-IU can create Input Forms' });
      }
    } else if (outputForms.includes(formType)) {
      formCategory = 'Output';
      editableBy = 'LGU-PMT';
      viewableBy = ['LGU-IU', 'EMS', 'SYS.AD'];
      
      if (req.user.role !== 'LGU-PMT') {
        return res.status(403).json({ error: 'Only LGU-PMT can create Output Forms' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid form type' });
    }

    // STRICT: Check if form already exists for this project and type
    const existingForm = await RPMESForm.findOne({
      where: { projectId, formType, isLatest: true }
    });

    if (existingForm) {
      return res.status(400).json({ 
        error: `Form ${formType} already exists for this project. Only one instance allowed per project.` 
      });
    }

    const form = await RPMESForm.create({
      projectId,
      submittedById: req.user.id,
      formType,
      formCategory,
      reportingYear,
      reportingPeriod,
      formData,
      editableBy,
      viewableBy,
      remarks,
      submissionDate: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'RPMES form created successfully',
      form: {
        ...form.toJSON(),
        canEdit: form.canEdit(req.user.role),
        canView: form.canView(req.user.role)
      }
    });
  } catch (error) {
    console.error('Error creating RPMES form:', error);
    res.status(500).json({ error: 'Failed to create RPMES form' });
  }
});

// Update RPMES form (only by authorized users)
router.put('/:formId', authenticateToken, async (req, res) => {
  try {
    const { formId } = req.params;
    const { formData, reportingPeriod, remarks, status } = req.body;

    const form = await RPMESForm.findByPk(formId, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!form) {
      return res.status(404).json({ error: 'RPMES form not found' });
    }

    // Check edit permissions
    if (!form.canEdit(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. You cannot edit this form.' });
    }

    // Create new version if form is already submitted/approved
    if (['Submitted', 'Approved', 'Under Review'].includes(form.status) && status === 'Draft') {
      // Mark current version as not latest
      await form.update({ isLatest: false });
      
      // Create new version
      const newForm = await RPMESForm.create({
        projectId: form.projectId,
        submittedById: req.user.id,
        formType: form.formType,
        formCategory: form.formCategory,
        reportingYear: form.reportingYear,
        reportingPeriod: reportingPeriod || form.reportingPeriod,
        formData: formData || form.formData,
        editableBy: form.editableBy,
        viewableBy: form.viewableBy,
        previousVersionId: form.id,
        remarks: remarks || form.remarks,
        status: 'Draft'
      });

      return res.json({
        success: true,
        message: 'New version created successfully',
        form: {
          ...newForm.toJSON(),
          canEdit: newForm.canEdit(req.user.role),
          canView: newForm.canView(req.user.role)
        }
      });
    }

    // Update existing form
    const updateData = {};
    if (formData) updateData.formData = formData;
    if (reportingPeriod) updateData.reportingPeriod = reportingPeriod;
    if (remarks) updateData.remarks = remarks;
    if (status) updateData.status = status;
    if (status === 'Submitted') updateData.submissionDate = new Date();

    await form.update(updateData);

    res.json({
      success: true,
      message: 'RPMES form updated successfully',
      form: {
        ...form.toJSON(),
        canEdit: form.canEdit(req.user.role),
        canView: form.canView(req.user.role)
      }
    });
  } catch (error) {
    console.error('Error updating RPMES form:', error);
    res.status(500).json({ error: 'Failed to update RPMES form' });
  }
});

// Validate/Review RPMES form (LGU-PMT for Input forms, EMS for Output forms)
router.post('/:formId/validate', authenticateToken, requireRole(['LGU-PMT', 'EMS']), async (req, res) => {
  try {
    const { formId } = req.params;
    const { status, feedback } = req.body;

    const form = await RPMESForm.findByPk(formId);
    if (!form) {
      return res.status(404).json({ error: 'RPMES form not found' });
    }

    // Check validation permissions
    if (form.isInputForm() && req.user.role !== 'LGU-PMT') {
      return res.status(403).json({ error: 'Only LGU-PMT can validate Input Forms' });
    }
    if (form.isOutputForm() && req.user.role !== 'EMS') {
      return res.status(403).json({ error: 'Only EMS can validate Output Forms' });
    }

    await form.update({
      status,
      validatedById: req.user.id,
      validatedAt: new Date(),
      feedback
    });

    res.json({
      success: true,
      message: 'RPMES form validation completed',
      form: {
        ...form.toJSON(),
        canEdit: form.canEdit(req.user.role),
        canView: form.canView(req.user.role)
      }
    });
  } catch (error) {
    console.error('Error validating RPMES form:', error);
    res.status(500).json({ error: 'Failed to validate RPMES form' });
  }
});

// Export RPMES form to Excel (EXACT LGU TEMPLATE FORMAT)
router.get('/:formId/export', authenticateToken, async (req, res) => {
  try {
    const { formId } = req.params;
    
    const form = await RPMESForm.findByPk(formId, {
      include: [
        { model: Project, as: 'project' },
        { model: User, as: 'submitter' },
        { model: User, as: 'validator' }
      ]
    });

    if (!form) {
      return res.status(404).json({ error: 'RPMES form not found' });
    }

    if (!form.canView(req.user.role)) {
      return res.status(403).json({ error: 'Access denied to this form' });
    }

    // Create Excel export using the service
    const excelService = new ExcelExportService();
    const workbook = await excelService.createRPMESWorkbook(form, form.project);
    
    // Generate filename according to LGU specification
    const filename = excelService.generateFilename(form, form.project);
    
    // Update export tracking
    await form.update({
      lastExportedAt: new Date(),
      exportCount: form.exportCount + 1
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting RPMES form:', error);
    res.status(500).json({ error: 'Failed to export RPMES form' });
  }
});

// Export grouped RPMES forms (Forms 1-4 or Forms 5-11)
router.get('/export/:projectId/:formGroup', authenticateToken, async (req, res) => {
  try {
    const { projectId, formGroup } = req.params;
    
    // Validate form group
    if (!['input', 'output'].includes(formGroup)) {
      return res.status(400).json({ error: 'Invalid form group. Must be "input" or "output"' });
    }

    // Check role-based access
    const isInputGroup = formGroup === 'input';
    if (isInputGroup && !['LGU-IU', 'SYS.AD'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only LGU-IU can export Input Forms (1-4)' });
    }
    if (!isInputGroup && !['LGU-PMT', 'EMS', 'SYS.AD'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only LGU-PMT can export Output Forms (5-11)' });
    }

    // Get project
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all forms for this project and group
    const formNumbers = isInputGroup ? [1, 2, 3, 4] : [5, 6, 7, 8, 9, 10, 11];
    const formTypes = formNumbers.map(num => `RPMES Form ${num}`);
    
    const forms = await RPMESForm.findAll({
      where: {
        projectId,
        formType: formTypes,
        isLatest: true
      },
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'validator', attributes: ['id', 'name', 'role'] }
      ],
      order: [['formType', 'ASC']]
    });

    // Create grouped export
    const excelService = new ExcelExportService();
    const { workbook, filename } = await excelService.exportGroupedForms(project, formGroup, forms);

    // Update export tracking for all forms
    for (const form of forms) {
      await form.update({
        lastExportedAt: new Date(),
        exportCount: form.exportCount + 1
      });
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting grouped RPMES forms:', error);
    res.status(500).json({ error: 'Failed to export grouped RPMES forms' });
  }
});

// Get RPMES form statistics
router.get('/stats/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const stats = await RPMESForm.findAll({
      where: { projectId, isLatest: true },
      attributes: [
        'formType',
        'formCategory',
        'status',
        'reportingYear',
        [RPMESForm.sequelize.fn('COUNT', RPMESForm.sequelize.col('id')), 'count']
      ],
      group: ['formType', 'formCategory', 'status', 'reportingYear']
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching RPMES stats:', error);
    res.status(500).json({ error: 'Failed to fetch RPMES statistics' });
  }
});

// Delete RPMES form (only draft forms by submitter)
router.delete('/:formId', authenticateToken, async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await RPMESForm.findByPk(formId);
    if (!form) {
      return res.status(404).json({ error: 'RPMES form not found' });
    }

    // Only allow deletion of draft forms by the submitter
    if (form.status !== 'Draft') {
      return res.status(400).json({ error: 'Only draft forms can be deleted' });
    }

    if (form.submittedById !== req.user.id) {
      return res.status(403).json({ error: 'Only the submitter can delete this form' });
    }

    await form.destroy();

    res.json({
      success: true,
      message: 'RPMES form deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RPMES form:', error);
    res.status(500).json({ error: 'Failed to delete RPMES form' });
  }
});

module.exports = router; 