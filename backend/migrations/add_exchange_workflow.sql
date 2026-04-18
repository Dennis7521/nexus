-- Migration: Add Exchange Workflow Support
-- Adds escrow system and session management for skill exchanges

-- 1. Modify exchange_requests table to add escrow and session tracking
ALTER TABLE exchange_requests 
ADD COLUMN IF NOT EXISTS total_credits NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS escrow_credits NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1;

-- Update status values comment
COMMENT ON COLUMN exchange_requests.status IS 'pending, accepted, declined, completed, cancelled, disputed';

-- 2. Create exchange_sessions table
CREATE TABLE IF NOT EXISTS exchange_sessions (
  id SERIAL PRIMARY KEY,
  exchange_request_id INTEGER REFERENCES exchange_requests(id) ON DELETE CASCADE,
  session_index INTEGER NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  credit_share NUMERIC(6,3) NOT NULL,
  
  -- Verification
  verification_code VARCHAR(12) NOT NULL,
  code_attempts INTEGER DEFAULT 0,
  
  -- Mutual Confirmation
  mentor_confirmed BOOLEAN DEFAULT FALSE,
  mentor_confirmed_at TIMESTAMP WITH TIME ZONE,
  learner_confirmed BOOLEAN DEFAULT FALSE,
  learner_confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Session Evidence
  session_notes TEXT,
  topics_covered TEXT[],
  
  -- Meeting Link (Google Meet, Zoom, etc.)
  meeting_link TEXT,
  
  -- Rating & Review
  learner_rating INTEGER CHECK (learner_rating BETWEEN 1 AND 5),
  learner_review TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(exchange_request_id, session_index)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_request ON exchange_sessions(exchange_request_id);
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_status ON exchange_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exchange_sessions_scheduled ON exchange_sessions(scheduled_at);

-- 4. Update transactions table to support session payments
ALTER TABLE transactions
ALTER COLUMN credits TYPE NUMERIC(6,3);

COMMENT ON COLUMN transactions.transaction_type IS 'exchange, session_payment, bonus, penalty, refund';
