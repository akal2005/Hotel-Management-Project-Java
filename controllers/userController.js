const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/users
 * List all users with filter options (role, search term)
 */
exports.listUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let sql = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, 
             u.email_verified, u.last_login, u.created_at, r.name AS role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ` AND r.name = ?`;
      params.push(role);
    }

    if (search) {
      sql += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY u.created_at DESC`;

    const users = await query(sql, params);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Get single user profile
 */
exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [user] = await query(
      `SELECT u.id, u.role_id, u.first_name, u.last_name, u.email, u.phone, u.is_active, 
              u.email_verified, u.last_login, u.created_at, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role_name === 'customer') {
      const [customer] = await query('SELECT * FROM customers WHERE user_id = ?', [id]);
      if (customer) user.customer_profile = customer;
    } else {
      const staffHotels = await query(
        `SELECT h.id, h.name, hs.is_primary 
         FROM hotel_staff hs
         JOIN hotels h ON hs.hotel_id = h.id
         WHERE hs.user_id = ?`,
        [id]
      );
      user.staff_hotels = staffHotels;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users
 * Admin creates user (e.g. staff, manager, housekeeper)
 */
exports.createUser = async (req, res, next) => {
  try {
    const { role_id, first_name, last_name, email, password, phone, hotel_id } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password || 'Password@123', salt); // Default password

    const userId = await transaction(async (conn) => {
      const [userRes] = await conn.execute(
        `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [role_id, first_name, last_name, email, hash, phone || null]
      );
      const id = userRes.insertId;

      // If customer role (4)
      if (role_id === 4) {
        await conn.execute('INSERT INTO customers (user_id) VALUES (?)', [id]);
      }
      
      // If staff/manager role (2=Manager, 3=Receptionist, 5=Housekeeper) and hotel_id provided
      if ([2, 3, 5].includes(Number(role_id)) && hotel_id) {
        await conn.execute(
          'INSERT INTO hotel_staff (user_id, hotel_id, is_primary) VALUES (?, ?, TRUE)',
          [id, hotel_id]
        );
      }
      
      return id;
    });

    req.entityId = userId; // For activity log
    logger.info(`User created by Admin: ${email} (id=${userId})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { userId },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 * Admin updates user
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, is_active, role_id, hotel_id } = req.body;

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE users 
         SET first_name = ?, last_name = ?, phone = ?, is_active = ?, role_id = ?
         WHERE id = ?`,
        [first_name, last_name, phone || null, is_active, role_id, id]
      );

      // If hotel_id is specified for staff
      if ([2, 3, 5].includes(Number(role_id)) && hotel_id) {
        // Delete previous staff assignment
        await conn.execute('DELETE FROM hotel_staff WHERE user_id = ?', [id]);
        // Insert new assignment
        await conn.execute(
          'INSERT INTO hotel_staff (user_id, hotel_id, is_primary) VALUES (?, ?, TRUE)',
          [id, hotel_id]
        );
      }
    });

    req.entityId = id; // For activity log
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Deactivates user
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Toggle active status to false
    await query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
    
    req.entityId = id; // For activity log
    logger.info(`User id=${id} deactivated by admin`);
    
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/staff/assign
 * Assign staff to hotel
 */
exports.assignStaff = async (req, res, next) => {
  try {
    const { user_id, hotel_id, is_primary } = req.body;

    await query(
      `INSERT INTO hotel_staff (user_id, hotel_id, is_primary)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE hotel_id = ?, is_primary = ?`,
      [user_id, hotel_id, is_primary ?? true, hotel_id, is_primary ?? true]
    );

    res.json({ success: true, message: 'Staff assigned to hotel successfully' });
  } catch (err) {
    next(err);
  }
};
