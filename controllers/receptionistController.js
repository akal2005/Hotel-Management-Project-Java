const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/receptionist/dashboard
 * Summary stats for front desk
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const { hotel_id } = req.query;
    
    if (!hotel_id) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const arrivals = await query(
      `SELECT b.*, u.first_name, u.last_name 
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE b.hotel_id = ? AND b.check_in_date = ? AND b.status = 'confirmed'`,
      [hotel_id, today]
    );

    const departures = await query(
      `SELECT b.*, u.first_name, u.last_name 
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE b.hotel_id = ? AND b.check_out_date = ? AND b.status = 'checked_in'`,
      [hotel_id, today]
    );

    const [roomsCount] = await query(
      `SELECT 
         COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
         COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
         COUNT(CASE WHEN status = 'dirty' THEN 1 END) as dirty,
         COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance
       FROM rooms WHERE hotel_id = ?`,
      [hotel_id]
    );

    res.json({
      success: true,
      data: {
        arrivals,
        departures,
        room_stats: roomsCount,
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/receptionist/check-in/:booking_id
 * Check-in a guest
 */
exports.checkIn = async (req, res, next) => {
  try {
    const { booking_id } = req.params;

    const [booking] = await query('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: `Cannot check-in. Booking status is ${booking.status}` });
    }

    await transaction(async (conn) => {
      // Update booking status
      await conn.execute("UPDATE bookings SET status = 'checked_in' WHERE id = ?", [booking_id]);
      
      // Update room status to occupied
      if (booking.room_id) {
        await conn.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", [booking.room_id]);
      }
    });

    req.entityId = booking_id;
    logger.info(`Guest checked-in: Booking ref ${booking.booking_ref}`);
    res.json({ success: true, message: 'Guest checked-in successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/receptionist/check-out/:booking_id
 * Check-out a guest (marks room dirty)
 */
exports.checkOut = async (req, res, next) => {
  try {
    const { booking_id } = req.params;

    const [booking] = await query('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'checked_in') {
      return res.status(400).json({ success: false, message: `Cannot check-out. Booking status is ${booking.status}` });
    }

    // Verify all payments are completed before checkout
    const payments = await query('SELECT status FROM payments WHERE booking_id = ?', [booking_id]);
    const pendingPayment = payments.some(p => p.status === 'pending');
    if (pendingPayment) {
      return res.status(400).json({ success: false, message: 'Cannot check-out. There are pending payments on this booking.' });
    }

    await transaction(async (conn) => {
      // Update booking status
      await conn.execute("UPDATE bookings SET status = 'checked_out' WHERE id = ?", [booking_id]);
      
      // Update room status to dirty (so housekeeping cleans it)
      if (booking.room_id) {
        await conn.execute("UPDATE rooms SET status = 'dirty' WHERE id = ?", [booking.room_id]);
      }
    });

    req.entityId = booking_id;
    logger.info(`Guest checked-out: Booking ref ${booking.booking_ref}`);
    res.json({ success: true, message: 'Guest checked-out successfully. Room status set to Dirty.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/receptionist/walk-in
 * Create a direct walk-in booking and check-in
 */
exports.walkInBooking = async (req, res, next) => {
  try {
    const { hotel_id, category_id, check_in_date, check_out_date, first_name, last_name, email, phone, payment_method } = req.body;

    // 1. Create customer if not exists, or get existing
    let customerId;
    let [existingUser] = await query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUser) {
      const [cust] = await query('SELECT id FROM customers WHERE user_id = ?', [existingUser.id]);
      customerId = cust.id;
    } else {
      // Create a guest user
      const randPassword = Math.random().toString(36).substring(2, 10);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(randPassword, salt);
      
      customerId = await transaction(async (conn) => {
        const [uRes] = await conn.execute(
          `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, email_verified)
           VALUES (4, ?, ?, ?, ?, ?, TRUE)`,
          [first_name, last_name, email, hash, phone || null]
        );
        const [cRes] = await conn.execute(
          'INSERT INTO customers (user_id) VALUES (?)',
          [uRes.insertId]
        );
        return cRes.insertId;
      });
    }

    // 2. Find available room
    const availableRooms = await query(
      `SELECT r.id, r.room_number, rc.base_price
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE r.hotel_id = ? AND r.category_id = ? AND r.status = 'available'
         AND r.id NOT IN (
           SELECT DISTINCT b.room_id FROM bookings b
           WHERE b.hotel_id = ? AND b.room_id IS NOT NULL
             AND b.check_in_date < ? AND b.check_out_date > ?
             AND b.status NOT IN ('cancelled', 'checked_out')
         )
       LIMIT 1`,
      [hotel_id, category_id, hotel_id, check_out_date, check_in_date]
    );

    if (availableRooms.length === 0) {
      return res.status(409).json({ success: false, message: 'No rooms available in this category.' });
    }

    const room = availableRooms[0];
    const nights = Math.max(1, Math.ceil((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24)));
    const totalAmount = room.base_price * nights;
    
    // Generate Booking reference
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let bookingRef = 'WK-';
    for (let i = 0; i < 6; i++) bookingRef += chars.charAt(Math.floor(Math.random() * chars.length));

    // 3. Insert Booking (status: checked_in), payment completed, room occupied
    const result = await transaction(async (conn) => {
      const [bRes] = await conn.execute(
        `INSERT INTO bookings (customer_id, hotel_id, room_id, booking_ref, check_in_date, check_out_date, status, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, 'checked_in', ?)`,
        [customerId, hotel_id, room.id, bookingRef, check_in_date, check_out_date, totalAmount]
      );

      await conn.execute(
        `INSERT INTO payments (booking_id, amount, payment_method, status, transaction_ref)
         VALUES (?, ?, ?, 'completed', ?)`,
        [bRes.insertId, totalAmount, payment_method || 'Cash', 'txn_walkin_' + Date.now()]
      );

      await conn.execute(
        `UPDATE rooms SET status = 'occupied' WHERE id = ?`,
        [room.id]
      );

      return bRes.insertId;
    });

    res.status(201).json({
      success: true,
      message: 'Walk-in booking created and checked-in successfully',
      data: { booking_id: result, booking_ref: bookingRef, room_number: room.room_number, total_amount: totalAmount }
    });
  } catch (err) {
    next(err);
  }
};
