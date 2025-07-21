const db = require('./models');

async function showCreateTable() {
  try {
    const [results] = await db.sequelize.query('SHOW CREATE TABLE users');
    console.log(results[0]['Create Table'] || results[0][Object.keys(results[0])[1]]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.sequelize.close();
  }
}

showCreateTable(); 