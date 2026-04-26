-- ============================================================================
-- NEXUS Database Schema
-- PostgreSQL database schema for the skill exchange platform
-- Last updated: 2026-04-26
--
-- This file represents the COMPLETE current schema, incorporating the base
-- tables plus all migrations from backend/migrations/ and database/migrations/.
-- ============================================================================

-- Create database (run this separately)
--CREATE DATABASE nexus_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS & AUTH
-- ============================================================================

-- Users table
-- NOTE: User ID 00000000-0000-0000-0000-000000000000 is reserved for NEXUS Admin system messages
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    degree_program VARCHAR(200),
    year_of_study INTEGER CHECK (year_of_study >= 1 AND year_of_study <= 6),
    profile_picture_url VARCHAR(500),
    transcript_url TEXT,
    time_credits DECIMAL(10,2) CHECK (time_credits >= 0),
    total_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (total_rating >= 0 AND total_rating <= 5),
    rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
    skills_possessing TEXT[] DEFAULT '{}',
    skills_interested_in TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_suspended BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    must_change_password BOOLEAN DEFAULT false,
    active_sync_exchange_id UUID, -- FK added after exchange_cycles is created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin accounts
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- OTP codes for email verification
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'email_verification',
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. SKILLS
-- ============================================================================

-- Skill categories
CREATE TABLE skill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skill listings (offers and requests)
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    category_id INTEGER REFERENCES skill_categories(id),
    skill_type VARCHAR(10) DEFAULT 'offer' CHECK (skill_type IN ('offer', 'request')),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_per_week VARCHAR(100),
    time_commitment_hours INTEGER CHECK (time_commitment_hours > 0),
    time_commitment_period VARCHAR(20) CHECK (time_commitment_period IN ('week', 'month', 'total')),
    location VARCHAR(200),
    prerequisites TEXT,
    tags TEXT[],
    credits_required INTEGER DEFAULT 0 CHECK (credits_required >= 0),
    background_image TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. ASYNC EXCHANGES (One-to-One, Credit-Based)
-- ============================================================================

-- Exchange requests with escrow tracking
CREATE TABLE exchange_requests (
    id SERIAL PRIMARY KEY,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled', 'terminated', 'disputed')),
    message TEXT,
    total_credits NUMERIC(6,2) DEFAULT 0,
    escrow_credits NUMERIC(6,2) DEFAULT 0,
    session_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exchange sessions with verification and monitoring
CREATE TABLE exchange_sessions (
    id SERIAL PRIMARY KEY,
    exchange_request_id INTEGER REFERENCES exchange_requests(id) ON DELETE CASCADE,
    session_index INTEGER NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    credit_share NUMERIC(6,3) NOT NULL,
    verification_code VARCHAR(12) NOT NULL,
    code_attempts INTEGER DEFAULT 0,
    mentor_confirmed BOOLEAN DEFAULT FALSE,
    mentor_confirmed_at TIMESTAMP WITH TIME ZONE,
    learner_confirmed BOOLEAN DEFAULT FALSE,
    learner_confirmed_at TIMESTAMP WITH TIME ZONE,
    session_notes TEXT,
    topics_covered TEXT[],
    meeting_link TEXT,
    learner_rating INTEGER CHECK (learner_rating BETWEEN 1 AND 5),
    learner_review TEXT,
    status VARCHAR(20) DEFAULT 'scheduled',
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Session monitoring columns
    mentor_joined_at TIMESTAMP WITH TIME ZONE,
    learner_joined_at TIMESTAMP WITH TIME ZONE,
    actual_started_at TIMESTAMP WITH TIME ZONE,
    actual_ended_at TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_request_id, session_index)
);

-- Post-exchange reviews (learner reviews instructor)
CREATE TABLE exchange_reviews (
    id SERIAL PRIMARY KEY,
    exchange_request_id INTEGER NOT NULL REFERENCES exchange_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_title VARCHAR(200),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_request_id, reviewer_id)
);

-- ============================================================================
-- 4. SYNC EXCHANGES (Multi-Party Cycles, Credit-Free)
-- ============================================================================

