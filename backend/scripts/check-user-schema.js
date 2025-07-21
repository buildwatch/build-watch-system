const db = require('../models');

async function checkUserSchema() {
  try {
    const table = await db.sequelize.getQueryInterface().describeTable('users');
    console.log('Users table columns:');
    console.table(table);
  } catch (err) {
    console.error('Error describing users table:', err);
  } finally {
    process.exit(0);
  }
}

checkUserSchema(); 