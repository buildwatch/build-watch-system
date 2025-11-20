/**
 * Fix Phase 3A table column names from camelCase to snake_case
 * This script renames columns to match the model's underscored: true setting
 */

const db = require('../models');
const sequelize = db.sequelize;

async function fixColumnNames() {
  try {
    console.log('🔧 Starting column name fixes...\n');

    // Fix announcement_comments table
    console.log('📝 Fixing announcement_comments table...');
    
    // Check if table exists and has camelCase columns
    const [commentsTable] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'announcement_comments'
      AND COLUMN_NAME = 'announcementId'
    `);

    if (commentsTable.length > 0) {
      console.log('  - Renaming columns in announcement_comments...');
      
      await sequelize.query(`
        ALTER TABLE announcement_comments
        CHANGE COLUMN announcementId announcement_id INT UNSIGNED NOT NULL,
        CHANGE COLUMN userId user_id CHAR(36) BINARY NOT NULL,
        CHANGE COLUMN parentCommentId parent_comment_id INT UNSIGNED NULL,
        CHANGE COLUMN isEdited is_edited TINYINT(1) NOT NULL DEFAULT 0,
        CHANGE COLUMN isDeleted is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        CHANGE COLUMN editedAt edited_at DATETIME NULL,
        CHANGE COLUMN createdAt created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHANGE COLUMN updatedAt updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      
      console.log('  ✅ announcement_comments columns renamed');
    } else {
      console.log('  ℹ️  announcement_comments already has correct column names');
    }

    // Fix announcement_reactions table
    console.log('\n📝 Fixing announcement_reactions table...');
    
    const [reactionsTable] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'announcement_reactions'
      AND COLUMN_NAME = 'announcementId'
    `);

    if (reactionsTable.length > 0) {
      console.log('  - Renaming columns in announcement_reactions...');
      
      await sequelize.query(`
        ALTER TABLE announcement_reactions
        CHANGE COLUMN announcementId announcement_id INT UNSIGNED NOT NULL,
        CHANGE COLUMN userId user_id CHAR(36) BINARY NOT NULL,
        CHANGE COLUMN reactionType reaction_type ENUM('helpful', 'important', 'acknowledged', 'urgent') NOT NULL DEFAULT 'helpful',
        CHANGE COLUMN createdAt created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHANGE COLUMN updatedAt updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      
      console.log('  ✅ announcement_reactions columns renamed');
    } else {
      console.log('  ℹ️  announcement_reactions already has correct column names');
    }

    // Fix announcement_favorites table
    console.log('\n📝 Fixing announcement_favorites table...');
    
    const [favoritesTable] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'announcement_favorites'
      AND COLUMN_NAME = 'announcementId'
    `);

    if (favoritesTable.length > 0) {
      console.log('  - Renaming columns in announcement_favorites...');
      
      await sequelize.query(`
        ALTER TABLE announcement_favorites
        CHANGE COLUMN announcementId announcement_id INT UNSIGNED NOT NULL,
        CHANGE COLUMN userId user_id CHAR(36) BINARY NOT NULL,
        CHANGE COLUMN createdAt created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHANGE COLUMN updatedAt updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      
      console.log('  ✅ announcement_favorites columns renamed');
    } else {
      console.log('  ℹ️  announcement_favorites already has correct column names');
    }

    // Drop and recreate indexes with correct column names
    console.log('\n📝 Fixing indexes...');
    
    try {
      // Drop old indexes
      await sequelize.query(`DROP INDEX idx_announcement_comments_announcementId ON announcement_comments`);
      await sequelize.query(`DROP INDEX idx_announcement_comments_userId ON announcement_comments`);
      await sequelize.query(`DROP INDEX idx_announcement_comments_parentCommentId ON announcement_comments`);
      await sequelize.query(`DROP INDEX idx_announcement_comments_createdAt ON announcement_comments`);
    } catch (e) {
      // Indexes might not exist or have different names
    }
    
    try {
      // Create new indexes with correct column names
      await sequelize.query(`
        CREATE INDEX idx_announcement_comments_announcementId ON announcement_comments(announcement_id)
      `);
      await sequelize.query(`
        CREATE INDEX idx_announcement_comments_userId ON announcement_comments(user_id)
      `);
      await sequelize.query(`
        CREATE INDEX idx_announcement_comments_parentCommentId ON announcement_comments(parent_comment_id)
      `);
      await sequelize.query(`
        CREATE INDEX idx_announcement_comments_createdAt ON announcement_comments(created_at)
      `);
      console.log('  ✅ announcement_comments indexes recreated');
    } catch (e) {
      console.log('  ⚠️  Some indexes might already exist:', e.message);
    }

    try {
      // Drop old reaction indexes
      await sequelize.query(`DROP INDEX idx_announcement_reactions_announcementId ON announcement_reactions`);
      await sequelize.query(`DROP INDEX idx_announcement_reactions_userId ON announcement_reactions`);
      await sequelize.query(`DROP INDEX unique_user_reaction_per_announcement ON announcement_reactions`);
    } catch (e) {
      // Indexes might not exist
    }
    
    try {
      // Create new reaction indexes
      await sequelize.query(`
        CREATE INDEX idx_announcement_reactions_announcementId ON announcement_reactions(announcement_id)
      `);
      await sequelize.query(`
        CREATE INDEX idx_announcement_reactions_userId ON announcement_reactions(user_id)
      `);
      await sequelize.query(`
        CREATE UNIQUE INDEX unique_user_reaction_per_announcement 
        ON announcement_reactions(announcement_id, user_id, reaction_type)
      `);
      console.log('  ✅ announcement_reactions indexes recreated');
    } catch (e) {
      console.log('  ⚠️  Some indexes might already exist:', e.message);
    }

    try {
      // Drop old favorite indexes
      await sequelize.query(`DROP INDEX idx_announcement_favorites_announcementId ON announcement_favorites`);
      await sequelize.query(`DROP INDEX idx_announcement_favorites_userId ON announcement_favorites`);
      await sequelize.query(`DROP INDEX unique_user_favorite_per_announcement ON announcement_favorites`);
    } catch (e) {
      // Indexes might not exist
    }
    
    try {
      // Create new favorite indexes
      await sequelize.query(`
        CREATE INDEX idx_announcement_favorites_announcementId ON announcement_favorites(announcement_id)
      `);
      await sequelize.query(`
        CREATE INDEX idx_announcement_favorites_userId ON announcement_favorites(user_id)
      `);
      await sequelize.query(`
        CREATE UNIQUE INDEX unique_user_favorite_per_announcement 
        ON announcement_favorites(announcement_id, user_id)
      `);
      console.log('  ✅ announcement_favorites indexes recreated');
    } catch (e) {
      console.log('  ⚠️  Some indexes might already exist:', e.message);
    }

    console.log('\n✅ Column name fixes completed successfully!');
    console.log('🔄 Please restart your backend server for changes to take effect.');

  } catch (error) {
    console.error('❌ Error fixing column names:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixColumnNames();

