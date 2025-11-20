-- Create deleted_project_comments table to track comment deletion history
CREATE TABLE IF NOT EXISTS `deleted_project_comments` (
  `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `originalCommentId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `projectId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `authorName` VARCHAR(255) DEFAULT NULL,
  `authorEmail` VARCHAR(255) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `commentCreatedAt` DATETIME NOT NULL,
  `deletedBy` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `deletedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deletedFromIp` VARCHAR(45) DEFAULT NULL,
  `userAgent` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`deletedBy`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_deleted_project_comments_project_id` (`projectId`),
  INDEX `idx_deleted_project_comments_user_id` (`userId`),
  INDEX `idx_deleted_project_comments_deleted_by` (`deletedBy`),
  INDEX `idx_deleted_project_comments_deleted_at` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

