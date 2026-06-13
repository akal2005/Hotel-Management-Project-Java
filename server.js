require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

const logger                    = require('./utils/logger');
const routes                    = require('./routes/index');
const authRoutes                = require('./routes/auth.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Initialize DB connection
require('./config/database');

const app  = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX    || '100'),
  message:  { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// ============================================================
// GENERAL MIDDLEWARE
// ============================================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Static files (uploads)
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ============================================================
// API ROUTES
// ============================================================
// Dedicated auth router (register / login / forgot-password / etc.)
// Must be mounted BEFORE the monolithic index router so its /auth/* paths
// take precedence and the more-specific validation rules apply.
app.use('/api/auth', authRoutes);

// All other API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Hotel Management System API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(notFound);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
const server = app.listen(PORT, () => {
  logger.info(`🚀 Hotel Management API running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = app;
