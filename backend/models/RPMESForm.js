const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RPMESForm = sequelize.define('RPMESForm', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    submittedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    formType: {
      type: DataTypes.ENUM(
        'RPMES Form 1', 'RPMES Form 2', 'RPMES Form 3', 'RPMES Form 4',
        'RPMES Form 5', 'RPMES Form 6', 'RPMES Form 7', 'RPMES Form 8',
        'RPMES Form 9', 'RPMES Form 10', 'RPMES Form 11'
      ),
      allowNull: false
    },
    formCategory: {
      type: DataTypes.ENUM('Input', 'Output'),
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    reportingYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2020,
        max: 2030
      }
    },
    reportingPeriod: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    // Form-specific data structure
    formData: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    // Validation workflow
    status: {
      type: DataTypes.ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Pending'),
      defaultValue: 'Draft',
      allowNull: false
    },
    validatedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Version control
    isLatest: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    previousVersionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rpmes_forms',
        key: 'id'
      }
    },
    // Export tracking
    lastExportedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    exportCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Metadata
    submissionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Access control
    editableBy: {
      type: DataTypes.ENUM('LGU-IU', 'LGU-PMT', 'EMS', 'SYS.AD'),
      allowNull: false
    },
    viewableBy: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    }
  }, {
    tableName: 'rpmes_forms',
    timestamps: true,
    indexes: [
      {
        name: 'idx_rpmes_forms_project_id',
        fields: ['projectId']
      },
      {
        name: 'idx_rpmes_forms_submitted_by',
        fields: ['submittedById']
      },
      {
        name: 'idx_rpmes_forms_form_type',
        fields: ['formType']
      },
      {
        name: 'idx_rpmes_forms_form_category',
        fields: ['formCategory']
      },
      {
        name: 'idx_rpmes_forms_status',
        fields: ['status']
      },
      {
        name: 'idx_rpmes_forms_reporting_year',
        fields: ['reportingYear']
      },
      {
        name: 'idx_rpmes_forms_submission_date',
        fields: ['submissionDate']
      },
      {
        name: 'idx_rpmes_forms_is_latest',
        fields: ['isLatest']
      },
      {
        name: 'idx_rpmes_forms_editable_by',
        fields: ['editableBy']
      },
      {
        name: 'idx_rpmes_forms_project_type',
        fields: ['projectId', 'formType']
      },
      {
        name: 'idx_rpmes_forms_project_status',
        fields: ['projectId', 'status']
      },
      {
        name: 'idx_rpmes_forms_project_category',
        fields: ['projectId', 'formCategory']
      }
    ]
  });

  RPMESForm.associate = (models) => {
    // RPMESForm belongs to Project
    RPMESForm.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });

    // RPMESForm belongs to User (submitter)
    RPMESForm.belongsTo(models.User, {
      foreignKey: 'submittedById',
      as: 'submitter'
    });

    // RPMESForm belongs to User (validator)
    RPMESForm.belongsTo(models.User, {
      foreignKey: 'validatedById',
      as: 'validator'
    });

    // RPMESForm has many Uploads
    RPMESForm.hasMany(models.Upload, {
      foreignKey: 'rpmesFormId',
      as: 'attachments'
    });

    // Self-referencing for versioning
    RPMESForm.belongsTo(RPMESForm, {
      foreignKey: 'previousVersionId',
      as: 'previousVersion'
    });

    RPMESForm.hasMany(RPMESForm, {
      foreignKey: 'previousVersionId',
      as: 'nextVersions'
    });
  };

  // Instance methods
  RPMESForm.prototype.canEdit = function(userRole) {
    return this.editableBy === userRole;
  };

  RPMESForm.prototype.canView = function(userRole) {
    return this.editableBy === userRole || this.viewableBy.includes(userRole);
  };

  RPMESForm.prototype.isInputForm = function() {
    return ['RPMES Form 1', 'RPMES Form 2', 'RPMES Form 3', 'RPMES Form 4'].includes(this.formType);
  };

  RPMESForm.prototype.isOutputForm = function() {
    return ['RPMES Form 5', 'RPMES Form 6', 'RPMES Form 7', 'RPMES Form 8', 'RPMES Form 9', 'RPMES Form 10', 'RPMES Form 11'].includes(this.formType);
  };

  return RPMESForm;
}; 