-- ============================================================================
-- CREATE ALL MISSING TABLES FOR NEXUS
-- Run this in your Railway database to fix all missing table errors
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- MISSING TABLE: user_skills (Referenced by User model)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_skills (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);

-- ============================================================================
-- MISSING COLUMN: users.password_changed_at (Referenced by User.findById)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- MISSING COLUMN: users.email_verified_at (Referenced in schema)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- MISSING COLUMN: users.active_sync_exchange_id (Referenced in schema)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'active_sync_exchange_id') THEN
        ALTER TABLE users ADD COLUMN active_sync_exchange_id UUID;
    END IF;
END $$;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT for active_sync_exchange_id (if exchange_cycles exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_cycles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'fk_users_active_sync_exchange') THEN
            ALTER TABLE users 
            ADD CONSTRAINT fk_users_active_sync_exchange 
            FOREIGN KEY (active_sync_exchange_id) REFERENCES exchange_cycles(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- UPDATE TRIGGERS for updated_at columns
-- ============================================================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to user_skills
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_skills_updated_at') THEN
        CREATE TRIGGER update_user_skills_updated_at
            BEFORE UPDATE ON user_skills
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- VERIFY ALL TABLES EXIST
-- ============================================================================
SELECT 
    table_name,
    CASE WHEN table_name IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
    ('users'),
    ('admins'),
    ('otps'),
    ('skill_categories'),
    ('skills'),
    ('exchange_requests'),
    ('exchange_sessions'),
    ('exchange_reviews'),
    ('exchange_cycles'),
    ('cycle_participants'),
    ('sync_exchange_sessions'),
    ('cycle_reviews'),
    ('transactions'),
    ('credit_purchases'),
    ('messages'),
    ('notifications'),
    ('skill_matches'),
    ('matching_preferences'),
    ('reports'),
    ('user_skills')
) AS tables(table_name);
