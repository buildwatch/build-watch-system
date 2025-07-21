const db = require('../models');

async function dropAllTables() {
  try {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await db.sequelize.query("SHOW TABLES");
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      console.log('Dropping table:', tableName);
      await db.sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ All tables dropped.');
  } catch (err) {
    console.error('Error dropping tables:', err);
  } finally {
    process.exit(0);
  }
}

dropAllTables(); 