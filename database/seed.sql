-- Sample data for NEXUS platform
-- Run this after creating the schema

-- Sample users (passwords are hashed version of 'password123')
INSERT INTO users (student_id, email, password_hash, first_name, last_name, bio, degree_program, year_of_study, time_credits) VALUES
('202200358', 'mothusi.gaamangwe@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mothusi Dennis', 'Gaamangwe', 'Passionate about full-stack development and AI. Currently building web applications with React and Node.js.', 'BSc Computer Science', 3, 45),
('202100234', 'thabo.modise@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Thabo', 'Modise', 'Frontend developer with a passion for React and modern web technologies.', 'BSc Computer Science', 4, 32),
('202200145', 'keabetswe.ntshwane@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Keabetswe', 'Ntšhwane', 'JavaScript enthusiast and backend developer. Love working with Node.js and databases.', 'BSc Computer Science', 3, 28),
('202100089', 'lorato.ramontso@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lorato', 'Ramontso', 'Database expert and data analyst. Experienced with PostgreSQL and data visualization.', 'BSc Computer Science', 4, 38),
('202200267', 'gorata.tladi@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Gorata', 'Tladi', 'Machine learning researcher and Python developer. Passionate about AI and data science.', 'BSc Computer Science', 4, 42),
('202100156', 'neo.gasebalwe@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Neo', 'Gasebalwe', 'Native Spanish speaker and language enthusiast. Love helping others learn languages.', 'BA Languages', 3, 25),
('202200178', 'refilwe.dube@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Refilwe', 'Dube', 'UI/UX designer with experience in Figma and user research. Love creating beautiful interfaces.', 'BSc Multimedia', 3, 35),
('202100203', 'onthatile.ntshole@student.ac.bw', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Onthatile', 'Ntshole', 'Data science student with expertise in Python and statistical analysis.', 'BSc Statistics', 4, 30);

-- Sample user skills
INSERT INTO user_skills (user_id, skill_name, proficiency_level, years_of_experience) VALUES
((SELECT id FROM users WHERE student_id = '202200358'), 'React.js', 'intermediate', 2.0),
((SELECT id FROM users WHERE student_id = '202200358'), 'Node.js', 'intermediate', 1.5),
((SELECT id FROM users WHERE student_id = '202200358'), 'JavaScript', 'advanced', 3.0),
((SELECT id FROM users WHERE student_id = '202200358'), 'HTML/CSS', 'advanced', 4.0),
((SELECT id FROM users WHERE student_id = '202100234'), 'React.js', 'advanced', 3.0),
((SELECT id FROM users WHERE student_id = '202100234'), 'TypeScript', 'intermediate', 2.0),
((SELECT id FROM users WHERE student_id = '202200145'), 'Node.js', 'advanced', 2.5),
((SELECT id FROM users WHERE student_id = '202200145'), 'PostgreSQL', 'intermediate', 2.0),
((SELECT id FROM users WHERE student_id = '202100089'), 'PostgreSQL', 'expert', 4.0),
((SELECT id FROM users WHERE student_id = '202100089'), 'Data Analysis', 'advanced', 3.0),
((SELECT id FROM users WHERE student_id = '202200267'), 'Python', 'expert', 4.0),
((SELECT id FROM users WHERE student_id = '202200267'), 'Machine Learning', 'advanced', 2.0),
((SELECT id FROM users WHERE student_id = '202100156'), 'Spanish', 'expert', 10.0),
((SELECT id FROM users WHERE student_id = '202200178'), 'UI/UX Design', 'advanced', 2.5),
((SELECT id FROM users WHERE student_id = '202200178'), 'Figma', 'expert', 3.0),
((SELECT id FROM users WHERE student_id = '202100203'), 'Python', 'advanced', 3.0),
((SELECT id FROM users WHERE student_id = '202100203'), 'Data Science', 'intermediate', 2.0);

-- Sample skills (offers and requests)
INSERT INTO skills (user_id, category_id, title, description, skill_type, difficulty_level, time_commitment_hours, time_commitment_period, location_type, specific_location, tags, credits_required, max_students) VALUES
-- Programming offers
((SELECT id FROM users WHERE student_id = '202100234'), 1, 'React.js Fundamentals', 'Learn React hooks, components, and state management. Perfect for students who know HTML/CSS.', 'offer', 'beginner', 2, 'week', 'on_campus', 'Campus Library', ARRAY['react', 'javascript', 'frontend', 'web-development'], 6, 3),
((SELECT id FROM users WHERE student_id = '202200145'), 1, 'JavaScript ES6+', 'Master modern JavaScript features including async/await, destructuring, and arrow functions.', 'offer', 'intermediate', 3, 'week', 'on_campus', 'CS Lab 3', ARRAY['javascript', 'es6', 'programming'], 8, 2),
((SELECT id FROM users WHERE student_id = '202100089'), 1, 'Database Design Basics', 'Learn SQL, normalization, and PostgreSQL. Great complement to your backend development skills.', 'offer', 'beginner', 2, 'week', 'online', NULL, ARRAY['sql', 'postgresql', 'database', 'backend'], 6, 4),
((SELECT id FROM users WHERE student_id = '202200267'), 1, 'Machine Learning Basics', 'Introduction to supervised learning, neural networks, and scikit-learn. Python required.', 'offer', 'intermediate', 3, 'week', 'on_campus', 'CS Lab 1', ARRAY['machine-learning', 'python', 'ai', 'data-science'], 10, 2),
((SELECT id FROM users WHERE student_id = '202100203'), 1, 'Python for Data Science', 'Introduction to Pandas, NumPy, and data visualization with Matplotlib. Ideal for beginners.', 'offer', 'beginner', 4, 'week', 'on_campus', 'Main Library', ARRAY['python', 'data-science', 'pandas', 'numpy'], 8, 3),

-- Design offers
((SELECT id FROM users WHERE student_id = '202200178'), 2, 'UI/UX Design Fundamentals', 'Learn user research, wireframing, prototyping, and design systems. Hands-on with Figma.', 'offer', 'beginner', 2, 'week', 'online', NULL, ARRAY['ui-ux', 'figma', 'design', 'prototyping'], 7, 3),
((SELECT id FROM users WHERE student_id = '202200178'), 2, 'Graphic Design Principles', 'Learn color theory, typography, and layout design using Figma and Adobe XD.', 'offer', 'beginner', 3, 'week', 'on_campus', 'Design Studio', ARRAY['graphic-design', 'typography', 'color-theory'], 6, 2),

-- Language offers
((SELECT id FROM users WHERE student_id = '202100156'), 4, 'Spanish Conversation Practice', 'Native speaker offering conversational practice for intermediate learners. Fun and casual sessions.', 'offer', 'intermediate', 1, 'week', 'flexible', 'Coffee Shop', ARRAY['spanish', 'conversation', 'language-exchange'], 4, 1),

-- Requests
((SELECT id FROM users WHERE student_id = '202200358'), 1, 'Docker & Containerization', 'Looking to learn Docker, container orchestration, and deployment strategies for web applications.', 'request', 'beginner', 2, 'week', 'flexible', NULL, ARRAY['docker', 'containers', 'devops', 'deployment'], 8, 1),
((SELECT id FROM users WHERE student_id = '202200358'), 2, 'UI/UX Design Principles', 'Want to improve my design skills for better user interfaces in my web applications.', 'request', 'beginner', 2, 'week', 'online', NULL, ARRAY['ui-ux', 'design', 'user-experience'], 6, 1),
((SELECT id FROM users WHERE student_id = '202100234'), 3, 'Linear Algebra', 'Need help with matrices, eigenvalues, and vector spaces for my CS degree requirements.', 'request', 'intermediate', 3, 'week', 'on_campus', 'Library Study Room', ARRAY['linear-algebra', 'mathematics', 'matrices'], 8, 1),
((SELECT id FROM users WHERE student_id = '202200145'), 3, 'Calculus II', 'Need help with integration techniques, series, and sequences. Preparing for finals.', 'request', 'intermediate', 4, 'week', 'on_campus', 'Library', ARRAY['calculus', 'integration', 'mathematics'], 10, 1),
((SELECT id FROM users WHERE student_id = '202200267'), 2, 'Photography Basics', 'Want to learn composition, lighting, and editing for content creation and portfolio work.', 'request', 'beginner', 3, 'week', 'on_campus', 'Campus', ARRAY['photography', 'composition', 'editing'], 6, 1);

-- Sample exchanges
INSERT INTO skill_exchanges (requester_id, provider_id, skill_id, status, credits_amount, start_date, notes) VALUES
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM skills WHERE title = 'React.js Fundamentals' LIMIT 1), 'completed', 6, '2026-01-08 14:00:00+02', 'Great session! Learned a lot about React hooks.'),
((SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM users WHERE student_id = '202200267'), (SELECT id FROM skills WHERE title = 'Machine Learning Basics' LIMIT 1), 'in_progress', 10, '2026-01-15 15:00:00+02', 'Currently learning ML fundamentals.');

