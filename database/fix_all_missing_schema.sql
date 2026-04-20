-- ============================================================================
-- FIX ALL MISSING SCHEMA BASED ON RAILWAY ERROR LOGS
-- Run each command one by one in Railway to verify they work
-- ============================================================================

-- 1. ADD password_changed_at to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- 2. ADD is_suspended to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 3. ADD total_rating to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_rating DECIMAL(3,2) DEFAULT 0.00;

-- 4. ADD rating_count to users table  
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- 5. ADD skills_possessing to users table (array of text)
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills_possessing TEXT[] DEFAULT '{}';

-- 6. ADD skills_interested_in to users table (array of text)
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills_interested_in TEXT[] DEFAULT '{}';

-- 7. ADD user_id to otps table
ALTER TABLE otps ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 8. ADD user_id and matched_user_id to skill_matches table
ALTER TABLE skill_matches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE skill_matches ADD COLUMN IF NOT EXISTS matched_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 9. CREATE user_skills table (completely missing)
CREATE TABLE IF NOT EXISTS user_skills (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    years_of_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ADD is_read to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 11. ADD is_read to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 12. Add other missing columns to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_type VARCHAR(10) DEFAULT 'offer';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) DEFAULT 'online';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS time_commitment_hours INTEGER;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS time_commitment_period VARCHAR(20);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 1;

-- 13. Add missing columns to exchange_requests
ALTER TABLE exchange_requests ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE exchange_requests ADD COLUMN IF NOT EXISTS total_credits INTEGER;
ALTER TABLE exchange_requests ADD COLUMN IF NOT EXISTS escrow_credits INTEGER DEFAULT 0;
ALTER TABLE exchange_requests ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1;
ALTER TABLE exchange_requests ADD COLUMN IF NOT EXISTS message TEXT;

-- 14. Fix transactions table - rename credits column if needed or ensure it exists
-- First check current structure, then fix
DO $$
BEGIN
    -- If 'amount' column exists but 'credits' doesn't, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'transactions' AND column_name = 'amount')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'transactions' AND column_name = 'credits') THEN
        ALTER TABLE transactions RENAME COLUMN amount TO credits;
    END IF;
    
    -- If neither exists, add credits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name IN ('amount', 'credits')) THEN
        ALTER TABLE transactions ADD COLUMN credits NUMERIC(6,3) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 15. Verify user_skills was created
SELECT 'user_skills table exists: ' || EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_skills');