-- Exchange cycles (multi-party matching)
CREATE TABLE exchange_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_length INTEGER NOT NULL CHECK (cycle_length >= 2 AND cycle_length <= 5),
    cycle_score INTEGER NOT NULL CHECK (cycle_score >= 0 AND cycle_score <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'proposed'
        CHECK (status IN ('proposed', 'pending', 'active', 'completed', 'rejected')),
    cycle_data JSONB NOT NULL,
    total_participants INTEGER NOT NULL,
    accepted_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    exchange_mode VARCHAR(20) NOT NULL DEFAULT 'sync' CHECK (exchange_mode IN ('sync', 'credit')),
    session_count INTEGER NOT NULL DEFAULT 5,
    current_session_index INTEGER NOT NULL DEFAULT 0,
    pair_session_counts JSONB,
    proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_acceptance_count CHECK (accepted_count <= total_participants),
    CONSTRAINT valid_rejection_count CHECK (rejected_count <= total_participants)
);

-- Add FK from users to exchange_cycles now that the table exists
ALTER TABLE users
    ADD CONSTRAINT fk_users_active_sync_exchange
    FOREIGN KEY (active_sync_exchange_id) REFERENCES exchange_cycles(id) ON DELETE SET NULL;

-- Cycle participants
CREATE TABLE cycle_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_in_cycle INTEGER NOT NULL CHECK (position_in_cycle >= 0),
    skill_offering VARCHAR(255) NOT NULL,
    skill_receiving VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_cycle_participant UNIQUE (cycle_id, user_id)
);

-- Sync exchange sessions (multi-party)
CREATE TABLE sync_exchange_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
    session_index INTEGER NOT NULL,
    skill_pair_index INTEGER,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 60,
    meeting_link TEXT,
    topics_covered TEXT[],
    verification_code VARCHAR(12) NOT NULL,
    confirmations JSONB NOT NULL DEFAULT '{}',
    session_notes TEXT,
    ratings JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    -- Session monitoring columns
    join_timestamps JSONB DEFAULT '{}',
    actual_started_at TIMESTAMP WITH TIME ZONE,
    actual_ended_at TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    meeting_ended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT sync_exchange_sessions_cycle_pair_index_unique
        UNIQUE (cycle_id, skill_pair_index, session_index)
);

-- Cycle reviews (sync exchange reviews, merged with exchange_reviews on profiles)
CREATE TABLE cycle_reviews (
    id SERIAL PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_title VARCHAR(200),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cycle_id, reviewer_id, reviewee_id)
);

-- ============================================================================
-- 5. CREDITS & TRANSACTIONS
-- ============================================================================

