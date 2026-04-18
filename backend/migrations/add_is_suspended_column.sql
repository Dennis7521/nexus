-- Add is_suspended column to users table for admin account suspension feature
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Add index for faster queries on suspended users
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
