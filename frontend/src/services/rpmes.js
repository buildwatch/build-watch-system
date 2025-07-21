import api from './api';

const rpmesService = {
  // Get all RPMES forms
  async getAllForms() {
    try {
      const response = await api.get('/api/rpmes');
      return response.data;
    } catch (error) {
      console.error('Error fetching RPMES forms:', error);
      throw error;
    }
  },

  // Get RPMES forms for a specific project
  async getProjectForms(projectId) {
    try {
      const response = await api.get(`/api/rpmes/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project RPMES forms:', error);
      throw error;
    }
  },

  // Get specific RPMES form
  async getForm(formId) {
    try {
      const response = await api.get(`/api/rpmes/${formId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RPMES form:', error);
      throw error;
    }
  },

  // Create new RPMES form
  async createForm(formData) {
    try {
      const response = await api.post('/api/rpmes', formData);
      return response.data;
    } catch (error) {
      console.error('Error creating RPMES form:', error);
      throw error;
    }
  },

  // Update RPMES form
  async updateForm(formId, formData) {
    try {
      const response = await api.put(`/api/rpmes/${formId}`, formData);
      return response.data;
    } catch (error) {
      console.error('Error updating RPMES form:', error);
      throw error;
    }
  },

  // Validate/Review RPMES form
  async validateForm(formId, validationData) {
    try {
      const response = await api.post(`/api/rpmes/${formId}/validate`, validationData);
      return response.data;
    } catch (error) {
      console.error('Error validating RPMES form:', error);
      throw error;
    }
  },

  // Export RPMES form to Excel
  async exportForm(formId) {
    try {
      const response = await api.get(`/api/rpmes/${formId}/export`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting RPMES form:', error);
      throw error;
    }
  },

  // Get RPMES statistics
  async getStats(projectId) {
    try {
      const response = await api.get(`/api/rpmes/stats/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching RPMES stats:', error);
      throw error;
    }
  },

  // Delete RPMES form
  async deleteForm(formId) {
    try {
      const response = await api.delete(`/api/rpmes/${formId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting RPMES form:', error);
      throw error;
    }
  },

  // Form metadata and validation rules
  getFormMetadata() {
    return {
      'RPMES Form 1': {
        title: 'Project Identification and Basic Information',
        category: 'Input',
        description: 'Basic project information and identification details',
        fields: [
          { name: 'projectName', label: 'Project Name', type: 'text', required: true },
          { name: 'projectCode', label: 'Project Code', type: 'text', required: true },
          { name: 'implementingOffice', label: 'Implementing Office', type: 'text', required: true },
          { name: 'projectLocation', label: 'Project Location', type: 'text', required: true },
          { name: 'projectDescription', label: 'Project Description', type: 'textarea', required: true },
          { name: 'startDate', label: 'Start Date', type: 'date', required: true },
          { name: 'targetCompletion', label: 'Target Completion', type: 'date', required: true },
          { name: 'totalBudget', label: 'Total Budget (PHP)', type: 'number', required: true },
          { name: 'fundingSource', label: 'Funding Source', type: 'text', required: true }
        ]
      },
      'RPMES Form 2': {
        title: 'Project Objectives and Expected Outputs',
        category: 'Input',
        description: 'Project objectives and expected deliverables',
        fields: [
          { name: 'mainObjective', label: 'Main Objective', type: 'textarea', required: true },
          { name: 'specificObjectives', label: 'Specific Objectives', type: 'textarea', required: true },
          { name: 'expectedOutputs', label: 'Expected Outputs', type: 'textarea', required: true },
          { name: 'targetBeneficiaries', label: 'Target Beneficiaries', type: 'textarea', required: true },
          { name: 'successIndicators', label: 'Success Indicators', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 3': {
        title: 'Project Implementation Details',
        category: 'Input',
        description: 'Implementation strategy and key activities',
        fields: [
          { name: 'implementationStrategy', label: 'Implementation Strategy', type: 'textarea', required: true },
          { name: 'keyActivities', label: 'Key Activities', type: 'textarea', required: true },
          { name: 'timeline', label: 'Timeline', type: 'textarea', required: true },
          { name: 'resourceRequirements', label: 'Resource Requirements', type: 'textarea', required: true },
          { name: 'riskMitigation', label: 'Risk Mitigation Measures', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 4': {
        title: 'Project Monitoring and Evaluation',
        category: 'Input',
        description: 'Monitoring mechanism and evaluation criteria',
        fields: [
          { name: 'monitoringMechanism', label: 'Monitoring Mechanism', type: 'textarea', required: true },
          { name: 'evaluationCriteria', label: 'Evaluation Criteria', type: 'textarea', required: true },
          { name: 'reportingSchedule', label: 'Reporting Schedule', type: 'textarea', required: true },
          { name: 'stakeholderInvolvement', label: 'Stakeholder Involvement', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 5': {
        title: 'Project Progress Report',
        category: 'Output',
        description: 'Progress summary and accomplishments',
        fields: [
          { name: 'reportingPeriod', label: 'Reporting Period', type: 'text', required: true },
          { name: 'physicalProgress', label: 'Physical Progress (%)', type: 'number', required: true, min: 0, max: 100 },
          { name: 'financialProgress', label: 'Financial Progress (%)', type: 'number', required: true, min: 0, max: 100 },
          { name: 'accomplishments', label: 'Accomplishments', type: 'textarea', required: true },
          { name: 'challenges', label: 'Challenges Encountered', type: 'textarea', required: false },
          { name: 'nextSteps', label: 'Next Steps', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 6': {
        title: 'Project Completion Report',
        category: 'Output',
        description: 'Final project completion details',
        fields: [
          { name: 'actualCompletionDate', label: 'Actual Completion Date', type: 'date', required: true },
          { name: 'finalPhysicalProgress', label: 'Final Physical Progress (%)', type: 'number', required: true, min: 0, max: 100 },
          { name: 'finalFinancialProgress', label: 'Final Financial Progress (%)', type: 'number', required: true, min: 0, max: 100 },
          { name: 'outputsDelivered', label: 'Outputs Delivered', type: 'textarea', required: true },
          { name: 'outcomesAchieved', label: 'Outcomes Achieved', type: 'textarea', required: true },
          { name: 'lessonsLearned', label: 'Lessons Learned', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 7': {
        title: 'Project Impact Assessment',
        category: 'Output',
        description: 'Project impact and beneficiary feedback',
        fields: [
          { name: 'impactAreas', label: 'Impact Areas', type: 'textarea', required: true },
          { name: 'beneficiaryFeedback', label: 'Beneficiary Feedback', type: 'textarea', required: true },
          { name: 'sustainabilityMeasures', label: 'Sustainability Measures', type: 'textarea', required: true },
          { name: 'recommendations', label: 'Recommendations', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 8': {
        title: 'Financial Report',
        category: 'Output',
        description: 'Financial status and budget utilization',
        fields: [
          { name: 'budgetUtilization', label: 'Budget Utilization Rate (%)', type: 'number', required: true, min: 0, max: 100 },
          { name: 'expenditures', label: 'Total Expenditures (PHP)', type: 'number', required: true },
          { name: 'remainingBudget', label: 'Remaining Budget (PHP)', type: 'number', required: true },
          { name: 'financialStatus', label: 'Financial Status', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 9': {
        title: 'Environmental Compliance Report',
        category: 'Output',
        description: 'Environmental impact and compliance measures',
        fields: [
          { name: 'environmentalImpact', label: 'Environmental Impact Assessment', type: 'textarea', required: true },
          { name: 'complianceMeasures', label: 'Compliance Measures', type: 'textarea', required: true },
          { name: 'mitigationActions', label: 'Mitigation Actions', type: 'textarea', required: true },
          { name: 'monitoringResults', label: 'Environmental Monitoring Results', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 10': {
        title: 'Social Impact Report',
        category: 'Output',
        description: 'Social benefits and community participation',
        fields: [
          { name: 'socialBenefits', label: 'Social Benefits Generated', type: 'textarea', required: true },
          { name: 'communityParticipation', label: 'Community Participation', type: 'textarea', required: true },
          { name: 'stakeholderSatisfaction', label: 'Stakeholder Satisfaction', type: 'textarea', required: true },
          { name: 'socialIndicators', label: 'Social Impact Indicators', type: 'textarea', required: true }
        ]
      },
      'RPMES Form 11': {
        title: 'Project Sustainability Report',
        category: 'Output',
        description: 'Sustainability factors and future recommendations',
        fields: [
          { name: 'sustainabilityFactors', label: 'Sustainability Factors', type: 'textarea', required: true },
          { name: 'maintenancePlan', label: 'Maintenance Plan', type: 'textarea', required: true },
          { name: 'capacityBuilding', label: 'Capacity Building Initiatives', type: 'textarea', required: true },
          { name: 'futureRecommendations', label: 'Future Recommendations', type: 'textarea', required: true }
        ]
      }
    };
  },

  // Get form types by category
  getFormTypesByCategory() {
    return {
      'Input': ['RPMES Form 1', 'RPMES Form 2', 'RPMES Form 3', 'RPMES Form 4'],
      'Output': ['RPMES Form 5', 'RPMES Form 6', 'RPMES Form 7', 'RPMES Form 8', 'RPMES Form 9', 'RPMES Form 10', 'RPMES Form 11']
    };
  },

  // Validate form data
  validateFormData(formType, formData) {
    const metadata = this.getFormMetadata()[formType];
    if (!metadata) {
      throw new Error(`Unknown form type: ${formType}`);
    }

    const errors = {};
    
    metadata.fields.forEach(field => {
      if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
        errors[field.name] = `${field.label} is required`;
      }
      
      if (field.type === 'number' && formData[field.name]) {
        const value = parseFloat(formData[field.name]);
        if (isNaN(value)) {
          errors[field.name] = `${field.label} must be a valid number`;
        } else if (field.min !== undefined && value < field.min) {
          errors[field.name] = `${field.label} must be at least ${field.min}`;
        } else if (field.max !== undefined && value > field.max) {
          errors[field.name] = `${field.label} must be at most ${field.max}`;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

export default rpmesService; 