const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const OTP = require('../models/OTP');
const PasswordReset = require('../models/PasswordReset');
const emailService = require('../services/emailService');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { uploadProfilePicture, uploadTranscript, uploadToCloudinary, cloudinary } = require('../middleware/upload');
const { triggerMatchingJobsOnLogin } = require('../jobs/matchingJobs');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Helper function to convert relative profile picture path to full URL
const getProfilePictureUrl = (relativePath, req) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};

// Cookie options for JWT — httpOnly prevents JS access (XSS mitigation)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Rate limiting for auth routes - production ready
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

// Stricter rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 OTP requests per hour per IP
  message: 'Too many OTP requests. Please wait before requesting another code.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Validation rules
const registerValidation = [
  body('studentId')
    .isLength({ min: 9, max: 10 })
    .withMessage('Student ID must be 9 or 10 digits')
    .matches(/^20[0-2][0-9]\d{5,6}$/)
    .withMessage('Student ID must be 9 or 10 digits starting with a year from 2000-2029 (e.g., 202200358)'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(/^\d{9,10}@ub\.ac\.bw$/)
    .withMessage('Email must be in format: studentID@ub.ac.bw'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must contain only letters and spaces'),
  body('lastName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must contain only letters and spaces'),
  body('degreeProgram')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Degree program must be less than 200 characters'),
  body('yearOfStudy')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Year of study must be between 1 and 6')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(/^\d{9,10}@ub\.ac\.bw$/)
    .withMessage('Only University of Botswana student emails are allowed'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Step 1: Register new user (creates unverified account and sends OTP)
router.post('/register', otpLimiter, registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      studentId,
      email,
      password,
      firstName,
      lastName,
      bio,
      degreeProgram,
      yearOfStudy
    } = req.body;

    // Cross-field validation: Ensure email matches student ID
    const expectedEmail = `${studentId}@ub.ac.bw`;
    if (email !== expectedEmail) {
      return res.status(400).json({
        message: `Email must match student ID format: ${expectedEmail}`
      });
    }

    // Check if verified user already exists
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(409).json({
        message: 'User with this email already exists and is verified'
      });
    }

    const existingUserByStudentId = await User.findByStudentId(studentId);
    if (existingUserByStudentId) {
      return res.status(409).json({
        message: 'User with this student ID already exists'
      });
    }

    // Check for unverified user and update if exists
    const unverifiedUser = await User.findUnverifiedByEmail(email);
    let newUser;
    
    if (unverifiedUser) {
      // Update existing unverified user
      newUser = await User.updateProfile(unverifiedUser.id, {
        firstName,
        lastName,
        bio,
        degreeProgram,
        yearOfStudy
      });
    } else {
      // Create new unverified user
      newUser = await User.createUnverified({
        studentId,
        email,
        password,
        firstName,
        lastName,
        bio,
        degreeProgram,
        yearOfStudy
      });
    }

    // Check OTP rate limiting
    const otpAttempts = await OTP.getOTPAttempts(email, 60);
    if (otpAttempts >= 3) {
      return res.status(429).json({
        message: 'Too many OTP requests. Please wait before requesting another code.'
      });
    }

    // Generate and send OTP
    const otpRecord = await OTP.createEmailOTP(email, 'email_verification');
    const emailResult = await emailService.sendOTPEmail(email, otpRecord.otp_code, 'email_verification');

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again.',
        error: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    res.status(201).json({
      message: 'Registration initiated. Please check your email for the verification code.',
      email: email,
      nextStep: 'verify-email'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Step 2: Verify email with OTP
router.post('/verify-email', authLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otpCode } = req.body;

    // Find unverified user
    const unverifiedUser = await User.findUnverifiedByEmail(email);
    if (!unverifiedUser) {
      return res.status(404).json({
        message: 'No pending registration found for this email'
      });
    }

    // Verify OTP
    const otpVerification = await OTP.verifyOTP(email, otpCode, 'email_verification');
    if (!otpVerification.valid) {
      return res.status(400).json({
        message: otpVerification.message
      });
    }

    // Mark email as verified
    await User.verifyEmail(email);

    // Get the now-verified user
    const verifiedUser = await User.findByEmail(email);

    // Create welcome deposit transaction and update user credits
    const WELCOME_CREDITS = 10;
    try {
      const { getClient } = require('../config/database');
      const welcomeClient = await getClient();
      try {
        await welcomeClient.query('BEGIN');

        // Create welcome deposit transaction record
        await welcomeClient.query(
          `INSERT INTO transactions 
            (from_user_id, to_user_id, credits, transaction_type, description, exchange_request_id)
           VALUES (NULL, $1, $2, $3, $4, NULL)`,
          [verifiedUser.id, WELCOME_CREDITS, 'welcome_bonus', 'Welcome deposit — Initial 10 credits']
        );

        // Update user's time_credits (atomic with the transaction record above)
        await welcomeClient.query(
          'UPDATE users SET time_credits = time_credits + $1 WHERE id = $2',
          [WELCOME_CREDITS, verifiedUser.id]
        );

        await welcomeClient.query('COMMIT');
        console.log(`SUCCESS: Welcome deposit of ${WELCOME_CREDITS} credits created for user ${verifiedUser.id}`);
      } catch (txErr) {
        await welcomeClient.query('ROLLBACK');
        throw txErr;
      } finally {
        welcomeClient.release();
      }

      // Send welcome deposit email (outside transaction — non-critical)
      await emailService.sendWelcomeDepositEmail(
        verifiedUser.email,
        verifiedUser.first_name,
        WELCOME_CREDITS
      );
    } catch (error) {
      console.error('Failed to create welcome deposit:', error);
      // Don't fail the registration if deposit/email fails
    }

    // Re-fetch user to get the accurate credit balance after the welcome deposit
    const freshUser = await User.findById(verifiedUser.id);
    const creditBalance = freshUser ? Number(freshUser.time_credits) : (Number(verifiedUser.time_credits) || 0) + WELCOME_CREDITS;

    // Generate JWT token
    const token = generateToken(verifiedUser.id);

    res.cookie('auth_token', token, cookieOptions);
    res.json({
      message: 'Email verified successfully. Registration complete!',
      user: {
        id: verifiedUser.id,
        studentId: verifiedUser.student_id,
        email: verifiedUser.email,
        firstName: verifiedUser.first_name,
        lastName: verifiedUser.last_name,
        bio: verifiedUser.bio,
        degreeProgram: verifiedUser.degree_program,
        yearOfStudy: verifiedUser.year_of_study,
        timeCredits: creditBalance,
        emailVerified: verifiedUser.email_verified,
        skillsPossessing: verifiedUser.skills_possessing || [],
        skillsInterestedIn: verifiedUser.skills_interested_in || [],
        createdAt: verifiedUser.created_at
      },
      token
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Step 3: Resend OTP (with strict throttling)
router.post('/resend-otp', otpLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find unverified user
    const unverifiedUser = await User.findUnverifiedByEmail(email);
    if (!unverifiedUser) {
      // Don't reveal if email exists or not (security)
      return res.status(200).json({
        message: 'If an account exists with this email, a new verification code has been sent.'
      });
    }

    // Check OTP rate limiting (per email, not just IP)
    const otpAttempts = await OTP.getOTPAttempts(email, 60);
    if (otpAttempts >= 3) {
      return res.status(429).json({
        message: 'Too many OTP requests for this email. Please wait 1 hour before requesting another code.',
        retryAfter: 3600 // seconds
      });
    }

    // Check if there's a recent OTP (prevent spam within 1 minute)
    const recentOtpAttempts = await OTP.getOTPAttempts(email, 1);
    if (recentOtpAttempts >= 1) {
      return res.status(429).json({
        message: 'Please wait at least 1 minute before requesting a new code.',
        retryAfter: 60 // seconds
      });
    }

    // Generate and send new OTP
    const otpRecord = await OTP.createEmailOTP(email, 'email_verification');
    const emailResult = await emailService.sendOTPEmail(email, otpRecord.otp_code, 'email_verification');

    if (!emailResult.success) {
      console.error('Resend OTP email failed:', emailResult.error);
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    res.json({
      message: 'A new verification code has been sent to your email.',
      email: email
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      message: 'Failed to resend verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login user
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Check if there's an unverified user
      const unverifiedUser = await User.findUnverifiedByEmail(email);
      if (unverifiedUser) {
        return res.status(403).json({
          message: 'Please verify your email address before logging in',
          nextStep: 'verify-email',
          email: email
        });
      }
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in',
        nextStep: 'verify-email',
        email: email
      });
    }

    // Check if account is suspended
    if (user.is_suspended) {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support for assistance.',
        suspended: true
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check if user must change password
    const mustChangePassword = await PasswordReset.mustChangePassword(user.id);
    if (mustChangePassword) {
      // Generate token but indicate password change required
      const token = generateToken(user.id);
      res.cookie('auth_token', token, cookieOptions);
      return res.json({
        message: 'Password change required',
        mustChangePassword: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        token
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Get user skills
    const userSkills = await User.getUserSkills(user.id);

    // Return user data (without password) and token; also set httpOnly cookie
    res.cookie('auth_token', token, cookieOptions);
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        degreeProgram: user.degree_program,
        yearOfStudy: user.year_of_study,
        timeCredits: user.time_credits,
        totalRating: user.total_rating,
        ratingCount: user.rating_count,
        skills: userSkills,
        skillsPossessing: user.skills_possessing || [],
        skillsInterestedIn: user.skills_interested_in || []
      },
      token
    });

    // Fire background matching jobs asynchronously (non-blocking)
    triggerMatchingJobsOnLogin();

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        degreeProgram: user.degree_program,
        yearOfStudy: user.year_of_study,
        profilePictureUrl: getProfilePictureUrl(user.profile_picture_url, req),
        timeCredits: user.time_credits,
        totalRating: user.total_rating,
        ratingCount: user.rating_count,
        skillsPossessing: user.skills_possessing || [],
        skillsInterestedIn: user.skills_interested_in || [],
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({
    message: 'Logout successful'
  });
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user
  });
});

// Update profile endpoint
router.put('/profile', authenticateToken, [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must contain only letters and spaces'),
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must contain only letters and spaces'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('degreeProgram')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Degree program must be less than 200 characters'),
  body('yearOfStudy')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Year of study must be between 1 and 6'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { firstName, lastName, bio, degreeProgram, yearOfStudy, skills, skillsPossessing, skillsInterestedIn } = req.body;

    // Update user profile
    const updatedUser = await User.updateProfile(userId, {
      firstName,
      lastName,
      bio,
      degreeProgram,
      yearOfStudy,
      skillsPossessing,
      skillsInterestedIn
    });

    if (!updatedUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update user skills if provided
    let updatedSkills = [];
    if (skills && Array.isArray(skills)) {
      updatedSkills = await User.updateUserSkills(userId, skills);
    } else {
      // Get existing skills if none provided
      updatedSkills = await User.getUserSkills(userId);
    }

    // Format the response to match frontend expectations
    const formattedUser = {
      id: updatedUser.id,
      studentId: updatedUser.student_id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      bio: updatedUser.bio,
      degreeProgram: updatedUser.degree_program,
      yearOfStudy: updatedUser.year_of_study,
      profilePictureUrl: getProfilePictureUrl(updatedUser.profile_picture_url, req),
      timeCredits: updatedUser.time_credits,
      totalRating: updatedUser.total_rating,
      ratingCount: updatedUser.rating_count,
      skills: updatedSkills,
      skillsPossessing: updatedUser.skills_possessing || [],
      skillsInterestedIn: updatedUser.skills_interested_in || []
    };

    res.json({
      message: 'Profile updated successfully',
      user: formattedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await User.getUserStats(userId);
    
    res.json({
      message: 'User statistics retrieved successfully',
      stats: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user statistics',
      error: error.message
    });
  }
});

// Get user's skills (skills they offer)
router.get('/my-skills', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const skills = await User.getUserOfferedSkills(userId);
    
    res.json({
      message: 'User skills retrieved successfully',
      skills: skills
    });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user skills',
      error: error.message
    });
  }
});

// Get user exchange history
router.get('/exchange-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await User.getExchangeHistory(userId);
    
    res.json({
      message: 'Exchange history retrieved successfully',
      history: history
    });
  } catch (error) {
    console.error('Get exchange history error:', error);
    res.status(500).json({
      message: 'Failed to retrieve exchange history',
      error: error.message
    });
  }
});

