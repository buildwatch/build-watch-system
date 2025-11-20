require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'buildwatch_123',
      database: process.env.DB_NAME || 'buildwatch_lgu',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Check existing columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'announcements' 
      AND COLUMN_NAME IN ('contentHtml', 'requiresAcknowledgment', 'acknowledgmentDeadline')
    `, [process.env.DB_NAME || 'buildwatch_lgu']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    // Add contentHtml
    if (!existingColumns.includes('contentHtml')) {
      await connection.query(`ALTER TABLE announcements ADD COLUMN contentHtml TEXT NULL`);
      console.log('✅ Added contentHtml column');
    } else {
      console.log('⚠️  contentHtml column already exists');
    }

    // Add requiresAcknowledgment
    if (!existingColumns.includes('requiresAcknowledgment')) {
      await connection.query(`ALTER TABLE announcements ADD COLUMN requiresAcknowledgment BOOLEAN NOT NULL DEFAULT FALSE`);
      console.log('✅ Added requiresAcknowledgment column');
    } else {
      console.log('⚠️  requiresAcknowledgment column already exists');
    }

    // Add acknowledgmentDeadline
    if (!existingColumns.includes('acknowledgmentDeadline')) {
      await connection.query(`ALTER TABLE announcements ADD COLUMN acknowledgmentDeadline DATE NULL`);
      console.log('✅ Added acknowledgmentDeadline column');
    } else {
      console.log('⚠️  acknowledgmentDeadline column already exists');
    }

    // Create read_receipts table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS read_receipts (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          announcementId INT UNSIGNED NOT NULL,
          userId CHAR(36) BINARY NOT NULL,
          readAt DATETIME NULL,
          acknowledgedAt DATETIME NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          FOREIGN KEY (announcementId) REFERENCES announcements(id) ON UPDATE CASCADE ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
          UNIQUE KEY idx_read_receipts_unique (announcementId, userId),
          INDEX idx_read_receipts_announcementId (announcementId),
          INDEX idx_read_receipts_userId (userId)
        )
      `);
      console.log('✅ Created read_receipts table');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  read_receipts table already exists');
      } else {
        throw err;
      }
    }

    // Create announcement_attachments table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS announcement_attachments (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          announcementId INT UNSIGNED NOT NULL,
          fileName VARCHAR(255) NOT NULL,
          originalFileName VARCHAR(255) NOT NULL,
          filePath VARCHAR(500) NOT NULL,
          fileSize INT UNSIGNED NOT NULL,
          mimeType VARCHAR(100) NOT NULL,
          uploadedBy CHAR(36) BINARY NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          FOREIGN KEY (announcementId) REFERENCES announcements(id) ON UPDATE CASCADE ON DELETE CASCADE,
          FOREIGN KEY (uploadedBy) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          INDEX idx_attachments_announcementId (announcementId)
        )
      `);
      console.log('✅ Created announcement_attachments table');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  announcement_attachments table already exists');
      } else {
        throw err;
      }
    }

    // Mark migration as complete
    try {
      await connection.query(`
        INSERT INTO SequelizeMeta (name) 
        VALUES ('20251110000001-add-announcement-enhancements.js')
        ON DUPLICATE KEY UPDATE name = name
      `);
      console.log('✅ Marked migration as complete');
    } catch (err) {
      console.log('⚠️  Could not update SequelizeMeta');
    }

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();

