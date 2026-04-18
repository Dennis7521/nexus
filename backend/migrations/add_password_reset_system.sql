-- Migration: Add password reset request system
-- This allows users to request password resets that admins must approve

-- Create password_reset_requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES admins(id),
  temporary_password VARCHAR(255),
  notes TEXT,
  CONSTRAINT unique_pending_request UNIQUE (user_id, status)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_password_reset_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_requests(user_id);

-- Add must_change_password flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add index for must_change_password
CREATE INDEX IF NOT EXISTS idx_users_must_change_password ON users(must_change_password);

-- Comment on table
COMMENT ON TABLE password_reset_requests IS 'Stores password reset requests that require admin approval';
COMMENT ON COLUMN password_reset_requests.status IS 'pending: awaiting admin action, approved: admin reset password, rejected: admin denied request';
COMMENT ON COLUMN password_reset_requests.temporary_password IS 'Temporary password set by admin (hashed)';
COMMENT ON COLUMN users.must_change_password IS 'Forces user to change password on next login';
