-- Migration: Change time_credits from INTEGER to DECIMAL(10,2)
-- This allows time credits to have 2 decimal places

-- Change time_credits column type to DECIMAL(10,2) and preserve DEFAULT 10
ALTER TABLE users 
ALTER COLUMN time_credits TYPE DECIMAL(10,2),
ALTER COLUMN time_credits SET DEFAULT 10.00;

-- Update the check constraint to work with decimal values
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_time_credits_check;

ALTER TABLE users 
ADD CONSTRAINT users_time_credits_check CHECK (time_credits >= 0);

-- Add comment
COMMENT ON COLUMN users.time_credits IS 'User time credits balance (supports 2 decimal places, default 10.00)';
