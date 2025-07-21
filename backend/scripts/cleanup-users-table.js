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

async function cleanupUsersTable() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database successfully.');

    // Check if columns exist before trying to drop them
    const [results] = await sequelize.query("DESCRIBE users");
    const columns = results.map(row => row.Field);
    
    console.log('Current columns in users table:', columns);

    // Drop created_at and updated_at columns if they exist
    if (columns.includes('created_at')) {
      console.log('Dropping created_at column...');
      await sequelize.query('ALTER TABLE users DROP COLUMN created_at');
      console.log('✓ created_at column dropped');
    } else {
      console.log('created_at column does not exist');
    }

    if (columns.includes('updated_at')) {
      console.log('Dropping updated_at column...');
      await sequelize.query('ALTER TABLE users DROP COLUMN updated_at');
      console.log('✓ updated_at column dropped');
    } else {
      console.log('updated_at column does not exist');
    }

    // Verify the cleanup
    const [newResults] = await sequelize.query("DESCRIBE users");
    const newColumns = newResults.map(row => row.Field);
    console.log('Columns after cleanup:', newColumns);

    console.log('✓ Users table cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

cleanupUsersTable(); 