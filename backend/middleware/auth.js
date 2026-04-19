const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Accept token from httpOnly cookie (preferred) or Authorization header (fallback)
    const cookieToken = req.cookies?.auth_token;
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database (include password_changed_at for session invalidation)
    const result = await query(
      `SELECT id, student_id, email, first_name, last_name, time_credits, is_active,
              COALESCE(is_suspended, false) as is_suspended, password_changed_at
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support for assistance.' });
    }

    // Reject tokens that were issued before the last password change
    if (user.password_changed_at) {
      const tokenIssuedAt = decoded.iat * 1000; // JWT iat is in seconds
      if (new Date(user.password_changed_at).getTime() > tokenIssuedAt) {
        return res.status(401).json({ message: 'Session expired due to password change. Please log in again.' });
      }
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Middleware to check if user owns resource
const checkResourceOwnership = (resourceIdParam = 'id', userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      // This is a generic middleware - specific implementations should be in route handlers
      req.resourceId = resourceId;
      req.userIdField = userIdField;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({ message: 'Authorization error' });
    }
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Refresh token middleware (optional - for future implementation)
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token (implement refresh token logic as needed)
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Generate new access token
    const newToken = generateToken(decoded.userId);
    
    res.json({ token: newToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

module.exports = {
  authenticateToken,
  checkResourceOwnership,
  generateToken,
  refreshToken
};
