-- Fix Profile Picture URLs in Database
-- This script updates all localhost:3000 URLs to production URLs
-- Run: mysql -u root -p buildwatch_lgu < scripts/fix-profile-urls.sql

USE buildwatch_lgu;

-- Update profile picture URLs from localhost:3000 to production URL
UPDATE users 
SET profilePictureUrl = REPLACE(
  profilePictureUrl, 
  'http://localhost:3000', 
  'https://www.build-watch.com'
)
WHERE profilePictureUrl LIKE '%localhost:3000%';

-- Also handle any https://localhost:3000 (unlikely but possible)
UPDATE users 
SET profilePictureUrl = REPLACE(
  profilePictureUrl, 
  'https://localhost:3000', 
  'https://www.build-watch.com'
)
WHERE profilePictureUrl LIKE '%localhost:3000%';

-- Show updated count
SELECT 
  COUNT(*) as total_users_updated,
  'Profile picture URLs updated from localhost:3000 to production URL' as message
FROM users 
WHERE profilePictureUrl LIKE '%www.build-watch.com%';

-- Verify no localhost:3000 URLs remain
SELECT 
  COUNT(*) as remaining_localhost_urls,
  'Users still with localhost:3000 URLs (should be 0)' as message
FROM users 
WHERE profilePictureUrl LIKE '%localhost:3000%';

