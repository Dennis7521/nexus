-- Sample data for NEXUS platform
-- Run this after creating the schema

-- Sample users (passwords are hashed version of 'password123')
INSERT INTO users (student_id, email, password_hash, first_name, last_name, bio, degree_program, year_of_study, time_credits) VALUES
('202200001', '202200001@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dennis', 'Gaamangwe', 'Passionate about full-stack development and AI. Currently building web applications with React and Node.js.', 'BSc Computer Science', 3, 45),
('202100234', '202100234@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Thabo', 'Modise', 'Frontend developer with a passion for React and modern web technologies.', 'BSc Computer Science', 4, 32),
('202200145', '202200145@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Keabetswe', 'Ntšhwane', 'JavaScript enthusiast and backend developer. Love working with Node.js and databases.', 'BSc Computer Science', 3, 28),
('202100089', '202100089@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lorato', 'Ramontso', 'Database expert and data analyst. Experienced with PostgreSQL and data visualization.', 'BSc Computer Science', 4, 38),
('202200267', '202200267@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Gorata', 'Tladi', 'Machine learning researcher and Python developer. Passionate about AI and data science.', 'BSc Computer Science', 4, 42),
('202100156', '202100156@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Neo', 'Gasebalwe', 'Native Spanish speaker and language enthusiast. Love helping others learn languages.', 'BA Languages', 3, 25),
('202200178', '202200178@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Refilwe', 'Dube', 'UI/UX designer with experience in Figma and user research. Love creating beautiful interfaces.', 'BSc Multimedia', 3, 35),
('202100203', '202100203@ub.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Onthatile', 'Ntshole', 'Data science student with expertise in Python and statistical analysis.', 'BSc Statistics', 4, 30);

-- Sample skills (offers and requests)
-- Columns: user_id, title, description, category, duration_per_week, location, credits_required, tags
INSERT INTO skills (user_id, title, description, category, duration_per_week, location, credits_required, tags) VALUES
-- Programming offers
((SELECT id FROM users WHERE student_id = '202100234'), 'React.js Fundamentals', 'Learn React hooks, components, and state management. Perfect for students who know HTML/CSS.', 'Programming', '2 hrs/week', 'Online', 3, ARRAY['react', 'javascript', 'frontend', 'web-development']),
((SELECT id FROM users WHERE student_id = '202200145'), 'JavaScript ES6+', 'Master modern JavaScript features including async/await, destructuring, and arrow functions.', 'Programming', '3 hrs/week', 'Online', 3, ARRAY['javascript', 'es6', 'programming']),
((SELECT id FROM users WHERE student_id = '202100089'), 'Database Design Basics', 'Learn SQL, normalization, and PostgreSQL. Great complement to your backend development skills.', 'Programming', '2 hrs/week', 'Online', 3, ARRAY['sql', 'postgresql', 'database', 'backend']),
((SELECT id FROM users WHERE student_id = '202200267'), 'Machine Learning Basics', 'Introduction to supervised learning, neural networks, and scikit-learn. Python required.', 'Programming', '3 hrs/week', 'Online', 3, ARRAY['machine-learning', 'python', 'ai', 'data-science']),
((SELECT id FROM users WHERE student_id = '202100203'), 'Python for Data Science', 'Introduction to Pandas, NumPy, and data visualization with Matplotlib. Ideal for beginners.', 'Programming', '4 hrs/week', 'Online', 3, ARRAY['python', 'data-science', 'pandas', 'numpy']),
-- Design offers
((SELECT id FROM users WHERE student_id = '202200178'), 'UI/UX Design Fundamentals', 'Learn user research, wireframing, prototyping, and design systems. Hands-on with Figma.', 'Design', '2 hrs/week', 'Online', 2, ARRAY['ui-ux', 'figma', 'design', 'prototyping']),
((SELECT id FROM users WHERE student_id = '202200178'), 'Graphic Design Principles', 'Learn color theory, typography, and layout design using Figma and Adobe XD.', 'Design', '3 hrs/week', 'Online', 2, ARRAY['graphic-design', 'typography', 'color-theory']),
-- Language offers
((SELECT id FROM users WHERE student_id = '202100156'), 'Spanish Conversation Practice', 'Native speaker offering conversational practice for intermediate learners. Fun and casual sessions.', 'Languages', '1 hrs/week', 'Online', 2, ARRAY['spanish', 'conversation', 'language-exchange']);

-- Sample exchange request (completed)
INSERT INTO exchange_requests (skill_id, requester_id, instructor_id, status, message, total_credits, escrow_credits, session_count) VALUES
((SELECT id FROM skills WHERE title = 'React.js Fundamentals' LIMIT 1),
 (SELECT id FROM users WHERE student_id = '202100234'),
 (SELECT id FROM users WHERE student_id = '202200001'),
 'completed', 'Hi! I would love to learn React from you.', 3, 0, 1);

-- Sample transaction (escrow release after completion)
INSERT INTO transactions (from_user_id, to_user_id, amount, type, description, exchange_request_id) VALUES
((SELECT id FROM users WHERE student_id = '202100234'),
 (SELECT id FROM users WHERE student_id = '202200001'),
 3, 'escrow_release', 'Credits released for React.js Fundamentals',
 (SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1));

-- Sample exchange review
INSERT INTO exchange_reviews (exchange_id, reviewer_id, instructor_id, rating, comment) VALUES
((SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1),
 (SELECT id FROM users WHERE student_id = '202100234'),
 (SELECT id FROM users WHERE student_id = '202200001'),
 5, 'Excellent teacher! Very patient and explains concepts clearly. Helped me understand React hooks in no time.');

-- Sample messages
INSERT INTO messages (sender_id, receiver_id, exchange_request_id, content) VALUES
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200001'), (SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1), 'Hi Dennis! I saw your offer to teach React. I''m interested in learning.'),
((SELECT id FROM users WHERE student_id = '202200001'), (SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1), 'Hey Thabo! That''s great. I''d be happy to help. What''s your experience level with JavaScript?'),
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200001'), (SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1), 'I''m comfortable with ES6 basics. I''ve built a few small projects but never used a framework.'),
((SELECT id FROM users WHERE student_id = '202200001'), (SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1), 'Perfect! That''s a good foundation. We can start with components and hooks. Are you free this week?'),
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200001'), (SELECT id FROM exchange_requests WHERE status = 'completed' LIMIT 1), 'Thanks for the React session!');
