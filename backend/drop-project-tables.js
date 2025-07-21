const { Sequelize } = require('sequelize');
const config = require('./config/config.json').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect
});

async function dropProjectTables() {
  const tables = [
    'project_feedback',
    'project_issues',
    'project_milestones',
    'project_updates',
    'projects'
  ];
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`Dropped table: ${table}`);
      } catch (err) {
        console.error(`Error dropping table ${table}:`, err.message);
      }
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err) {
    console.error('Error disabling/enabling foreign key checks:', err.message);
  } finally {
    await sequelize.close();
  }
}

dropProjectTables(); 