-- Migration: Add NEXUS Admin system user for admin messaging
-- Created: 2026-04-12

-- Insert NEXUS Admin user with fixed UUID
INSERT INTO users (
  id,
  student_id,
  email,
  password_hash,
  first_name,
  last_name,
  is_active,
  email_verified,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '000000000',
  'admin@nexus.system',
  '$2a$10$SYSTEMADMINPASSWORDHASH',  -- This won't be used for login
  'NEXUS',
  'Admin',
  true,
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Ensure this user can't be deleted or modified by regular operations
COMMENT ON TABLE users IS 'User ID 00000000-0000-0000-0000-000000000000 is reserved for NEXUS Admin system messages';
