const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to verify admin JWT token
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get admin from database to verify they exist and are active
    const admin = await Admin.findById(decoded.userId);
    
    if (!admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Add admin info to request object
    req.admin = {
      id: admin.id,
      username: admin.username,
      role: 'admin'
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

module.exports = {
  authenticateAdmin
};
