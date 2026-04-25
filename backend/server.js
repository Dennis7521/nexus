const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { pool, query } = require('./config/database');
const { runStartupMigrations } = require('./config/migrations');
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

// CORS configuration - allow Vercel and configured origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://nexus-blond-one.vercel.app',
  'https://nexus-ahs9clzn-mothusigaamangwe64-5687s-projects.vercel.app'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel subdomain
    if (origin && origin.includes('vercel.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
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

// Cookie parser — required for httpOnly JWT cookie support
app.use(cookieParser());

// uploads base directory - use env var for Railway volumes, fallback to local
const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

// Public profile pictures (low sensitivity) - no auth required
app.use('/uploads/profile-pictures', express.static(path.join(uploadsBaseDir, 'profile-pictures')));

// Secure file serving for transcripts (high sensitivity) - requires authentication
app.get('/uploads/transcripts/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;
    
    // Security: Validate filename format (prevent directory traversal)
    if (!filename.match(/^[a-f0-9-]+-\d+\.[a-zA-Z0-9]+$/)) {
      return res.status(400).json({ message: 'Invalid filename format' });
    }
    
    // Any authenticated user can view a transcript that belongs to some
    // user on the platform (instructors' transcripts are used to verify
    // skills publicly to other learners). We just confirm the requested
    // filename actually corresponds to a user's stored transcript.
    const expectedPath = `/uploads/transcripts/${filename}`;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const ownerResult = await query(
        'SELECT id FROM users WHERE transcript_url = $1 LIMIT 1',
        [expectedPath]
      );

      if (ownerResult.rows.length === 0) {
        return res.status(404).json({ message: 'Transcript not found' });
      }
    }
    
    // Serve the file
    const filePath = path.join(uploadsBaseDir, 'transcripts', filename);
    
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

// Health check endpoint (BEFORE logging to ensure it works)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NEXUS API is running',
    timestamp: new Date().toISOString()
  });
});

// Logging middleware
app.use(morgan('combined'));

// API Routes
console.log('Loading routes...');

const routes = [
  { path: '/api/auth', module: './routes/auth', name: 'auth' },
  { path: '/api/skills', module: './routes/skills', name: 'skills' },
  { path: '/api/matches', module: './routes/matches', name: 'matches' },
  { path: '/api/matching', module: './routes/matching', name: 'matching' },
  { path: '/api/exchanges', module: './routes/exchanges', name: 'exchanges' },
  { path: '/api/messages', module: './routes/messages', name: 'messages' },
  { path: '/api/users', module: './routes/users', name: 'users' },
  { path: '/api/notifications', module: './routes/notifications', name: 'notifications' },
  { path: '/api/transactions', module: './routes/transactions', name: 'transactions' },
  { path: '/api/reports', module: './routes/reports', name: 'reports' },
  { path: '/api/sync-exchanges', module: './routes/syncExchanges', name: 'sync-exchanges' },
  { path: '/api/payments', module: './routes/payments', name: 'payments' },
  { path: '/api/admin', module: './routes/admin', name: 'admin' }
];

routes.forEach(({ path, module, name }) => {
  try {
    const router = require(module);
    app.use(path, router);
    console.log(`✓ ${name} routes loaded at ${path}`);
  } catch (error) {
    console.error(`✗ ${name} routes FAILED:`, error.message);
  }
});

console.log('Routes loading complete.');

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

app.listen(PORT, async () => {
  console.log(`NEXUS API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Apply idempotent schema migrations before background jobs run
  await runStartupMigrations();

  // Start background matching cron jobs
  startScheduledJobs();
});

module.exports = app;