// Get user reviews
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const reviews = await User.getUserReviews(userId);
    
    res.json({
      message: 'Reviews retrieved successfully',
      reviews: reviews
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      message: 'Failed to retrieve reviews',
      error: error.message
    });
  }
});

// Upload profile picture
router.post('/upload-profile-picture', authenticateToken, uploadProfilePicture.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const localFilePath = req.file.path;
    
    let profilePictureUrl;
    
    // Upload to Cloudinary if configured
    if (process.env.CLOUDINARY_URL) {
      profilePictureUrl = await uploadToCloudinary(localFilePath, 'nexus/profile-pictures');
      console.log('Profile picture uploaded to Cloudinary:', profilePictureUrl);
    } else {
      // Fallback to local storage for development
      profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    }

    // Get user's old profile picture
    const user = await User.findById(userId);
    const oldPictureUrl = user?.profile_picture_url;

    // Update user's profile picture in database
    await User.updateProfilePicture(userId, profilePictureUrl);

    // Delete old Cloudinary image if it exists
    if (oldPictureUrl && oldPictureUrl.includes('cloudinary.com') && process.env.CLOUDINARY_URL) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = oldPictureUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`nexus/profile-pictures/${publicId}`);
        console.log('Old Cloudinary image deleted:', publicId);
      } catch (deleteError) {
        console.log('Could not delete old Cloudinary image:', deleteError.message);
      }
    }

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePictureUrl
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    
    // Delete local uploaded file if upload fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      message: 'Failed to upload profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send password reset OTP to user's email (automatic, no admin required)
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(/^\d{9,10}@ub\.ac\.bw$/)
    .withMessage('Only University of Botswana student emails are allowed')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email — use generic response to prevent enumeration
    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a reset code has been sent.'
      });
    }

    // Generate and store OTP (deletes any prior OTP for this email/purpose)
    await OTP.createEmailOTP(email, 'password_reset');

    // Retrieve the OTP code we just stored
    const { query: dbQuery } = require('../config/database');
    const otpResult = await dbQuery(
      `SELECT otp_code FROM otps WHERE email = $1 AND purpose = 'password_reset' AND is_used = false ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    const otpCode = otpResult.rows[0]?.otp_code;

    if (!otpCode) {
      return res.status(500).json({ message: 'Failed to generate reset code' });
    }

    // Send OTP email
    const emailResult = await emailService.sendOTPEmail(email, otpCode, 'password_reset');
    if (!emailResult.success) {
      console.error('Failed to send password reset OTP email:', emailResult.error);
      return res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
    }

    res.json({
      message: 'If an account with that email exists, a reset code has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Failed to send reset code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Verify reset code without consuming it (used to reveal password fields)
router.post('/verify-reset-code', [
  body('email')
    .isEmail()
    .matches(/^\d{9,10}@ub\.ac\.bw$/)
    .withMessage('Only University of Botswana student emails are allowed'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Reset code must be a 6-digit number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed' });
    }

    const { email, code } = req.body;
    const { query: dbQuery } = require('../config/database');

    const result = await dbQuery(
      `SELECT id FROM otps WHERE email = $1 AND otp_code = $2 AND purpose = 'password_reset' AND expires_at > NOW() AND is_used = false`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired code.' });
    }

    res.json({ message: 'Code is valid.' });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Failed to verify code' });
  }
});

// Verify OTP and set new password (no login required)
router.post('/reset-password', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(/^\d{9,10}@ub\.ac\.bw$/)
    .withMessage('Only University of Botswana student emails are allowed'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Reset code must be a 6-digit number'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, code, newPassword } = req.body;

    // Verify OTP
    const otpResult = await OTP.verifyOTP(email, code, 'password_reset');
    if (!otpResult.valid) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Hash and save new password, clear must_change_password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashedPassword);
    await PasswordReset.clearMustChangePassword(user.id);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Change password (for users with must_change_password flag)
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password_hash (findById doesn't return it for security)
    const { query } = require('../config/database');
    const userResult = await query(
      'SELECT id, password_hash FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await User.verifyPassword(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.updatePassword(userId, hashedPassword);

    // Clear must_change_password flag
    await PasswordReset.clearMustChangePassword(userId);

    // Get updated user data to return
    const updatedUser = await User.findById(userId);

    // Issue a fresh token so password_changed_at doesn't invalidate this session
    const newToken = generateToken(userId);
    res.cookie('auth_token', newToken, cookieOptions);

    res.json({
      message: 'Password changed successfully',
      user: updatedUser,
      token: newToken
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Upload transcript
router.post('/upload-transcript', authenticateToken, uploadTranscript.single('transcript'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const relativePath = `/uploads/transcripts/${req.file.filename}`;
    const transcriptUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    // Get user's old transcript
    const user = await User.findById(userId);
    const oldTranscript = user?.transcript_url;

    // Update user's transcript in database (store relative path)
    await User.updateTranscript(userId, relativePath);

    // Delete old transcript if it exists
    if (oldTranscript) {
      const oldTranscriptPath = path.join(__dirname, '..', oldTranscript);
      if (fs.existsSync(oldTranscriptPath)) {
        fs.unlinkSync(oldTranscriptPath);
      }
    }

    res.json({
      message: 'Transcript uploaded successfully',
      transcriptUrl
    });
  } catch (error) {
    console.error('Upload transcript error:', error);
    
    // Delete uploaded file if database update fails
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({
      message: 'Failed to upload transcript',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete transcript
router.delete('/delete-transcript', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user?.transcript_url) {
      return res.status(404).json({ message: 'No transcript found' });
    }

    const transcriptPath = path.join(__dirname, '..', user.transcript_url);
    
    // Delete file from filesystem
    if (fs.existsSync(transcriptPath)) {
      fs.unlinkSync(transcriptPath);
    }

    // Remove from database
    await User.updateTranscript(userId, null);

    res.json({ message: 'Transcript deleted successfully' });
  } catch (error) {
    console.error('Delete transcript error:', error);
    res.status(500).json({
      message: 'Failed to delete transcript',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete profile picture
router.delete('/delete-profile-picture', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user?.profile_picture_url) {
      return res.status(404).json({ message: 'No profile picture found' });
    }

    const pictureUrl = user.profile_picture_url;
    
    // Delete from Cloudinary if it's a Cloudinary URL
    if (pictureUrl.includes('cloudinary.com') && process.env.CLOUDINARY_URL) {
      try {
        const publicId = pictureUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`nexus/profile-pictures/${publicId}`);
        console.log('Deleted from Cloudinary:', publicId);
      } catch (cloudinaryError) {
        console.log('Could not delete from Cloudinary:', cloudinaryError.message);
      }
    } else {
      // Fallback: delete from local filesystem
      const picturePath = path.join(__dirname, '..', pictureUrl);
      if (fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
    }

    // Remove from database
    await User.updateProfilePicture(userId, null);

    res.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({
      message: 'Failed to delete profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
