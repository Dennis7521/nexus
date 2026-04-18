-- Add transcript_url column to users table
-- This will store the path to uploaded academic transcripts

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS transcript_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.transcript_url IS 'Path to uploaded academic transcript (PDF)';
