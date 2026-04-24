const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    const {
      studentId,
      email,
      password,
      firstName,
      lastName,
      bio = null,
      degreeProgram = null,
      yearOfStudy = null
    } = userData;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (student_id, email, password_hash, first_name, last_name, bio, degree_program, year_of_study)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, student_id, email, first_name, last_name, bio, degree_program, year_of_study, time_credits, created_at`,
      [studentId, email, passwordHash, firstName, lastName, bio, degreeProgram, yearOfStudy]
    );

    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true AND email_verified = true',
      [email]
    );
    return result.rows[0];
  }

  // Find user by student ID
  static async findByStudentId(studentId) {
    const result = await query(
      'SELECT * FROM users WHERE student_id = $1 AND is_active = true',
      [studentId]
    );
    return result.rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const result = await query(
      `SELECT id, student_id, email, first_name, last_name, bio, degree_program, 
              year_of_study, profile_picture_url, transcript_url, time_credits, total_rating, 
              rating_count, skills_possessing, skills_interested_in, 
              COALESCE(is_suspended, false) as is_suspended,
              password_changed_at, created_at, updated_at
       FROM users WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    const {
      firstName,
      lastName,
      bio,
      degreeProgram,
      yearOfStudy,
      profilePictureUrl,
      skillsPossessing,
      skillsInterestedIn
    } = updateData;

    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           bio = COALESCE($4, bio),
           degree_program = COALESCE($5, degree_program),
           year_of_study = COALESCE($6, year_of_study),
           profile_picture_url = COALESCE($7, profile_picture_url),
           skills_possessing = COALESCE($8, skills_possessing),
           skills_interested_in = COALESCE($9, skills_interested_in),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = true
       RETURNING id, student_id, email, first_name, last_name, bio, degree_program, 
                 year_of_study, profile_picture_url, transcript_url, time_credits, total_rating, rating_count,
                 skills_possessing, skills_interested_in`,
      [userId, firstName, lastName, bio, degreeProgram, yearOfStudy, profilePictureUrl, skillsPossessing, skillsInterestedIn]
    );

    return result.rows[0];
  }

  // Update user credits
  static async updateCredits(userId, creditChange, transactionType = 'exchange') {
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');

      // Update user credits
      const userResult = await client.query(
        `UPDATE users 
         SET time_credits = time_credits + $2
         WHERE id = $1 AND is_active = true
         RETURNING time_credits`,
        [userId, creditChange]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const newBalance = userResult.rows[0].time_credits;

      if (newBalance < 0) {
        throw new Error('Insufficient credits');
      }

      await client.query('COMMIT');
      return newBalance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user's skills
  static async getUserSkills(userId) {
    const result = await query(
      `SELECT skill_name, proficiency_level, years_of_experience
       FROM user_skills
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(row => row.skill_name);
  }

  // Update user skills
  static async updateUserSkills(userId, skills) {
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Delete existing skills
      await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
      
      // Insert new skills
      if (skills && skills.length > 0) {
        for (const skill of skills) {
          await client.query(
            'INSERT INTO user_skills (user_id, skill_name, proficiency_level) VALUES ($1, $2, $3)',
            [userId, skill, 'intermediate']
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return the skills that were just inserted
      return skills || [];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Add user skill
  static async addUserSkill(userId, skillData) {
    const { skillName, proficiencyLevel, yearsOfExperience } = skillData;

    const result = await query(
      `INSERT INTO user_skills (user_id, skill_name, proficiency_level, years_of_experience)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, skillName, proficiencyLevel, yearsOfExperience]
    );

    return result.rows[0];
  }

  // Get user statistics
  static async getUserStats(userId) {
    const result = await query(
      `SELECT 
        u.time_credits,
        COALESCE(u.total_rating, 0) as total_rating,
        COALESCE(u.rating_count, 0) as rating_count,
        (SELECT COUNT(*) FROM skills WHERE user_id = $1 AND is_active = true) as skills_offered,
        (
          (SELECT COUNT(*) FROM exchange_requests
           WHERE (requester_id = $1 OR instructor_id = $1) AND status = 'completed')
          +
          -- Sync cycle counts as a completed exchange for this user when:
          --   (a) the whole cycle is completed, OR
          --   (b) the user has rated their instructor (their learning pair
          --       finished all required sessions), OR
          --   (c) the user has been rated as an instructor (their teaching
          --       pair finished all required sessions).
          (SELECT COUNT(DISTINCT cycle_id) FROM (
             SELECT ec.id AS cycle_id
             FROM exchange_cycles ec
             JOIN cycle_participants cp ON cp.cycle_id = ec.id
             WHERE cp.user_id = $1 AND ec.status = 'completed'
             UNION
             SELECT cycle_id FROM cycle_reviews WHERE reviewer_id = $1
             UNION
             SELECT cycle_id FROM cycle_reviews WHERE reviewee_id = $1
          ) sync_done)
        ) as exchanges_completed
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  // Get user's offered skills
  static async getUserOfferedSkills(userId) {
    const result = await query(
      `SELECT 
        s.id,
        s.title,
        s.description,
        s.category,
        s.duration_per_week as time_commitment,
        s.location,
        s.credits_required,
        COALESCE(s.rating, 0) as rating,
        s.is_active,
        0 as students_count
       FROM skills s
       WHERE s.user_id = $1 AND s.is_active = true
       ORDER BY s.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // Search users
  static async searchUsers(searchTerm, limit = 20, offset = 0) {
    const result = await query(
      `SELECT id, student_id, first_name, last_name, bio, degree_program, 
              year_of_study, total_rating, rating_count, profile_picture_url
       FROM users 
       WHERE is_active = true 
         AND (first_name ILIKE $1 OR last_name ILIKE $1 OR bio ILIKE $1 OR degree_program ILIKE $1)
       ORDER BY total_rating DESC, rating_count DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );

    return result.rows;
  }

  // Get user's exchange history (completed async + sync exchanges)
  static async getExchangeHistory(userId, limit = 20, offset = 0) {
    const result = await query(
      `(
        SELECT 
          'async-' || er.id::text as id,
          s.title as skill_title,
          er.status,
          er.total_credits,
          COALESCE(er.updated_at, er.created_at) as created_at,
          'async' as exchange_type,
          CASE 
            WHEN er.requester_id = $1 THEN 'learner'
            ELSE 'mentor'
          END as role,
          CASE 
            WHEN er.requester_id = $1 THEN u2.first_name || ' ' || u2.last_name
            ELSE u1.first_name || ' ' || u1.last_name
          END as partner_name
        FROM exchange_requests er
        JOIN skills s ON er.skill_id = s.id
        JOIN users u1 ON er.requester_id = u1.id
        JOIN users u2 ON er.instructor_id = u2.id
        WHERE (er.requester_id = $1 OR er.instructor_id = $1)
          AND (
            er.status = 'completed'
            OR EXISTS (
              SELECT 1 FROM exchange_sessions es
              WHERE es.exchange_request_id = er.id
                AND es.status = 'completed'
            )
          )
      )
      UNION ALL
      (
        SELECT 
          'sync-' || ec.id::text as id,
          cp_self.skill_receiving as skill_title,
          ec.status,
          NULL::integer as total_credits,
          COALESCE(ec.completed_at, ec.updated_at, ec.created_at) as created_at,
          'sync' as exchange_type,
          'learner' as role,
          COALESCE((
            SELECT string_agg(u.first_name || ' ' || u.last_name, ', ')
            FROM cycle_participants cp2
            JOIN users u ON cp2.user_id = u.id
            WHERE cp2.cycle_id = ec.id AND cp2.user_id != $1
          ), '') as partner_name
        FROM exchange_cycles ec
        JOIN cycle_participants cp_self
          ON cp_self.cycle_id = ec.id AND cp_self.user_id = $1
        WHERE ec.status = 'completed'
           OR EXISTS (
             SELECT 1 FROM cycle_reviews cr
             WHERE cr.cycle_id = ec.id
               AND (cr.reviewer_id = $1 OR cr.reviewee_id = $1)
           )
      )
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  // Deactivate user account
  static async deactivateAccount(userId) {
    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
      [userId]
    );
    return result.rows[0];
  }

  // Verify user email
  static async verifyEmail(email) {
    const result = await query(
      'UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email = $1 RETURNING id, email',
      [email]
    );
    return result.rows[0];
  }

  // Check if email is institutional (Outlook/Office365)
  static isInstitutionalEmail(email) {
    const institutionalDomains = [
      '@outlook.com',
      '@hotmail.com', 
      '@live.com',
      '@student.', // Common pattern for student emails
      '.edu', // Educational domains
      '.ac.', // Academic domains
    ];
    
    return institutionalDomains.some(domain => 
      email.toLowerCase().includes(domain.toLowerCase())
    );
  }

  // Create unverified user (for OTP flow)
  static async createUnverified(userData) {
    const {
      studentId,
      email,
      password,
      firstName,
      lastName,
      bio = null,
      degreeProgram = null,
      yearOfStudy = null
    } = userData;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (student_id, email, password_hash, first_name, last_name, bio, degree_program, year_of_study, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
       RETURNING id, student_id, email, first_name, last_name, bio, degree_program, year_of_study, time_credits, email_verified, created_at`,
      [studentId, email, passwordHash, firstName, lastName, bio, degreeProgram, yearOfStudy]
    );

    return result.rows[0];
  }

  // Find unverified user by email
  static async findUnverifiedByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND email_verified = false AND is_active = true',
      [email]
    );
    return result.rows[0];
  }

  // Get user reviews (reviews received by this user as instructor)
  // Merges both async exchange reviews and sync cycle reviews
  static async getUserReviews(userId) {
    const result = await query(
      `SELECT * FROM (
        -- Async exchange reviews
        SELECT 
          er.id::text,
          er.rating,
          er.comment,
          er.skill_title,
          er.created_at,
          u.first_name || ' ' || u.last_name AS reviewer_name,
          u.profile_picture_url AS reviewer_picture
        FROM exchange_reviews er
        JOIN users u ON er.reviewer_id = u.id
        WHERE er.reviewee_id = $1
        
        UNION ALL
        
        -- Sync cycle reviews
        SELECT 
          'cycle_' || cr.id::text as id,
          cr.rating,
          cr.comment,
          cr.skill_title,
          cr.created_at,
          u.first_name || ' ' || u.last_name AS reviewer_name,
          u.profile_picture_url AS reviewer_picture
        FROM cycle_reviews cr
        JOIN users u ON cr.reviewer_id = u.id
        WHERE cr.reviewee_id = $1
      ) all_reviews
      ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Get user's skills possessing and interested in
  static async getUserSkillFields(userId) {
    const result = await query(
      `SELECT skills_possessing, skills_interested_in
       FROM users
       WHERE id = $1 AND is_active = true`,
      [userId]
    );
    return result.rows[0];
  }

  // Update user's skills possessing
  // Also invalidates stale teacher-side matches and deactivates orphaned skill cards
  // for skills that were removed from the user's possessing list.
  static async updateSkillsPossessing(userId, skills) {
    const result = await query(
      `UPDATE users
       SET skills_possessing = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = true
       RETURNING skills_possessing`,
      [userId, skills]
    );

    // Expire suggested/contacted matches where this user is listed as teacher
    // for a skill they no longer possess.
    await query(
      `UPDATE skill_matches
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE teacher_id = $1
         AND status IN ('suggested', 'contacted')
         AND NOT (LOWER(TRIM(skill_name)) = ANY (
           SELECT LOWER(TRIM(s)) FROM unnest($2::text[]) s
         ))`,
      [userId, skills]
    );

    // Deactivate any skills-table entries whose title is no longer in possessing
    // so the matching graph stops surfacing them.
    await query(
      `UPDATE skills
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND is_active = true
         AND NOT (LOWER(TRIM(title)) = ANY (
           SELECT LOWER(TRIM(s)) FROM unnest($2::text[]) s
         ))`,
      [userId, skills]
    );

    // Invalidate cached skill graph so cycle detection uses fresh data
    try {
      const GraphService = require('../services/GraphService');
      GraphService.clearCache();
    } catch (_) { /* non-fatal */ }

    return result.rows[0]?.skills_possessing || [];
  }

  // Update user's skills interested in
  // Also invalidates stale learner-side matches for interests that were removed.
  static async updateSkillsInterestedIn(userId, skills) {
    const result = await query(
      `UPDATE users
       SET skills_interested_in = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = true
       RETURNING skills_interested_in`,
      [userId, skills]
    );

    // Expire suggested/contacted matches where this user is the learner
    // for a skill they're no longer interested in.
    await query(
      `UPDATE skill_matches
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE learner_id = $1
         AND status IN ('suggested', 'contacted')
         AND NOT (LOWER(TRIM(skill_name)) = ANY (
           SELECT LOWER(TRIM(s)) FROM unnest($2::text[]) s
         ))`,
      [userId, skills]
    );

    // Invalidate cached skill graph so cycle detection uses fresh data
    try {
      const GraphService = require('../services/GraphService');
      GraphService.clearCache();
    } catch (_) { /* non-fatal */ }

    return result.rows[0]?.skills_interested_in || [];
  }

  // Update profile picture
  static async updateProfilePicture(userId, profilePictureUrl) {
    const result = await query(
      `UPDATE users
       SET profile_picture_url = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = true
       RETURNING id, profile_picture_url`,
      [userId, profilePictureUrl]
    );
    return result.rows[0];
  }

  // Update password
  static async updatePassword(userId, hashedPassword) {
    const result = await query(
      `UPDATE users
       SET password_hash = $2,
           password_changed_at = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = true
       RETURNING id`,
      [userId, hashedPassword]
    );
    return result.rows[0];
  }

  // Update transcript
  static async updateTranscript(userId, transcriptUrl) {
    const result = await query(
      `UPDATE users
       SET transcript_url = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = true
       RETURNING id, transcript_url`,
      [userId, transcriptUrl]
    );
    return result.rows[0];
  }
}

module.exports = User;
