-- Add images column to project_comments table
-- This column stores JSON array of image URLs (max 2 images per comment)

ALTER TABLE `project_comments`
ADD COLUMN `images` JSON NULL DEFAULT NULL AFTER `isApproved`,
ADD INDEX `idx_project_comments_images` (`images`(255));

