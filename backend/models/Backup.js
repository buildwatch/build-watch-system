module.exports = (sequelize, DataTypes) => {
  const Backup = sequelize.define('Backup', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('full', 'incremental', 'differential'),
      allowNull: false,
      defaultValue: 'full'
    },
    filePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'file_size'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Backups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Backup.associate = (models) => {
    Backup.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return Backup;
}; 