-- Add lastLogoutAt column to users table
ALTER TABLE users
ADD COLUMN lastLogoutAt DATETIME DEFAULT NULL COMMENT 'Timestamp when user last logged out';

