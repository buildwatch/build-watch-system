/**
 * Comprehensive Production Database Migration Script
 * This script adds all missing columns and tables needed for the latest codebase
 * Run this on the production server to fix database schema issues
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'buildwatch_123',
  database: process.env.DB_NAME || 'buildwatch_lgu',
  multipleStatements: true
};

async function runMigrations() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Database connection successful.\n');

    // ============================================
    // 1. Add notes column to projects table
    // ============================================
    console.log('📝 Checking projects.notes column...');
    const [projectsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME = 'notes'
    `, [DB_CONFIG.database]);

    if (projectsColumns.length === 0) {
      console.log('   Adding notes column to projects table...');
      await connection.query(`
        ALTER TABLE \`projects\`
        ADD COLUMN \`notes\` JSON NULL COMMENT 'Project notes and annotations array'
      `);
      console.log('   ✅ Added notes column to projects table\n');
    } else {
      console.log('   ⚠️  notes column already exists in projects table\n');
    }

    // ============================================
    // 2. Add lastLogoutAt column to users table
    // ============================================
    console.log('📝 Checking users.lastLogoutAt column...');
    const [usersColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'lastLogoutAt'
    `, [DB_CONFIG.database]);

    if (usersColumns.length === 0) {
      console.log('   Adding lastLogoutAt column to users table...');
      await connection.query(`
        ALTER TABLE \`users\`
        ADD COLUMN \`lastLogoutAt\` DATETIME DEFAULT NULL COMMENT 'Timestamp when user last logged out'
      `);
      console.log('   ✅ Added lastLogoutAt column to users table\n');
    } else {
      console.log('   ⚠️  lastLogoutAt column already exists in users table\n');
    }

    // ============================================
    // 3. Add contentHtml column to announcements table
    // ============================================
    console.log('📝 Checking announcements.contentHtml column...');
    const [announcementsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'announcements' 
      AND COLUMN_NAME = 'contentHtml'
    `, [DB_CONFIG.database]);

    if (announcementsColumns.length === 0) {
      console.log('   Adding contentHtml column to announcements table...');
      await connection.query(`
        ALTER TABLE \`announcements\`
        ADD COLUMN \`contentHtml\` TEXT NULL COMMENT 'Rich text HTML content'
      `);
      console.log('   ✅ Added contentHtml column to announcements table\n');
    } else {
      console.log('   ⚠️  contentHtml column already exists in announcements table\n');
    }

    // ============================================
    // 4. Add requiresAcknowledgment column to announcements table
    // ============================================
    console.log('📝 Checking announcements.requiresAcknowledgment column...');
    const [requiresAckColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'announcements' 
      AND COLUMN_NAME = 'requiresAcknowledgment'
    `, [DB_CONFIG.database]);

    if (requiresAckColumns.length === 0) {
      console.log('   Adding requiresAcknowledgment column to announcements table...');
      await connection.query(`
        ALTER TABLE \`announcements\`
        ADD COLUMN \`requiresAcknowledgment\` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether announcement requires acknowledgment'
      `);
      console.log('   ✅ Added requiresAcknowledgment column to announcements table\n');
    } else {
      console.log('   ⚠️  requiresAcknowledgment column already exists in announcements table\n');
    }

    // ============================================
    // 5. Add acknowledgmentDeadline column to announcements table
    // ============================================
    console.log('📝 Checking announcements.acknowledgmentDeadline column...');
    const [ackDeadlineColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'announcements' 
      AND COLUMN_NAME = 'acknowledgmentDeadline'
    `, [DB_CONFIG.database]);

    if (ackDeadlineColumns.length === 0) {
      console.log('   Adding acknowledgmentDeadline column to announcements table...');
      await connection.query(`
        ALTER TABLE \`announcements\`
        ADD COLUMN \`acknowledgmentDeadline\` DATE NULL COMMENT 'Deadline for acknowledgment'
      `);
      console.log('   ✅ Added acknowledgmentDeadline column to announcements table\n');
    } else {
      console.log('   ⚠️  acknowledgmentDeadline column already exists in announcements table\n');
    }

    // ============================================
    // 6. Create announcement_attachments table
    // ============================================
    console.log('📝 Checking announcement_attachments table...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'announcement_attachments'
    `, [DB_CONFIG.database]);

    if (tables.length === 0) {
      console.log('   Creating announcement_attachments table...');
      await connection.query(`
        CREATE TABLE \`announcement_attachments\` (
          \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`announcementId\` INT UNSIGNED NOT NULL,
          \`fileName\` VARCHAR(255) NOT NULL,
          \`originalFileName\` VARCHAR(255) NOT NULL,
          \`filePath\` VARCHAR(500) NOT NULL,
          \`fileSize\` INT UNSIGNED NOT NULL,
          \`mimeType\` VARCHAR(100) NOT NULL,
          \`uploadedBy\` CHAR(36) BINARY NULL,
          \`createdAt\` DATETIME NOT NULL,
          \`updatedAt\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_attachments_announcementId\` (\`announcementId\`),
          CONSTRAINT \`announcement_attachments_ibfk_1\` 
            FOREIGN KEY (\`announcementId\`) 
            REFERENCES \`announcements\` (\`id\`) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE,
          CONSTRAINT \`announcement_attachments_ibfk_2\` 
            FOREIGN KEY (\`uploadedBy\`) 
            REFERENCES \`users\` (\`id\`) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Created announcement_attachments table\n');
    } else {
      console.log('   ⚠️  announcement_attachments table already exists\n');
    }

    // ============================================
    // 7. Create read_receipts table (if needed)
    // ============================================
    console.log('📝 Checking read_receipts table...');
    const [readReceiptsTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'read_receipts'
    `, [DB_CONFIG.database]);

    if (readReceiptsTables.length === 0) {
      console.log('   Creating read_receipts table...');
      await connection.query(`
        CREATE TABLE \`read_receipts\` (
          \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`announcementId\` INT UNSIGNED NOT NULL,
          \`userId\` CHAR(36) BINARY NOT NULL,
          \`readAt\` DATETIME NULL,
          \`acknowledgedAt\` DATETIME NULL,
          \`createdAt\` DATETIME NOT NULL,
          \`updatedAt\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`idx_read_receipts_unique\` (\`announcementId\`, \`userId\`),
          INDEX \`idx_read_receipts_announcementId\` (\`announcementId\`),
          INDEX \`idx_read_receipts_userId\` (\`userId\`),
          CONSTRAINT \`read_receipts_ibfk_1\` 
            FOREIGN KEY (\`announcementId\`) 
            REFERENCES \`announcements\` (\`id\`) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE,
          CONSTRAINT \`read_receipts_ibfk_2\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\` (\`id\`) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Created read_receipts table\n');
    } else {
      console.log('   ⚠️  read_receipts table already exists\n');
    }

    // ============================================
    // 8. Create project_comments table
    // ============================================
    console.log('📝 Checking project_comments table...');
    const [projectCommentsTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'project_comments'
    `, [DB_CONFIG.database]);

    if (projectCommentsTables.length === 0) {
      console.log('   Creating project_comments table...');
      await connection.query(`
        CREATE TABLE \`project_comments\` (
          \`id\` CHAR(36) NOT NULL,
          \`projectId\` CHAR(36) NOT NULL,
          \`authorName\` VARCHAR(255) NULL DEFAULT 'Anonymous',
          \`authorEmail\` VARCHAR(255) NULL,
          \`userId\` CHAR(36) NULL,
          \`content\` TEXT NOT NULL,
          \`isAnonymous\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`images\` JSON NULL,
          \`likes\` INT NOT NULL DEFAULT 0,
          \`isApproved\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_project_comments_project_id\` (\`projectId\`),
          INDEX \`idx_project_comments_user_id\` (\`userId\`),
          INDEX \`idx_project_comments_created_at\` (\`createdAt\`),
          INDEX \`idx_project_comments_is_approved\` (\`isApproved\`),
          CONSTRAINT \`project_comments_ibfk_1\` 
            FOREIGN KEY (\`projectId\`) 
            REFERENCES \`projects\` (\`id\`) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE,
          CONSTRAINT \`project_comments_ibfk_2\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\` (\`id\`) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Created project_comments table\n');
    } else {
      console.log('   ⚠️  project_comments table already exists\n');
    }

    // ============================================
    // 9. Create project_comment_reactions table
    // ============================================
    console.log('📝 Checking project_comment_reactions table...');
    const [reactionsTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'project_comment_reactions'
    `, [DB_CONFIG.database]);

    if (reactionsTables.length === 0) {
      console.log('   Creating project_comment_reactions table...');
      await connection.query(`
        CREATE TABLE \`project_comment_reactions\` (
          \`id\` CHAR(36) NOT NULL,
          \`commentId\` CHAR(36) NOT NULL,
          \`userId\` CHAR(36) NULL,
          \`sessionId\` VARCHAR(255) NULL,
          \`reactionType\` ENUM('like', 'heart') NOT NULL DEFAULT 'like',
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_project_comment_reactions_comment_id\` (\`commentId\`),
          INDEX \`idx_project_comment_reactions_user_id\` (\`userId\`),
          INDEX \`idx_project_comment_reactions_session_id\` (\`sessionId\`),
          CONSTRAINT \`project_comment_reactions_ibfk_1\` 
            FOREIGN KEY (\`commentId\`) 
            REFERENCES \`project_comments\` (\`id\`) 
            ON DELETE CASCADE 
            ON UPDATE CASCADE,
          CONSTRAINT \`project_comment_reactions_ibfk_2\` 
            FOREIGN KEY (\`userId\`) 
            REFERENCES \`users\` (\`id\`) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ Created project_comment_reactions table\n');
    } else {
      console.log('   ⚠️  project_comment_reactions table already exists\n');
    }

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ projects.notes column');
    console.log('   ✅ users.lastLogoutAt column');
    console.log('   ✅ announcements.contentHtml column');
    console.log('   ✅ announcements.requiresAcknowledgment column');
    console.log('   ✅ announcements.acknowledgmentDeadline column');
    console.log('   ✅ announcement_attachments table');
    console.log('   ✅ read_receipts table');
    console.log('   ✅ project_comments table');
    console.log('   ✅ project_comment_reactions table');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

