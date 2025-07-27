const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('../config/database.js')[env];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Load all models
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file));
    // Check if model is a function (old format) or direct export (new format)
    if (typeof model === 'function') {
      // Try with both parameters first (for models that need DataTypes)
      try {
        const modelInstance = model(sequelize, Sequelize.DataTypes);
        db[modelInstance.name] = modelInstance;
      } catch (error) {
        // If that fails, try with just sequelize
        const modelInstance = model(sequelize);
        db[modelInstance.name] = modelInstance;
      }
    } else {
      // New format - model is already defined
      db[model.name] = model;
    }
  });

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Create junction table for site visit participants
const SiteVisitParticipant = sequelize.define('SiteVisitParticipant', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  siteVisitId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'site_visits',
      key: 'id'
    }
  },
  userId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: Sequelize.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'site_visit_participants',
  timestamps: true
});

db.SiteVisitParticipant = SiteVisitParticipant;

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 