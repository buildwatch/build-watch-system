-- Add 'video' to the messages.type ENUM
-- This fixes the "Data truncated for column 'type'" error when sending videos

ALTER TABLE messages 
MODIFY COLUMN type ENUM('text', 'image', 'video', 'file', 'system') NOT NULL DEFAULT 'text';

