const { Sequelize } = require('sequelize');
const config = require('../config/database.js');

async function updateUserSubRole(email, subRole) {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env];

  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Update the user's subRole
    const [result] = await sequelize.query(
      `UPDATE users SET subRole = ?, updatedAt = NOW() WHERE email = ?`,
      { replacements: [subRole, email] }
    );

    if (result.affectedRows > 0 || result.changedRows > 0) {
      console.log(`✓ Successfully updated subRole to '${subRole}' for ${email}`);
      
      // Show user details after update
      const [userResult] = await sequelize.query(
        `SELECT email, role, subRole, status, updatedAt FROM users WHERE email = ?`,
        { replacements: [email] }
      );
      if (userResult.length > 0) {
        const user = userResult[0];
        console.log('\nUser details after update:');
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`SubRole: ${user.subRole}`);
        console.log(`Status: ${user.status}`);
        console.log(`Last Updated: ${user.updatedAt}`);
      }
    } else {
      console.log(`✗ User ${email} not found in database or no changes made.`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Usage: node update-user-subrole.js <email> <subRole>
const email = process.argv[2] || 'kathleen@gmail.com';
const subRole = process.argv[3] || 'SECRETARIAT';
updateUserSubRole(email, subRole); 