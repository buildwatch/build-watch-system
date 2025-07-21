module.exports = (sequelize, DataTypes) => {
  const Group = sequelize.define('Group', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'department_id'
    },
    leader: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    memberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'member_count'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    tableName: 'Groups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Group.associate = (models) => {
    Group.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
  };

  return Group;
}; 