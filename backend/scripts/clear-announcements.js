require('dotenv').config();
const mysql = require('mysql2/promise');

async function clearAnnouncements() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'buildwatch_123',
      database: process.env.DB_NAME || 'buildwatch_lgu'
    });

    console.log('✅ Connected to database');

    // Delete all announcements
    const [result] = await connection.query('DELETE FROM announcements');
    console.log(`🗑️  Deleted ${result.affectedRows} announcement(s)`);

    // Reset auto increment
    await connection.query('ALTER TABLE announcements AUTO_INCREMENT = 1');
    console.log('✅ Reset auto increment');

    console.log('🎉 All announcements cleared successfully!');

  } catch (error) {
    console.error('❌ Failed to clear announcements:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

clearAnnouncements();

