const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CoordinationEvent = sequelize.define('CoordinationEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    eventType: {
      type: DataTypes.ENUM('meeting', 'field_inspection', 'deadline', 'training', 'review', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recurrencePattern: {
      type: DataTypes.JSON,
      allowNull: true
    },
    participantData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reminderDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'coordination_events',
    timestamps: true,
    paranoid: true
  });

  CoordinationEvent.associate = (models) => {
    CoordinationEvent.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    CoordinationEvent.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project'
    });
    
    CoordinationEvent.belongsToMany(models.User, {
      through: 'EventParticipants',
      foreignKey: 'eventId',
      otherKey: 'userId',
      as: 'eventParticipants'
    });
  };

  return CoordinationEvent;
}; 