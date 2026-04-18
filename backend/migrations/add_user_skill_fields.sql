-- Migration: Add skills_possessing and skills_interested_in columns to users table
-- This allows users to specify skills they can offer and skills they want to learn

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS skills_possessing TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS skills_interested_in TEXT[] DEFAULT '{}';

-- Add index for better search performance on skills
CREATE INDEX IF NOT EXISTS idx_users_skills_possessing ON users USING GIN (skills_possessing);
CREATE INDEX IF NOT EXISTS idx_users_skills_interested_in ON users USING GIN (skills_interested_in);

-- Add comment to document the columns
COMMENT ON COLUMN users.skills_possessing IS 'Array of skills the user can offer/teach to others';
COMMENT ON COLUMN users.skills_interested_in IS 'Array of skills the user wants to learn from others';
