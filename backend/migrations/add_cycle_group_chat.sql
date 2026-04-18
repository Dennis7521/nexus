-- Add cycle_id to messages table for group chats
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES exchange_cycles(id) ON DELETE CASCADE;

-- Index for fast group chat lookups
CREATE INDEX IF NOT EXISTS idx_messages_cycle_id ON messages(cycle_id);
