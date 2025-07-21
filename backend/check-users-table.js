const db = require('./models');

async function checkUsersTable() {
  try {
    const [results] = await db.sequelize.query('DESCRIBE users');
    console.log('Users table structure:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.sequelize.close();
  }
}

checkUsersTable(); 