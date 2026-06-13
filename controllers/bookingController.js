const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/email.service');

// Helper to generate a unique booking reference
const generateBookingRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'BK-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

/**
 * POST /api/bookings/check-availability
 * Check room category availability
 */
exports.checkAvailability = async (req, res, next) => {
  try {
    const { hotel_id, category_id, check_in_date, check_out_date } = req.body;

    if (!hotel_id || !category_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const availableRooms = await query(
      `SELECT r.id, r.room_number 
       FROM rooms r
       WHERE r.hotel_id = ? AND r.category_id = ? AND r.status = 'available'
         AND r.id NOT IN (
           SELECT DISTINCT b.room_id 
           FROM bookings b
           WHERE b.hotel_id = ? 
             AND b.room_id IS NOT NULL
             AND b.check_in_date < ? 
             AND b.check_out_date > ?
             AND b.status NOT IN ('cancelled', 'checked_out')
         )`,
      [hotel_id, category_id, hotel_id, check_out_date, check_in_date]
    );

    res.json({
      success: true,
      available: availableRooms.length > 0,
      count: availableRooms.length,
      rooms: availableRooms,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings
 * List bookings (filtered by user type)
 */
exports.listBookings = async (req, res, next) => {
  try {
    let bookings;
    
    // Customers can only see their own bookings
    if (req.user.role_name === 'customer') {
      const [customer] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!customer) {
        return res.json({ success: true, data: [] });
      }
      
      bookings = await query(
        `SELECT b.*, h.name AS hotel_name, rc.name AS category_name, r.room_number
         FROM bookings b
         JOIN hotels h ON b.hotel_id = h.id
         LEFT JOIN rooms r ON b.room_id = r.id
         LEFT JOIN room_categories rc ON r.category_id = rc.id
         WHERE b.customer_id = ? ORDER BY b.check_in_date DESC`,
        [customer.id]
      );
    } else {
      // Staff members see bookings associated with their hotel
      const staffHotels = await query('SELECT hotel_id FROM hotel_staff WHERE user_id = ?', [req.user.id]);
      const hotelIds = staffHotels.map(sh => sh.hotel_id);

      if (req.user.role_name !== 'admin' && hotelIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      let sql = `
        SELECT b.*, h.name AS hotel_name, rc.name AS category_name, r.room_number,
               u.first_name, u.last_name, u.email, u.phone
        FROM bookings b
        JOIN hotels h ON b.hotel_id = h.id
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN room_categories rc ON r.category_id = rc.id
        JOIN customers c ON b.customer_id = c.id
        JOIN users u ON c.user_id = u.id
      `;
      const params = [];

      if (req.user.role_name !== 'admin') {
        sql += ` WHERE b.hotel_id IN (${hotelIds.map(() => '?').join(',')})`;
        params.push(...hotelIds);
      }

      sql += ` ORDER BY b.created_at DESC`;
      bookings = await query(sql, params);
    }

    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:id
 * Get single booking
 */
exports.getBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [booking] = await query(
      `SELECT b.*, h.name AS hotel_name, rc.name AS category_name, r.room_number,
              u.first_name, u.last_name, u.email, u.phone
       FROM bookings b
       JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN room_categories rc ON r.category_id = rc.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Role-based security checks
    if (req.user.role_name === 'customer') {
      const [customer] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!customer || booking.customer_id !== customer.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role_name !== 'admin') {
      // Staff check: does this user belong to the booking hotel?
      const [staffCheck] = await query(
        'SELECT id FROM hotel_staff WHERE user_id = ? AND hotel_id = ?',
        [req.user.id, booking.hotel_id]
      );
      if (!staffCheck) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const payments = await query('SELECT * FROM payments WHERE booking_id = ?', [id]);
    booking.payments = payments;

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings
 * Create a booking
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { hotel_id, category_id, check_in_date, check_out_date, guest_id } = req.body;
    let customerId;

    if (req.user.role_name === 'customer') {
      const [cust] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!cust) return res.status(400).json({ success: false, message: 'Customer profile not found' });
      customerId = cust.id;
    } else {
      // Admin/Receptionist can book for any guest by passing guest_id (customer table id)
      customerId = guest_id;
      if (!customerId) return res.status(400).json({ success: false, message: 'Guest ID is required' });
    }

    // 1. Find an available room in the category
    const availableRooms = await query(
      `SELECT r.id, r.room_number, rc.base_price, rc.name AS category_name, h.name AS hotel_name
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.hotel_id = ? AND r.category_id = ? AND r.status = 'available'
         AND r.id NOT IN (
           SELECT DISTINCT b.room_id 
           FROM bookings b
           WHERE b.hotel_id = ? 
             AND b.room_id IS NOT NULL
             AND b.check_in_date < ? 
             AND b.check_out_date > ?
             AND b.status NOT IN ('cancelled', 'checked_out')
         )
       LIMIT 1`,
      [hotel_id, category_id, hotel_id, check_out_date, check_in_date]
    );

    if (availableRooms.length === 0) {
      return res.status(409).json({ success: false, message: 'No rooms available in this category for the selected dates' });
    }

    const selectedRoom = availableRooms[0];

    // 2. Calculate price
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const totalAmount = selectedRoom.base_price * nights;

    // 3. Insert booking
    const bookingRef = generateBookingRef();
    const result = await transaction(async (conn) => {
      const [bookRes] = await conn.execute(
        `INSERT INTO bookings (customer_id, hotel_id, room_id, booking_ref, check_in_date, check_out_date, status, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
        [customerId, hotel_id, selectedRoom.id, bookingRef, check_in_date, check_out_date, totalAmount]
      );
      
      // Auto create a pending payment record
      await conn.execute(
        `INSERT INTO payments (booking_id, amount, payment_method, status)
         VALUES (?, ?, 'Card', 'pending')`,
        [bookRes.insertId, totalAmount]
      );
      
      return bookRes.insertId;
    });

    // 4. Send Confirmation Email (Async)
    const [userEmail] = await query(
      `SELECT u.email, u.first_name FROM users u JOIN customers c ON c.user_id = u.id WHERE c.id = ?`,
      [customerId]
    );

    if (userEmail) {
      emailService.sendBookingConfirmationEmail({
        email: userEmail.email,
        first_name: userEmail.first_name,
        booking: {
          id: result,
          booking_ref: bookingRef,
          hotel_name: selectedRoom.hotel_name,
          room_category: selectedRoom.category_name,
          room_number: selectedRoom.room_number,
          check_in_date,
          check_out_date,
          total_amount,
        }
      }).catch(err => logger.warn('Booking confirmation email failed:', err.message));
    }

    req.entityId = result;
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking_id: result, booking_ref: bookingRef, total_amount: totalAmount },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/:id/cancel
 * Cancel booking
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [booking] = await query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    // Role safety checks
    if (req.user.role_name === 'customer') {
      const [customer] = await query('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
      if (!customer || booking.customer_id !== customer.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      // Customers can't cancel within 24h of check-in, or if check-in has already happened
      const checkInDate = new Date(booking.check_in_date);
      const today = new Date();
      const diffHrs = (checkInDate - today) / (1000 * 60 * 60);
      if (diffHrs < 24 || booking.status === 'checked_in') {
        return res.status(400).json({ success: false, message: 'Cannot cancel booking within 24 hours of check-in.' });
      }
    }

    await transaction(async (conn) => {
      // Update booking status
      await conn.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
      
      // Update room status back to available if checked in/occupied
      if (booking.room_id) {
        await conn.execute("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_id]);
      }
      
      // Mark pending payments as failed, or completed as refunded
      await conn.execute(
        `UPDATE payments 
         SET status = CASE WHEN status = 'pending' THEN 'failed' ELSE 'refunded' END
         WHERE booking_id = ?`,
        [id]
      );
    });

    req.entityId = id;
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    next(err);
  }
};
