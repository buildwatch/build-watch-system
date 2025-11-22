-- Fix Missing Tables Script
-- This script creates all missing tables identified in the error logs
-- Run this on your production database to resolve the errors

USE buildwatch_lgu;

-- ============================================
-- 1. Create messages table
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) BINARY NOT NULL PRIMARY KEY,
  senderId CHAR(36) BINARY NOT NULL,
  recipientId CHAR(36) BINARY NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text', 'image', 'video', 'file', 'system') NOT NULL DEFAULT 'text',
  attachments JSON DEFAULT NULL,
  isRead BOOLEAN NOT NULL DEFAULT FALSE,
  readAt DATETIME DEFAULT NULL,
  deliveredAt DATETIME DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  reactions JSON DEFAULT NULL COMMENT 'Stores reactions as { emoji: [userId1, userId2, ...] }',
  projectId CHAR(36) BINARY DEFAULT NULL COMMENT 'Optional link to a project for project-aware messaging',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  INDEX idx_messages_sender_recipient (senderId, recipientId),
  INDEX idx_messages_recipient_read (recipientId, isRead),
  INDEX idx_messages_created_at (created_at),
  INDEX idx_messages_project (projectId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Create announcement_versions table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_versions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  version_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT DEFAULT NULL,
  priority ENUM('urgent', 'high', 'normal', 'low') NOT NULL,
  announcement_type ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update') NOT NULL,
  target_audience VARCHAR(50) NOT NULL,
  change_description TEXT DEFAULT NULL,
  changed_by CHAR(36) BINARY NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  
  INDEX idx_announcement_versions_announcement_id (announcement_id),
  INDEX idx_announcement_versions_changed_by (changed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Create announcement_approvals table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_approvals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  approval_level INT NOT NULL DEFAULT 1,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by CHAR(36) BINARY DEFAULT NULL,
  comments TEXT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id),
  
  INDEX idx_announcement_approvals_announcement_id (announcement_id),
  INDEX idx_announcement_approvals_approved_by (approved_by),
  INDEX idx_announcement_approvals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Create announcement_categories table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_by CHAR(36) BINARY DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Create announcement_tags table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_by CHAR(36) BINARY DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. Create announcement_category_mappings table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_category_mappings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES announcement_categories(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_announcement_category (announcement_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. Create announcement_tag_mappings table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_tag_mappings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  tag_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES announcement_tags(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_announcement_tag (announcement_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. Create announcement_notification_preferences table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_notification_preferences (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) BINARY NOT NULL UNIQUE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_new_announcement BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_update BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_comment BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_reaction BOOLEAN NOT NULL DEFAULT FALSE,
  priority_filter ENUM('all', 'urgent', 'high', 'urgent_high') NOT NULL DEFAULT 'all',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. Create announcement_templates table
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  contentHtml TEXT DEFAULT NULL,
  priority ENUM('urgent', 'high', 'normal', 'low') NOT NULL DEFAULT 'normal',
  announcementType ENUM('system_maintenance', 'system_update', 'general', 'project_related', 'policy_related', 'administration', 'project_update') NOT NULL DEFAULT 'general',
  targetAudience VARCHAR(50) NOT NULL DEFAULT 'all',
  requiresAcknowledgment BOOLEAN NOT NULL DEFAULT FALSE,
  isSystemTemplate BOOLEAN NOT NULL DEFAULT FALSE,
  createdBy CHAR(36) BINARY DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (createdBy) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  
  INDEX idx_templates_createdBy (createdBy),
  INDEX idx_templates_type (announcementType),
  INDEX idx_templates_system (isSystemTemplate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. Create deleted_project_comments table
-- ============================================
CREATE TABLE IF NOT EXISTS deleted_project_comments (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  originalCommentId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  projectId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  userId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  authorName VARCHAR(255) DEFAULT NULL,
  authorEmail VARCHAR(255) DEFAULT NULL,
  content TEXT NOT NULL,
  commentCreatedAt DATETIME NOT NULL,
  deletedBy CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  deletedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedFromIp VARCHAR(45) DEFAULT NULL,
  userAgent TEXT DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (deletedBy) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  INDEX idx_deleted_project_comments_project_id (projectId),
  INDEX idx_deleted_project_comments_user_id (userId),
  INDEX idx_deleted_project_comments_deleted_by (deletedBy),
  INDEX idx_deleted_project_comments_deleted_at (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Verification: Check which tables were created
-- ============================================
SELECT 'Tables created successfully!' AS status;
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'buildwatch_lgu' 
AND TABLE_NAME IN (
  'messages',
  'announcement_versions',
  'announcement_approvals',
  'announcement_categories',
  'announcement_tags',
  'announcement_category_mappings',
  'announcement_tag_mappings',
  'announcement_notification_preferences',
  'announcement_templates',
  'deleted_project_comments'
)
ORDER BY TABLE_NAME;

