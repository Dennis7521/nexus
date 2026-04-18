-- Create messages table for storing chat messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    exchange_id INTEGER NOT NULL REFERENCES skill_exchanges(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_exchange_id ON messages(exchange_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Update skill_exchanges table to add message field if it doesn't exist
ALTER TABLE skill_exchanges 
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS credits_required INTEGER DEFAULT 1;

-- Temporarily allow NULL skill_id for demo purposes
ALTER TABLE skill_exchanges ALTER COLUMN skill_id DROP NOT NULL;

-- Add indexes for skill_exchanges if they don't exist
CREATE INDEX IF NOT EXISTS idx_skill_exchanges_requester_id ON skill_exchanges(requester_id);
CREATE INDEX IF NOT EXISTS idx_skill_exchanges_provider_id ON skill_exchanges(provider_id);
CREATE INDEX IF NOT EXISTS idx_skill_exchanges_status ON skill_exchanges(status);
