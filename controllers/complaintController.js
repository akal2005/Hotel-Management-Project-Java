const { query } = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/email.service');

// Helper to generate complaint reference
const generateComplaintRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'CMP-';
  for (let i = 0; i < 5; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

/**
 * GET /api/complaints
 * List complaints based on role
 */
exports.listComplaints = async (req, res, next) => {
  try {
    let complaints;

    if (req.user.role_name === 'customer') {
      const [customer] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!customer) return res.json({ success: true, data: [] });

      complaints = await query(
        `SELECT c.*, h.name AS hotel_name 
         FROM complaints c
         JOIN hotels h ON c.hotel_id = h.id
         WHERE c.customer_id = ? ORDER BY c.created_at DESC`,
        [customer.id]
      );
    } else {
      // For staff, get staff hotels
      const staffHotels = await query('SELECT hotel_id FROM hotel_staff WHERE user_id = ?', [req.user.id]);
      const hotelIds = staffHotels.map(sh => sh.hotel_id);

      if (req.user.role_name !== 'admin' && hotelIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      let sql = `
        SELECT c.*, h.name AS hotel_name, u.first_name AS guest_first, u.last_name AS guest_last,
               s.first_name AS staff_first, s.last_name AS staff_last
        FROM complaints c
        JOIN hotels h ON c.hotel_id = h.id
        JOIN customers cust ON c.customer_id = cust.id
        JOIN users u ON cust.user_id = u.id
        LEFT JOIN users s ON c.assigned_to = s.id
      `;
      const params = [];

      if (req.user.role_name !== 'admin') {
        sql += ` WHERE c.hotel_id IN (${hotelIds.map(() => '?').join(',')})`;
        params.push(...hotelIds);
      }

      sql += ` ORDER BY c.created_at DESC`;
      complaints = await query(sql, params);
    }

    res.json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/complaints/:id
 * Get single complaint details
 */
exports.getComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [complaint] = await query(
      `SELECT c.*, h.name AS hotel_name, u.first_name AS guest_first, u.last_name AS guest_last, u.email AS guest_email,
              s.first_name AS staff_first, s.last_name AS staff_last
       FROM complaints c
       JOIN hotels h ON c.hotel_id = h.id
       JOIN customers cust ON c.customer_id = cust.id
       JOIN users u ON cust.user_id = u.id
       LEFT JOIN users s ON c.assigned_to = s.id
       WHERE c.id = ?`,
      [id]
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Role verification
    if (req.user.role_name === 'customer') {
      const [customer] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!customer || complaint.customer_id !== customer.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/complaints
 * File a new complaint
 */
exports.createComplaint = async (req, res, next) => {
  try {
    const { hotel_id, subject, description } = req.body;
    let customerId;

    if (req.user.role_name === 'customer') {
      const [customer] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!customer) return res.status(400).json({ success: false, message: 'Customer profile not found' });
      customerId = customer.id;
    } else {
      // Staff booking on behalf of customer (guest_id required)
      customerId = req.body.guest_id;
      if (!customerId) return res.status(400).json({ success: false, message: 'Guest ID is required' });
    }

    const complaintRef = generateComplaintRef();

    const result = await query(
      `INSERT INTO complaints (customer_id, hotel_id, complaint_ref, subject, description, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [customerId, hotel_id, complaintRef, subject, description]
    );

    req.entityId = result.insertId;
    logger.info(`Complaint filed: ${complaintRef} for hotel_id=${hotel_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully',
      data: { complaint_id: result.insertId, complaint_ref: complaintRef }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/complaints/:id/assign
 * Assign complaint to staff member
 */
exports.assignComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body; // user_id of staff

    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'Staff user ID is required' });
    }

    await query(
      "UPDATE complaints SET assigned_to = ?, status = 'assigned' WHERE id = ?",
      [assigned_to, id]
    );

    req.entityId = id;
    res.json({ success: true, message: 'Complaint assigned successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/complaints/:id/resolve
 * Mark complaint resolved or update resolution comments
 */
exports.resolveComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body; // status: resolved, closed, in_progress

    await query(
      "UPDATE complaints SET status = ?, resolution = ? WHERE id = ?",
      [status || 'resolved', resolution || null, id]
    );

    // Fetch guest details for notification email
    const [guestDetails] = await query(
      `SELECT u.email, u.first_name, c.complaint_ref, c.subject, c.status, c.resolution
       FROM complaints c
       JOIN customers cust ON c.customer_id = cust.id
       JOIN users u ON cust.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (guestDetails && guestDetails.status === 'resolved') {
      emailService.sendComplaintUpdateEmail({
        email: guestDetails.email,
        first_name: guestDetails.first_name,
        complaint: guestDetails,
      }).catch(err => logger.warn('Complaint resolution email failed:', err.message));
    }

    req.entityId = id;
    res.json({ success: true, message: 'Complaint updated successfully' });
  } catch (err) {
    next(err);
  }
};
