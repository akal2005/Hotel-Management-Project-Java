const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const logger  = require('../utils/logger');
const emailService = require('../services/email.service');

/**
 * In-memory refresh-token blacklist.
 * In production replace with a Redis SET with TTL matching the token expiry.
 */
const tokenBlacklist = new Set();

/**
 * Exported so src/middleware/auth.js can share the same Set instance.
 * Node's module cache guarantees both files reference the same object.
 */
exports.__blacklist = tokenBlacklist;

/**
 * Issue a matched access + refresh token pair.
 * Both carry a shared `jti` so a logout can invalidate both at once.
 */
const generateTokens = (userId) => {
  const jti = uuidv4();

  const access = jwt.sign(
    { userId, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refresh = jwt.sign(
    { userId, jti },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { access, refresh };
};

/**
 * Check whether a token's jti has been blacklisted (i.e. logged out).
 */
const isBlacklisted = (jti) => tokenBlacklist.has(jti);

/** POST /api/auth/register */
exports.register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, phone } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    // Generate e-mail verification token (hex, 32 bytes → 64 chars)
    const verifyToken     = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const verifyExpiry    = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    const userId = await transaction(async (conn) => {
      const [userRes] = await conn.execute(
        `INSERT INTO users
           (role_id, first_name, last_name, email, password_hash, phone,
            email_verify_token, email_verify_expires)
         VALUES (4, ?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email, hash, phone || null,
         verifyTokenHash, verifyExpiry]
      );
      const id = userRes.insertId;
      await conn.execute('INSERT INTO customers (user_id) VALUES (?)', [id]);
      return id;
    });

    // Fire-and-forget — don't block the response on e-mail delivery
    emailService.sendVerificationEmail({ email, first_name, token: verifyToken }).catch(
      (err) => logger.warn('Verification e-mail failed to send:', err.message)
    );

    const tokens    = generateTokens(userId);
    const [user]    = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [userId]
    );

    // Attach user information to request object for downstream activity log middleware
    req.userId = userId;
    req.entityId = userId;

    logger.info(`New customer registered: ${email} (id=${userId})`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: { user, tokens },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/login */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const users = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.password_hash,
              u.is_active, u.avatar_url, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const tokens = generateTokens(user.id);
    const { password_hash, ...safeUser } = user;

    // For customers, fetch customer profile ID
    if (user.role === 'customer') {
      const cust = await query('SELECT id FROM customers WHERE user_id = ?', [user.id]);
      if (cust.length) safeUser.customer_id = cust[0].id;
    }

    // For staff, fetch hotel assignments
    if (['manager','receptionist','housekeeping'].includes(user.role)) {
      const hotels = await query(
        `SELECT h.id, h.name, hs.is_primary FROM hotel_staff hs
         JOIN hotels h ON hs.hotel_id = h.id WHERE hs.user_id = ?`,
        [user.id]
      );
      safeUser.hotels = hotels;
    }

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES (?, 'USER_LOGIN', 'user', ?, ?, ?)`,
      [user.id, user.id, req.ip, req.get('user-agent')?.substring(0, 500)]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, tokens },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/refresh */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Reject if the token family has been logged out
    if (decoded.jti && isBlacklisted(decoded.jti)) {
      return res.status(401).json({ success: false, message: 'Refresh token has been revoked' });
    }

    const users = await query('SELECT id, is_active FROM users WHERE id = ?', [decoded.userId]);
    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    // Blacklist the old jti before issuing new tokens (token rotation)
    if (decoded.jti) tokenBlacklist.add(decoded.jti);

    const tokens = generateTokens(decoded.userId);
    res.json({ success: true, data: { tokens } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/me */
exports.me = async (req, res, next) => {
  try {
    const users = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.is_active, u.email_verified, u.last_login, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    if (user.role === 'customer') {
      const cust = await query('SELECT * FROM customers WHERE user_id = ?', [user.id]);
      if (cust.length) user.customer_profile = cust[0];
    }

    if (['manager','receptionist','housekeeping'].includes(user.role)) {
      const hotels = await query(
        `SELECT h.id, h.name, hs.is_primary FROM hotel_staff hs
         JOIN hotels h ON hs.hotel_id = h.id WHERE hs.user_id = ?`,
        [user.id]
      );
      user.hotels = hotels;
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/auth/change-password */
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const users = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid  = await bcrypt.compare(current_password, users[0].password_hash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(new_password, salt);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/logout */
exports.logout = async (req, res, next) => {
  try {
    const raw = req.headers.authorization?.split(' ')[1];
    if (raw) {
      try {
        const decoded = jwt.decode(raw);
        if (decoded?.jti) tokenBlacklist.add(decoded.jti);
      } catch (_) { /* non-fatal */ }
    }

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES (?, 'USER_LOGOUT', 'user', ?, ?, ?)`,
      [req.user.id, req.user.id, req.ip, req.get('user-agent')?.substring(0, 500)]
    );

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/auth/me */
exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone } = req.body;

    await query(
      `UPDATE users
       SET first_name = COALESCE(?, first_name),
           last_name  = COALESCE(?, last_name),
           phone      = COALESCE(?, phone)
       WHERE id = ?`,
      [first_name || null, last_name || null, phone || null, req.user.id]
    );

    if (req.user.role_name === 'customer') {
      const {
        date_of_birth, nationality, id_type, id_number,
        address, city, country, preferred_room_type, special_requests,
      } = req.body;

      await query(
        `UPDATE customers
         SET date_of_birth        = COALESCE(?, date_of_birth),
             nationality          = COALESCE(?, nationality),
             id_type              = COALESCE(?, id_type),
             id_number            = COALESCE(?, id_number),
             address              = COALESCE(?, address),
             city                 = COALESCE(?, city),
             country              = COALESCE(?, country),
             preferred_room_type  = COALESCE(?, preferred_room_type),
             special_requests     = COALESCE(?, special_requests)
         WHERE user_id = ?`,
        [
          date_of_birth || null, nationality || null,
          id_type || null,       id_number || null,
          address || null,       city || null,
          country || null,       preferred_room_type || null,
          special_requests || null,
          req.user.id,
        ]
      );
    }

    const [user] = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.is_active, u.email_verified, u.last_login, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );

    if (req.user.role_name === 'customer') {
      const [cust] = await query('SELECT * FROM customers WHERE user_id = ?', [req.user.id]);
      if (cust) user.customer_profile = cust;
    }

    res.json({ success: true, message: 'Profile updated successfully', data: { user } });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/forgot-password */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const [user] = await query(
      'SELECT id, first_name, is_active FROM users WHERE email = ?',
      [email]
    );

    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    if (!user || !user.is_active) {
      return res.json(genericResponse);
    }

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry      = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users
       SET password_reset_token   = ?,
           password_reset_expires = ?
       WHERE id = ?`,
      [hashedToken, expiry, user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await emailService.sendPasswordResetEmail({
      email,
      first_name: user.first_name,
      reset_url:  resetUrl,
      expires_in: '1 hour',
    }).catch((err) => logger.warn('Password reset e-mail failed:', err.message));

    logger.info(`Password reset requested for user id=${user.id}`);
    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/reset-password */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [user] = await query(
      `SELECT id, email, first_name
       FROM users
       WHERE password_reset_token   = ?
         AND password_reset_expires  > NOW()
         AND is_active               = TRUE`,
      [hashedToken]
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired. Please request a new one.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(new_password, salt);

    await query(
      `UPDATE users
       SET password_hash           = ?,
           password_reset_token    = NULL,
           password_reset_expires  = NULL
       WHERE id = ?`,
      [hash, user.id]
    );

    await emailService.sendPasswordChangedEmail({
      email:      user.email,
      first_name: user.first_name,
    }).catch((err) => logger.warn('Password-changed e-mail failed:', err.message));

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES (?, 'PASSWORD_RESET', 'user', ?, ?)`,
      [user.id, user.id, req.ip]
    );

    logger.info(`Password reset completed for user id=${user.id}`);
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/verify-email/:token */
exports.verifyEmail = async (req, res, next) => {
  try {
    const rawToken    = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const [user] = await query(
      `SELECT id
       FROM users
       WHERE email_verify_token   = ?
         AND email_verify_expires  > NOW()`,
      [hashedToken]
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired. Please register again.',
      });
    }

    await query(
      `UPDATE users
       SET email_verified        = TRUE,
           email_verify_token    = NULL,
           email_verify_expires  = NULL
       WHERE id = ?`,
      [user.id]
    );

    logger.info(`Email verified for user id=${user.id}`);
    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};
