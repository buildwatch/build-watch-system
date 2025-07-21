const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    userId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    projectCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    enable2FA: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    accountLockout: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255]
      }
    },
    role: {
      type: DataTypes.ENUM('LGU-PMT', 'LGU-IU', 'EIU', 'EMS', 'SYS.AD'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    subRole: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'blocked', 'deactivated', 'deleted'),
      defaultValue: 'active',
      allowNull: false
    },
    idType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    idNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    group: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['email']
      }
      // Removed userId unique index to reduce total index count
      // Removed role and status indexes to reduce total index count
    ]
  });

  User.associate = (models) => {
    // User has many Projects (as implementing unit)
    User.hasMany(models.Project, {
      foreignKey: 'implementingUnitId',
      as: 'implementedProjects'
    });

    // User has many Project Updates
    User.hasMany(models.ProjectUpdate, {
      foreignKey: 'submittedById',
      as: 'submittedUpdates'
    });

    // User has many RPMES Forms
    User.hasMany(models.RPMESForm, {
      foreignKey: 'submittedById',
      as: 'submittedForms'
    });

    // User has many Monitoring Reports
    User.hasMany(models.MonitoringReport, {
      foreignKey: 'conductedById',
      as: 'conductedReports'
    });

    // User has many Site Visits
    User.hasMany(models.SiteVisit, {
      foreignKey: 'scheduledById',
      as: 'scheduledVisits'
    });

    // User belongs to many Site Visits (participants)
    User.belongsToMany(models.SiteVisit, {
      through: 'site_visit_participants',
      foreignKey: 'userId',
      otherKey: 'siteVisitId',
      as: 'participatedVisits'
    });

    // User has many Uploads
    User.hasMany(models.Upload, {
      foreignKey: 'uploadedById',
      as: 'uploads'
    });

    // User has many Activity Logs
    User.hasMany(models.ActivityLog, {
      foreignKey: 'userId',
      as: 'activityLogs'
    });

    // User has many Notifications
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications'
    });
  };

  return User;
}; 