module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define('Department', {
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
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    head: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'contact_number'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    tableName: 'Departments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Department.associate = (models) => {
    Department.hasMany(models.Group, {
      foreignKey: 'departmentId',
      as: 'groups'
    });
  };

  return Department;
}; 