-- Sample credit transactions
INSERT INTO credit_transactions (from_user_id, to_user_id, exchange_id, amount, transaction_type, description) VALUES
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), 6, 'exchange', 'Payment for React.js tutoring session'),
((SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM users WHERE student_id = '202200267'), (SELECT id FROM skill_exchanges WHERE status = 'in_progress' LIMIT 1), 10, 'exchange', 'Payment for Machine Learning tutoring');

-- Sample reviews
INSERT INTO reviews (exchange_id, reviewer_id, reviewee_id, rating, comment) VALUES
((SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), (SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200358'), 5, 'Excellent teacher! Very patient and explains concepts clearly. Helped me understand React hooks in no time.');

-- Sample messages
INSERT INTO messages (sender_id, receiver_id, exchange_id, content) VALUES
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), 'Hi Mothusi! I saw your offer to teach React. I''m interested in learning.'),
((SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), 'Hey Thabo! That''s great. I''d be happy to help. What''s your experience level with JavaScript?'),
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), 'I''m comfortable with ES6 basics. I''ve built a few small projects but never used a framework.'),
((SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), 'Perfect! That''s a good foundation. We can start with components and hooks. Are you free this week?'),
((SELECT id FROM users WHERE student_id = '202100234'), (SELECT id FROM users WHERE student_id = '202200358'), (SELECT id FROM skill_exchanges WHERE status = 'completed' LIMIT 1), 'Thanks for the React session!');
