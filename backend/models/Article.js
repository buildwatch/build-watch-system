const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Article = sequelize.define('Article', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'LGU Communications Office'
    },
    publishDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('News', 'Announcement', 'Publication', 'Update', 'Event'),
      allowNull: false,
      defaultValue: 'News'
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Published', 'Archived'),
      allowNull: false,
      defaultValue: 'Published'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    externalUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'articles',
    timestamps: true,
    paranoid: true // Soft deletes
  });

  Article.associate = (models) => {
    // Articles can be associated with users (authors)
    Article.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'authorUser'
    });

    // Articles can be associated with projects
    Article.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'relatedProject'
    });
  };

  return Article;
}; 