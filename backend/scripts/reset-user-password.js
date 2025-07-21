const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const config = require('../config/database.js');

async function resetUserPassword(email, newPassword) {
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

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password and ensure account is active
    const [result] = await sequelize.query(
      `UPDATE users SET password = ?, status = 'active', accountLockout = 0, updatedAt = NOW() WHERE email = ?`,
      { replacements: [hashedPassword, email] }
    );

    if (result.affectedRows > 0 || result.changedRows > 0) {
      console.log(`✓ Successfully reset password for ${email}`);
      // Show user details after reset
      const [userResult] = await sequelize.query(
        `SELECT email, role, status, accountLockout, updatedAt FROM users WHERE email = ?`,
        { replacements: [email] }
      );
      if (userResult.length > 0) {
        const user = userResult[0];
        console.log('\nUser details after reset:');
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Status: ${user.status}`);
        console.log(`Account Lockout: ${user.accountLockout}`);
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

// Usage: node reset-user-password.js <email> <newPassword>
const email = process.argv[2] || 'pepitomanaloto@gmail.com';
const newPassword = process.argv[3] || 'password123';
resetUserPassword(email, newPassword); 