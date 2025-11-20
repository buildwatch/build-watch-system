require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'buildwatch_123',
      database: process.env.DB_NAME || 'buildwatch_lgu',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'announcements' AND COLUMN_NAME IN ('createdBy', 'announcementType')
    `, [process.env.DB_NAME || 'buildwatch_lgu']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('Existing columns:', existingColumns);

    // Add createdBy if it doesn't exist
    if (!existingColumns.includes('createdBy')) {
      console.log('Adding createdBy column...');
      await connection.query(`
        ALTER TABLE announcements 
        ADD COLUMN createdBy CHAR(36) BINARY NULL,
        ADD CONSTRAINT fk_announcements_createdBy 
        FOREIGN KEY (createdBy) REFERENCES users(id) 
        ON UPDATE CASCADE ON DELETE SET NULL
      `);
      console.log('✅ Added createdBy column');
    } else {
      console.log('⚠️  createdBy column already exists');
    }

    // Check if announcementType enum exists
    const [typeColumn] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'announcementType'
    `, [process.env.DB_NAME || 'buildwatch_lgu']);

    if (typeColumn.length === 0) {
      console.log('Adding announcementType column...');
      await connection.query(`
        ALTER TABLE announcements 
        ADD COLUMN announcementType ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update') 
        NOT NULL DEFAULT 'general'
      `);
      console.log('✅ Added announcementType column');
    } else {
      console.log('⚠️  announcementType column already exists');
    }

    // Add indexes if they don't exist
    try {
      await connection.query(`
        CREATE INDEX idx_announcements_createdBy ON announcements(createdBy)
      `);
      console.log('✅ Added index on createdBy');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index idx_announcements_createdBy already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        CREATE INDEX idx_announcements_type ON announcements(announcementType)
      `);
      console.log('✅ Added index on announcementType');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index idx_announcements_type already exists');
      } else {
        throw err;
      }
    }

    // Mark migration as complete in SequelizeMeta
    try {
      await connection.query(`
        INSERT INTO SequelizeMeta (name) 
        VALUES ('20251109023614-add-announcement-fields.js')
        ON DUPLICATE KEY UPDATE name = name
      `);
      console.log('✅ Marked migration as complete');
    } catch (err) {
      console.log('⚠️  Could not update SequelizeMeta (table might not exist or already marked)');
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

