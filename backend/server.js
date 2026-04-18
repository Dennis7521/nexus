const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { pool, query } = require('./config/database');
const { startScheduledJobs } = require('./jobs/matchingJobs');
const { authenticateToken } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - production ready
// In production, ensure trust proxy is set if behind a load balancer
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000, // stricter in prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration - production strict
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] // Production: only allow configured origin
    : [process.env.FRONTEND_URL, 'http://localhost:5173'] // Dev: allow both
  : ['http://localhost:5173']; // Default: only localhost

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Stripe webhook must receive raw body — register before json middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware - 1MB limit for JSON (file uploads use multipart)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Public profile pictures (low sensitivity) - no auth required
app.use('/uploads/profile-pictures', express.static('uploads/profile-pictures'));

// Secure file serving for transcripts (high sensitivity) - requires authentication
app.get('/uploads/transcripts/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;
    
    // Security: Validate filename format (prevent directory traversal)
    if (!filename.match(/^[a-f0-9-]+-\d+\.[a-zA-Z0-9]+$/)) {
      return res.status(400).json({ message: 'Invalid filename format' });
    }
    
    // Check if user is requesting their own transcript or is an admin
    const isAdmin = req.user.role === 'admin';
    
    if (!isAdmin) {
      // Get user's transcript URL from database
      const userResult = await query(
        'SELECT transcript_url FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0 || !userResult.rows[0].transcript_url) {
        return res.status(403).json({ message: 'No transcript found for user' });
      }
      
      // Check if requested filename matches user's transcript
      const expectedPath = `/uploads/transcripts/${filename}`;
      if (userResult.rows[0].transcript_url !== expectedPath) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Serve the file
    const filePath = path.join(__dirname, 'uploads', 'transcripts', filename);
    
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Set appropriate content type for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="transcript.pdf"');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming transcript:', err);
      res.status(500).json({ message: 'Error serving file' });
    });
  } catch (error) {
    console.error('Error serving transcript:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NEXUS API is running',
    timestamp: new Date().toISOString()
  });
});

// Database connection test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({
      status: 'Connected',
      message: 'PostgreSQL connection successful',
      data: {
        current_time: result.rows[0].current_time,
        postgres_version: result.rows[0].postgres_version
      }
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({
      status: 'Error',
      message: 'PostgreSQL connection failed',
      error: error.message
    });
  }
});

// API Routes - Real authentication enabled
app.use('/api/auth', require('./routes/auth'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/matching', require('./routes/matching'));
app.use('/api/exchanges', require('./routes/exchanges'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/sync-exchanges', require('./routes/syncExchanges'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 NEXUS API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);

  // Start background matching cron jobs
  startScheduledJobs();
});

module.exports = app;
