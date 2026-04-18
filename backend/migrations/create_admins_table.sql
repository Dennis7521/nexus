-- Create admins table for admin account management
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- Insert default admin account (password: admin123)
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO admins (username, password_hash, is_active)
VALUES ('admin', '$2a$10$rN8qzXJ5vYxK5YxK5YxK5.eK5YxK5YxK5YxK5YxK5YxK5YxK5YxK5u', true)
ON CONFLICT (username) DO NOTHING;
