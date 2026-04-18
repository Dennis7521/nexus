-- NEXUS Database Schema
-- PostgreSQL database schema for the skill exchange platform

-- Create database (run this separately)
-- CREATE DATABASE nexus_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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
    time_credits INTEGER DEFAULT 10 CHECK (time_credits >= 0),
    total_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (total_rating >= 0 AND total_rating <= 5),
    rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skill categories table
CREATE TABLE skill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES skill_categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    skill_type VARCHAR(10) NOT NULL CHECK (skill_type IN ('offer', 'request')),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    time_commitment_hours INTEGER CHECK (time_commitment_hours > 0),
    time_commitment_period VARCHAR(20) CHECK (time_commitment_period IN ('week', 'month', 'total')),
    location_type VARCHAR(20) CHECK (location_type IN ('online', 'on_campus', 'flexible')),
    specific_location VARCHAR(200),
    prerequisites TEXT,
    tags TEXT[], -- Array of skill tags
    credits_required INTEGER DEFAULT 0 CHECK (credits_required >= 0),
    max_students INTEGER DEFAULT 1 CHECK (max_students > 0),
    current_students INTEGER DEFAULT 0 CHECK (current_students >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skill exchanges table
CREATE TABLE skill_exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    skill_id UUID NOT NULL REFERENCES skills(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
    credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    meeting_schedule JSONB, -- Flexible meeting schedule data
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions table
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    exchange_id UUID REFERENCES skill_exchanges(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('exchange', 'bonus', 'penalty', 'refund')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    exchange_id UUID REFERENCES skill_exchanges(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exchange_id UUID NOT NULL REFERENCES skill_exchanges(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exchange_id, reviewer_id) -- One review per exchange per reviewer
);

-- User skills (skills a user has/knows)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(200) NOT NULL,
    proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience DECIMAL(3,1) CHECK (years_of_experience >= 0),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_id UUID, -- Can reference various entities
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_category_id ON skills(category_id);
CREATE INDEX idx_skills_type ON skills(skill_type);
CREATE INDEX idx_skills_active ON skills(is_active);
CREATE INDEX idx_exchanges_requester ON skill_exchanges(requester_id);
CREATE INDEX idx_exchanges_provider ON skill_exchanges(provider_id);
CREATE INDEX idx_exchanges_status ON skill_exchanges(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON skill_exchanges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default skill categories
INSERT INTO skill_categories (name, description, icon, color) VALUES
('Programming', 'Software development, coding, and programming languages', 'code', '#3B82F6'),
('Design', 'UI/UX design, graphic design, and visual arts', 'palette', '#8B5CF6'),
('Mathematics', 'Math, statistics, and analytical skills', 'calculator', '#10B981'),
('Languages', 'Foreign languages and communication skills', 'globe', '#F59E0B'),
('Business', 'Entrepreneurship, marketing, and business skills', 'briefcase', '#EF4444'),
('Science', 'Natural sciences, research, and laboratory skills', 'flask', '#06B6D4'),
('Engineering', 'Mechanical, electrical, and other engineering disciplines', 'cog', '#84CC16'),
('Arts', 'Music, literature, and creative arts', 'music', '#EC4899');

-- Create a function to update user ratings
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET 
        total_rating = (
            SELECT COALESCE(AVG(rating::DECIMAL), 0) 
            FROM reviews 
            WHERE reviewee_id = NEW.reviewee_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE reviewee_id = NEW.reviewee_id
        )
    WHERE id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update user ratings when a review is added
CREATE TRIGGER update_user_rating_trigger 
    AFTER INSERT ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_rating();
