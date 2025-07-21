const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'buildwatch_123',
  database: process.env.DB_NAME || 'buildwatch_lgu',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: console.log
});

async function cleanupDuplicateColumns() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database successfully.');

    // Define the duplicate columns to remove (camelCase versions)
    const columnsToRemove = [
      'subRole',
      'idType', 
      'idNumber',
      'contactNumber',
      'lastLoginAt',
      'passwordChangedAt',
      'resetPasswordToken',
      'resetPasswordExpires'
    ];

    console.log('Removing duplicate camelCase columns from users table...');

    for (const column of columnsToRemove) {
      try {
        await sequelize.query(`ALTER TABLE users DROP COLUMN ${column}`);
        console.log(`✓ Removed column: ${column}`);
      } catch (error) {
        if (error.message.includes('doesn\'t exist')) {
          console.log(`- Column ${column} doesn't exist (already removed)`);
        } else {
          console.log(`⚠ Error removing ${column}:`, error.message);
        }
      }
    }

    // Verify the cleanup
    const [results] = await sequelize.query("DESCRIBE users");
    const remainingColumns = results.map(row => row.Field);
    console.log('\nRemaining columns in users table:', remainingColumns.join(', '));

    console.log('\n✓ Duplicate column cleanup completed!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

cleanupDuplicateColumns(); 