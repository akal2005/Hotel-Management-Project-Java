const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * A reference to the in-memory blacklist maintained by authController.
 * Both modules share the same Set instance because Node caches modules.
 * In production this should be replaced by a Redis lookup.
 *
 * We require lazily (inside the function) to avoid a circular-dependency
 * error that would occur if we required authController at the top of this
 * file while authController also requires middleware indirectly.
 */
const getBlacklist = () => {
  // authController exports the Set through a named getter so we can share it
  // without a circular import.  Fall back to an empty Set if not available.
  try {
    return require('../controllers/authController').__blacklist;
  } catch (_) {
    return new Set();
  }
};

/**
 * Verify JWT and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject tokens whose jti has been blacklisted (i.e. user logged out)
    if (decoded.jti && getBlacklist().has(decoded.jti)) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    const users = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, u.is_active,
              r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Role-based access control
 * @param {...string} roles - allowed role names
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role_name)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required roles: ${roles.join(', ')}`,
    });
  }
  next();
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const users = await query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role_id, r.name AS role_name
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
        [decoded.userId]
      );
      if (users.length) req.user = users[0];
    }
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