-- Credit transactions ledger
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    exchange_request_id INTEGER REFERENCES exchange_requests(id) ON DELETE SET NULL,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    credits NUMERIC(6,3) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stripe payment records
CREATE TABLE credit_purchases (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits_purchased INTEGER NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BWP',
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_session_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. COMMUNICATION
-- ============================================================================

-- Messages (exchange workspace chat + sync cycle group chat + admin messages)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    exchange_request_id INTEGER REFERENCES exchange_requests(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES exchange_cycles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. MATCHING
-- ============================================================================

-- Algorithmic match suggestions (async, one-to-one)
CREATE TABLE skill_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'suggested'
        CHECK (status IN ('suggested', 'contacted', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (learner_id != teacher_id)
);

-- User matching preferences
CREATE TABLE matching_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    prefer_async BOOLEAN DEFAULT TRUE,
    prefer_sync BOOLEAN DEFAULT TRUE,
    min_match_score INTEGER DEFAULT 50 CHECK (min_match_score >= 0 AND min_match_score <= 100),
    max_cycle_length INTEGER DEFAULT 3 CHECK (max_cycle_length >= 2 AND max_cycle_length <= 5),
    auto_suggest BOOLEAN DEFAULT TRUE,
    receive_cycle_notifications BOOLEAN DEFAULT TRUE,
    preferred_days TEXT[],
    preferred_times TEXT[],
    max_distance_km INTEGER,
    prefer_online BOOLEAN DEFAULT TRUE,
    prefer_in_person BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. MODERATION
-- ============================================================================

-- User reports
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange_id INTEGER REFERENCES exchange_requests(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_is_suspended ON users(is_suspended);
CREATE INDEX idx_users_must_change_password ON users(must_change_password);
CREATE INDEX idx_users_skills_possessing ON users USING GIN (skills_possessing);
CREATE INDEX idx_users_skills_interested_in ON users USING GIN (skills_interested_in);

-- Admins
CREATE INDEX idx_admins_username ON admins(username);

-- OTPs
CREATE INDEX idx_otps_email_purpose ON otps(email, purpose);
CREATE INDEX idx_otps_expires_at ON otps(expires_at);

-- Skills
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_category_id ON skills(category_id);
CREATE INDEX idx_skills_type ON skills(skill_type);
CREATE INDEX idx_skills_active ON skills(is_active);
CREATE INDEX idx_skills_difficulty ON skills(difficulty_level);
CREATE INDEX idx_skills_tags ON skills USING GIN(tags);

-- Exchange requests
CREATE INDEX idx_exchange_requests_requester ON exchange_requests(requester_id);
CREATE INDEX idx_exchange_requests_instructor ON exchange_requests(instructor_id);
CREATE INDEX idx_exchange_requests_skill ON exchange_requests(skill_id);
CREATE INDEX idx_exchange_requests_status ON exchange_requests(status);

-- Exchange sessions
CREATE INDEX idx_exchange_sessions_request ON exchange_sessions(exchange_request_id);
CREATE INDEX idx_exchange_sessions_status ON exchange_sessions(status);
CREATE INDEX idx_exchange_sessions_scheduled ON exchange_sessions(scheduled_at);
CREATE INDEX idx_exchange_sessions_monitoring ON exchange_sessions(status, scheduled_at)
    WHERE mentor_joined_at IS NOT NULL OR learner_joined_at IS NOT NULL;

-- Exchange reviews
CREATE INDEX idx_exchange_reviews_reviewee ON exchange_reviews(reviewee_id);
CREATE INDEX idx_exchange_reviews_exchange ON exchange_reviews(exchange_request_id);

-- Skill ratings
CREATE INDEX idx_skills_rating ON skills(user_id, rating_count) WHERE rating_count > 0;

-- Exchange cycles
CREATE INDEX idx_exchange_cycles_status ON exchange_cycles(status);
CREATE INDEX idx_exchange_cycles_length ON exchange_cycles(cycle_length);
CREATE INDEX idx_exchange_cycles_score ON exchange_cycles(cycle_score DESC);
CREATE INDEX idx_exchange_cycles_created ON exchange_cycles(created_at DESC);
CREATE INDEX idx_exchange_cycles_data ON exchange_cycles USING GIN (cycle_data);

-- Cycle participants
CREATE INDEX idx_cycle_participants_cycle ON cycle_participants(cycle_id);
CREATE INDEX idx_cycle_participants_user ON cycle_participants(user_id);
CREATE INDEX idx_cycle_participants_status ON cycle_participants(status);
CREATE INDEX idx_cycle_participants_user_status ON cycle_participants(user_id, status);

-- Sync exchange sessions
CREATE INDEX idx_sync_sessions_cycle ON sync_exchange_sessions(cycle_id);
CREATE INDEX idx_sync_sessions_status ON sync_exchange_sessions(status);
CREATE INDEX idx_sync_sessions_scheduled ON sync_exchange_sessions(scheduled_at);
CREATE INDEX idx_sync_sessions_skill_pair ON sync_exchange_sessions(cycle_id, skill_pair_index);
CREATE INDEX idx_sync_sessions_monitoring ON sync_exchange_sessions(status, scheduled_at);

-- Cycle reviews
CREATE INDEX idx_cycle_reviews_reviewee ON cycle_reviews(reviewee_id);
CREATE INDEX idx_cycle_reviews_cycle ON cycle_reviews(cycle_id);
CREATE INDEX idx_cycle_reviews_reviewer ON cycle_reviews(reviewer_id);

-- Credit purchases
CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX idx_credit_purchases_stripe_session ON credit_purchases(stripe_session_id);

-- Messages
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read);
CREATE INDEX idx_messages_cycle_id ON messages(cycle_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Skill matches
CREATE INDEX idx_skill_matches_learner ON skill_matches(learner_id);
CREATE INDEX idx_skill_matches_teacher ON skill_matches(teacher_id);
CREATE INDEX idx_skill_matches_skill ON skill_matches(skill_name);
CREATE INDEX idx_skill_matches_status ON skill_matches(status);
CREATE INDEX idx_skill_matches_score ON skill_matches(match_score DESC);
CREATE INDEX idx_skill_matches_learner_status ON skill_matches(learner_id, status);
CREATE UNIQUE INDEX idx_unique_match ON skill_matches(learner_id, teacher_id, skill_name)
    WHERE status NOT IN ('rejected', 'expired');

-- Matching preferences
CREATE INDEX idx_matching_preferences_user ON matching_preferences(user_id);

-- Reports
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE UNIQUE INDEX idx_unique_pending_report ON reports(reporter_id, reported_user_id, exchange_id)
    WHERE status = 'pending';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Exchange requests updated_at
CREATE OR REPLACE FUNCTION update_exchange_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_requests_updated_at
    BEFORE UPDATE ON exchange_requests
    FOR EACH ROW EXECUTE FUNCTION update_exchange_requests_updated_at();

-- Exchange cycles updated_at
CREATE OR REPLACE FUNCTION update_exchange_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exchange_cycles_updated_at
    BEFORE UPDATE ON exchange_cycles
    FOR EACH ROW EXECUTE FUNCTION update_exchange_cycles_updated_at();

-- Cycle participants updated_at
CREATE OR REPLACE FUNCTION update_cycle_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cycle_participants_updated_at
    BEFORE UPDATE ON cycle_participants
    FOR EACH ROW EXECUTE FUNCTION update_cycle_participants_updated_at();

-- Cycle acceptance count trigger
CREATE OR REPLACE FUNCTION update_cycle_acceptance_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        UPDATE exchange_cycles
        SET accepted_count = accepted_count + 1
        WHERE id = NEW.cycle_id;
    ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
        UPDATE exchange_cycles
        SET rejected_count = rejected_count + 1, status = 'rejected'
        WHERE id = NEW.cycle_id;
    END IF;
    -- Auto-activate cycle when all participants accept
    UPDATE exchange_cycles ec
    SET status = 'active', activated_at = CURRENT_TIMESTAMP
    WHERE ec.id = NEW.cycle_id
      AND ec.accepted_count = ec.total_participants
      AND ec.status = 'proposed';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cycle_acceptance
    AFTER UPDATE OF status ON cycle_participants
    FOR EACH ROW EXECUTE FUNCTION update_cycle_acceptance_count();

-- Enforce one active sync exchange per user
CREATE OR REPLACE FUNCTION check_single_active_sync_exchange()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users
        WHERE id = NEW.user_id
          AND active_sync_exchange_id IS NOT NULL
          AND active_sync_exchange_id <> NEW.cycle_id
    ) THEN
        RAISE EXCEPTION 'User can only participate in one active sync exchange at a time';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_single_sync_exchange
    BEFORE UPDATE OF status ON cycle_participants
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
    EXECUTE FUNCTION check_single_active_sync_exchange();

-- Update users.active_sync_exchange_id on cycle status change
CREATE OR REPLACE FUNCTION update_user_active_sync_exchange()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        UPDATE users u
        SET active_sync_exchange_id = NEW.id
        WHERE id IN (SELECT user_id FROM cycle_participants WHERE cycle_id = NEW.id);
    ELSIF NEW.status IN ('completed', 'rejected') AND OLD.status NOT IN ('completed', 'rejected') THEN
        UPDATE users u
        SET active_sync_exchange_id = NULL
        WHERE active_sync_exchange_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_active_sync
    AFTER UPDATE OF status ON exchange_cycles
    FOR EACH ROW EXECUTE FUNCTION update_user_active_sync_exchange();

-- Sync exchange sessions updated_at
CREATE OR REPLACE FUNCTION update_sync_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_sessions_updated_at
    BEFORE UPDATE ON sync_exchange_sessions
    FOR EACH ROW EXECUTE FUNCTION update_sync_sessions_updated_at();

-- Auto-update sync exchange progress on session completion
CREATE OR REPLACE FUNCTION update_sync_exchange_progress()
RETURNS TRIGGER AS $$
BEGIN
    DECLARE
        completed_count INTEGER;
        total_sessions INTEGER;
    BEGIN
        SELECT COUNT(*), MAX(session_index)
        INTO completed_count, total_sessions
        FROM sync_exchange_sessions
        WHERE cycle_id = NEW.cycle_id AND status = 'completed';

        UPDATE exchange_cycles
        SET current_session_index = completed_count
        WHERE id = NEW.cycle_id;

        IF completed_count = total_sessions THEN
            UPDATE exchange_cycles
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = NEW.cycle_id;
        END IF;
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sync_progress
    AFTER UPDATE OF status ON sync_exchange_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_sync_exchange_progress();

-- Skill-specific rating from both exchange_reviews and cycle_reviews
CREATE OR REPLACE FUNCTION update_skill_rating_from_review()
RETURNS TRIGGER AS $$
DECLARE
    skill_record RECORD;
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
    user_skill_avg DECIMAL(3,2);
    user_total_reviews INTEGER;
BEGIN
    SELECT s.id, s.user_id INTO skill_record
    FROM skills s
    WHERE s.user_id = NEW.reviewee_id
      AND LOWER(TRIM(s.title)) = LOWER(TRIM(NEW.skill_title))
    LIMIT 1;

    IF skill_record.id IS NOT NULL THEN
        SELECT
            COALESCE(AVG(rating::DECIMAL), 0),
            COUNT(*)
        INTO avg_rating, review_count
        FROM (
            SELECT rating FROM exchange_reviews
            WHERE reviewee_id = NEW.reviewee_id
              AND LOWER(TRIM(skill_title)) = LOWER(TRIM(NEW.skill_title))
            UNION ALL
            SELECT rating FROM cycle_reviews
            WHERE reviewee_id = NEW.reviewee_id
              AND LOWER(TRIM(skill_title)) = LOWER(TRIM(NEW.skill_title))
        ) skill_reviews;

        UPDATE skills
        SET rating = avg_rating, rating_count = review_count
        WHERE id = skill_record.id;
    END IF;

    SELECT
        COALESCE(AVG(rating), 0),
        COALESCE(SUM(rating_count), 0)
    INTO user_skill_avg, user_total_reviews
    FROM skills
    WHERE user_id = NEW.reviewee_id AND rating_count > 0;

    UPDATE users
    SET total_rating = user_skill_avg, rating_count = user_total_reviews
    WHERE id = NEW.reviewee_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skill_rating_on_exchange_review
    AFTER INSERT OR UPDATE ON exchange_reviews
    FOR EACH ROW EXECUTE FUNCTION update_skill_rating_from_review();

CREATE TRIGGER update_skill_rating_on_cycle_review
    AFTER INSERT OR UPDATE ON cycle_reviews
    FOR EACH ROW EXECUTE FUNCTION update_skill_rating_from_review();

-- Unified user rating from both exchange_reviews and cycle_reviews
CREATE OR REPLACE FUNCTION update_user_rating_from_all_reviews()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
BEGIN
    SELECT
        COALESCE(AVG(rating::DECIMAL), 0),
        COUNT(*)
    INTO avg_rating, total_count
    FROM (
        SELECT rating FROM exchange_reviews WHERE reviewee_id = NEW.reviewee_id
        UNION ALL
        SELECT rating FROM cycle_reviews WHERE reviewee_id = NEW.reviewee_id
    ) all_reviews;

    UPDATE users
    SET total_rating = avg_rating, rating_count = total_count
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_rating_on_exchange_review
    AFTER INSERT OR UPDATE ON exchange_reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating_from_all_reviews();

CREATE TRIGGER update_user_rating_on_cycle_review
    AFTER INSERT OR UPDATE ON cycle_reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating_from_all_reviews();

-- Skill matches updated_at
CREATE OR REPLACE FUNCTION update_skill_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_skill_matches_updated_at
    BEFORE UPDATE ON skill_matches
    FOR EACH ROW EXECUTE FUNCTION update_skill_matches_updated_at();

-- Matching preferences updated_at
CREATE OR REPLACE FUNCTION update_matching_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matching_preferences_updated_at
    BEFORE UPDATE ON matching_preferences
    FOR EACH ROW EXECUTE FUNCTION update_matching_preferences_updated_at();

-- Auto-create default matching preferences for new users
CREATE OR REPLACE FUNCTION create_default_matching_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO matching_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_preferences
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_matching_preferences();

-- Reports updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_timestamp
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_reports_updated_at();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default skill categories
INSERT INTO skill_categories (name) VALUES
('Programming'),
('Design'),
('Mathematics'),
('Languages'),
('Business'),
('Science'),
('Engineering'),
('Arts');

-- NEXUS Admin system user (for admin messaging)
INSERT INTO users (id, student_id, email, password_hash, first_name, last_name, is_active, email_verified, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '000000000',
    'admin@nexus.system',
    '$2a$10$SYSTEMADMINPASSWORDHASH',
    'NEXUS', 'Admin', true, true, NOW()
) ON CONFLICT (id) DO NOTHING;
