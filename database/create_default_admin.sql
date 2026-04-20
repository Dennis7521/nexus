-- Create default admin account
-- Username: admin
-- Password: admin123
-- IMPORTANT: Change this password after first login!

INSERT INTO admins (username, password_hash, is_active)
VALUES (
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    true
)
ON CONFLICT (username) DO NOTHING;
