-- Select the database first
USE buildwatch_lgu;

-- Add category column to projects table (ENUM type, not VARCHAR)
ALTER TABLE projects ADD COLUMN category ENUM('infrastructure', 'health', 'education', 'agriculture', 'social', 'environment', 'transportation') NULL AFTER description;

-- Add projectId column to articles table (UUID type, not INT)
ALTER TABLE articles ADD COLUMN projectId CHAR(36) NULL AFTER authorId;

-- Check the table structures
DESCRIBE projects;
DESCRIBE articles;

-- Check if there's data
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as article_count FROM articles;

-- Show sample users if they exist
SELECT id, username, email, role FROM users LIMIT 5;

