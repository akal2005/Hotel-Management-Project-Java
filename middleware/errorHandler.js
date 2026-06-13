const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * 404 Route handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error handler
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  
  logger.error(`Error: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

/**
 * express-validator request validation formatter
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Activity log middleware.
 * Intercepts request completion and writes to the DB activity_logs table.
 */
const activityLog = (action, entityType) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user ? req.user.id : (req.userId || null);
          const entityId = req.entityId || userId;
          const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
          const userAgent = req.get('user-agent')?.substring(0, 500) || null;

          await query(
            `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, action, entityType, entityId, ip, userAgent]
          );
        } catch (err) {
          logger.warn(`Activity log write failed: ${err.message}`);
        }
      }
    });
    next();
  };
};

module.exports = {
  notFound,
  errorHandler,
  validate,
  activityLog,
};
