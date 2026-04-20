-- ============================================================================
-- ADD ALL MISSING COLUMNS TO EXISTING TABLES
-- This fixes 500 errors by ensuring all columns referenced in code exist
-- ============================================================================

-- ============================================================================
-- MESSAGES TABLE - Missing is_read column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_read column to messages table';
    END IF;
END $$;

-- ============================================================================
-- SKILLS TABLE - Missing columns
-- ============================================================================
DO $$
BEGIN
    -- is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'is_active') THEN
        ALTER TABLE skills ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to skills table';
    END IF;
    
    -- rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'rating') THEN
        ALTER TABLE skills ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5);
        RAISE NOTICE 'Added rating column to skills table';
    END IF;
    
    -- skill_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'skill_type') THEN
        ALTER TABLE skills ADD COLUMN skill_type VARCHAR(10) DEFAULT 'offer' CHECK (skill_type IN ('offer', 'request'));
        RAISE NOTICE 'Added skill_type column to skills table';
    END IF;
    
    -- difficulty_level column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'difficulty_level') THEN
        ALTER TABLE skills ADD COLUMN difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
        RAISE NOTICE 'Added difficulty_level column to skills table';
    END IF;
    
    -- location_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'location_type') THEN
        ALTER TABLE skills ADD COLUMN location_type VARCHAR(20) DEFAULT 'online' CHECK (location_type IN ('online', 'in_person', 'hybrid'));
        RAISE NOTICE 'Added location_type column to skills table';
    END IF;
    
    -- time_commitment_hours column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'time_commitment_hours') THEN
        ALTER TABLE skills ADD COLUMN time_commitment_hours INTEGER CHECK (time_commitment_hours > 0);
        RAISE NOTICE 'Added time_commitment_hours column to skills table';
    END IF;
    
    -- time_commitment_period column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'time_commitment_period') THEN
        ALTER TABLE skills ADD COLUMN time_commitment_period VARCHAR(20) CHECK (time_commitment_period IN ('week', 'month', 'total'));
        RAISE NOTICE 'Added time_commitment_period column to skills table';
    END IF;
    
    -- max_students column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'max_students') THEN
        ALTER TABLE skills ADD COLUMN max_students INTEGER DEFAULT 1 CHECK (max_students > 0);
        RAISE NOTICE 'Added max_students column to skills table';
    END IF;
    
    -- background_image column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'background_image') THEN
        ALTER TABLE skills ADD COLUMN background_image TEXT;
        RAISE NOTICE 'Added background_image column to skills table';
    END IF;
    
    -- category_id column (foreign key to skill_categories)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'skills' AND column_name = 'category_id') THEN
        ALTER TABLE skills ADD COLUMN category_id INTEGER REFERENCES skill_categories(id);
        RAISE NOTICE 'Added category_id column to skills table';
    END IF;
END $$;

-- ============================================================================
-- EXCHANGE_REQUESTS TABLE - Missing columns
-- ============================================================================
DO $$
BEGIN
    -- status column with proper check constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'exchange_requests' AND column_name = 'status') THEN
        ALTER TABLE exchange_requests ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled'));
        RAISE NOTICE 'Added status column to exchange_requests table';
    END IF;
    
    -- total_credits column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'exchange_requests' AND column_name = 'total_credits') THEN
        ALTER TABLE exchange_requests ADD COLUMN total_credits INTEGER CHECK (total_credits > 0);
        RAISE NOTICE 'Added total_credits column to exchange_requests table';
    END IF;
    
    -- escrow_credits column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'exchange_requests' AND column_name = 'escrow_credits') THEN
        ALTER TABLE exchange_requests ADD COLUMN escrow_credits INTEGER DEFAULT 0;
        RAISE NOTICE 'Added escrow_credits column to exchange_requests table';
    END IF;
    
    -- session_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'exchange_requests' AND column_name = 'session_count') THEN
        ALTER TABLE exchange_requests ADD COLUMN session_count INTEGER DEFAULT 1 CHECK (session_count > 0);
        RAISE NOTICE 'Added session_count column to exchange_requests table';
    END IF;
    
    -- message column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'exchange_requests' AND column_name = 'message') THEN
        ALTER TABLE exchange_requests ADD COLUMN message TEXT;
        RAISE NOTICE 'Added message column to exchange_requests table';
    END IF;
END $$;

-- ============================================================================
-- USERS TABLE - Missing columns
-- ============================================================================
DO $$
BEGIN
    -- email_verified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added email_verified column to users table';
    END IF;
    
    -- email_verified_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
        RAISE NOTICE 'Added email_verified_at column to users table';
    END IF;
    
    -- must_change_password column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'must_change_password') THEN
        ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added must_change_password column to users table';
    END IF;
    
    -- password_changed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
        RAISE NOTICE 'Added password_changed_at column to users table';
    END IF;
    
    -- total_rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'total_rating') THEN
        ALTER TABLE users ADD COLUMN total_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (total_rating >= 0 AND total_rating <= 5);
        RAISE NOTICE 'Added total_rating column to users table';
    END IF;
    
    -- rating_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'rating_count') THEN
        ALTER TABLE users ADD COLUMN rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0);
        RAISE NOTICE 'Added rating_count column to users table';
    END IF;
    
    -- is_suspended column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_suspended') THEN
        ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_suspended column to users table';
    END IF;
    
    -- active_sync_exchange_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'active_sync_exchange_id') THEN
        ALTER TABLE users ADD COLUMN active_sync_exchange_id UUID;
        RAISE NOTICE 'Added active_sync_exchange_id column to users table';
    END IF;
    
    -- skills_possessing column (array of skill names)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'skills_possessing') THEN
        ALTER TABLE users ADD COLUMN skills_possessing TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added skills_possessing column to users table';
    END IF;
    
    -- skills_interested_in column (array of skill names)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'skills_interested_in') THEN
        ALTER TABLE users ADD COLUMN skills_interested_in TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added skills_interested_in column to users table';
    END IF;
END $$;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT for users.active_sync_exchange_id
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_cycles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'fk_users_active_sync_exchange') THEN
            ALTER TABLE users 
            ADD CONSTRAINT fk_users_active_sync_exchange 
            FOREIGN KEY (active_sync_exchange_id) REFERENCES exchange_cycles(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for users.active_sync_exchange_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- NOTIFICATIONS TABLE - is_read column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_read column to notifications table';
    END IF;
END $$;

-- ============================================================================
-- TRANSACTIONS TABLE - Fix column types
-- ============================================================================
DO $$
BEGIN
    -- Ensure credits column exists (might be different from earlier schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'credits') THEN
        ALTER TABLE transactions ADD COLUMN credits NUMERIC(6,3) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added credits column to transactions table';
    END IF;
END $$;

-- ============================================================================
-- VERIFY ALL FIXES
-- ============================================================================
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('users', 'skills', 'messages', 'exchange_requests', 'notifications', 'transactions')
ORDER BY table_name, ordinal_position;
