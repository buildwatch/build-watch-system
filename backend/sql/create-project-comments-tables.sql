-- Create project_comments table
CREATE TABLE IF NOT EXISTS `project_comments` (
  `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `projectId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `authorName` VARCHAR(255) DEFAULT 'Anonymous',
  `authorEmail` VARCHAR(255) DEFAULT NULL,
  `userId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `content` TEXT NOT NULL,
  `isAnonymous` BOOLEAN DEFAULT TRUE NOT NULL,
  `likes` INT DEFAULT 0 NOT NULL,
  `isApproved` BOOLEAN DEFAULT TRUE NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_project_comments_project_id` (`projectId`),
  INDEX `idx_project_comments_user_id` (`userId`),
  INDEX `idx_project_comments_created_at` (`createdAt`),
  INDEX `idx_project_comments_is_approved` (`isApproved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create project_comment_reactions table
CREATE TABLE IF NOT EXISTS `project_comment_reactions` (
  `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `commentId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `sessionId` VARCHAR(255) DEFAULT NULL,
  `reactionType` ENUM('like', 'heart') DEFAULT 'like' NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`commentId`) REFERENCES `project_comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_project_comment_reactions_comment_id` (`commentId`),
  INDEX `idx_project_comment_reactions_user_id` (`userId`),
  INDEX `idx_project_comment_reactions_session_id` (`sessionId`),
  UNIQUE KEY `unique_reaction` (`commentId`, `userId`, `sessionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

