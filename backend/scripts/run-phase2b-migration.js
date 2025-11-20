const { Sequelize } = require('sequelize');
const config = require('../config/database.js').development;
const migration = require('../migrations/20251110000002-add-phase2b-features.js');

async function runMigration() {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const queryInterface = sequelize.getQueryInterface();

    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('announcements');
    const existingColumns = Object.keys(tableDescription);
    console.log('Existing columns:', existingColumns);

    // Run the up function of the migration
    await migration.up(queryInterface, Sequelize);
    console.log('🎉 Migration completed successfully!');

    // Manually record the migration in SequelizeMeta
    const [meta] = await queryInterface.sequelize.query(
      `SELECT * FROM SequelizeMeta WHERE name = '20251110000002-add-phase2b-features.js'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!meta) {
      await queryInterface.sequelize.query(
        `INSERT INTO SequelizeMeta (name) VALUES ('20251110000002-add-phase2b-features.js')`
      );
      console.log('✅ Marked migration as complete');
    } else {
      console.log('⚠️ Migration already marked as complete');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

runMigration();

