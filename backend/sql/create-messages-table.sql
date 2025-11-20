-- Create messages table for real-time messaging system
-- This table stores individual messages between users

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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  
  INDEX idx_messages_sender_recipient (senderId, recipientId),
  INDEX idx_messages_recipient_read (recipientId, isRead),
  INDEX idx_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

