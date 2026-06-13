const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/payments/booking/:booking_id
 * Get all payments for a booking
 */
exports.getBookingPayments = async (req, res, next) => {
  try {
    const { booking_id } = req.params;
    const payments = await query('SELECT * FROM payments WHERE booking_id = ?', [booking_id]);
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/charge
 * Process payment / complete a pending payment
 */
exports.charge = async (req, res, next) => {
  try {
    const { payment_id, payment_method, transaction_ref } = req.body;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    const [payment] = await query('SELECT * FROM payments WHERE id = ?', [payment_id]);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    if (payment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Payment is already completed' });
    }

    const txRef = transaction_ref || 'txn_' + Math.random().toString(36).substring(2, 10).toUpperCase();

    await query(
      `UPDATE payments 
       SET status = 'completed', payment_method = ?, transaction_ref = ?, updated_at = NOW()
       WHERE id = ?`,
      [payment_method || 'Card', txRef, payment_id]
    );

    req.entityId = payment_id;
    logger.info(`Payment completed: ID ${payment_id}, method ${payment_method}, Ref: ${txRef}`);

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: { payment_id, transaction_ref: txRef }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/:id/refund
 * Refund a completed payment
 */
exports.refund = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [payment] = await query('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: `Cannot refund. Payment status is ${payment.status}` });
    }

    await query(
      "UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = ?",
      [id]
    );

    req.entityId = id;
    logger.info(`Payment refunded: ID ${id}`);

    res.json({ success: true, message: 'Payment refunded successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments/:booking_id/invoice
 * Generate booking invoice detailing subtotal, 18% GST, and totals
 */
exports.getInvoice = async (req, res, next) => {
  try {
    const { booking_id } = req.params;

    const [booking] = await query(
      `SELECT b.*, h.name AS hotel_name, h.address AS hotel_address, h.city AS hotel_city, h.country AS hotel_country,
              rc.name AS category_name, rc.base_price, r.room_number,
              u.first_name, u.last_name, u.email, u.phone, c.address AS guest_address
       FROM bookings b
       JOIN hotels h ON b.hotel_id = h.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN room_categories rc ON r.category_id = rc.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE b.id = ?`,
      [booking_id]
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    
    // Financial calculations
    const roomCost = booking.base_price * nights;
    const subtotal = roomCost;
    const gstRate = 0.18; // 18% GST standard
    const gstAmount = subtotal * gstRate;
    const totalWithGst = subtotal + gstAmount;

    // Get payment records
    const payments = await query('SELECT * FROM payments WHERE booking_id = ?', [booking_id]);

    res.json({
      success: true,
      data: {
        invoice_ref: `INV-${booking.booking_ref}`,
        invoice_date: new Date().toISOString().split('T')[0],
        booking: {
          booking_ref: booking.booking_ref,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          nights,
          status: booking.status,
        },
        hotel: {
          name: booking.hotel_name,
          address: `${booking.hotel_address}, ${booking.hotel_city}, ${booking.hotel_country}`,
        },
        guest: {
          name: `${booking.first_name} ${booking.last_name}`,
          email: booking.email,
          phone: booking.phone,
          address: booking.guest_address,
        },
        items: [
          {
            description: `Room accommodation: ${booking.category_name} (Room ${booking.room_number})`,
            nights,
            rate: booking.base_price,
            amount: roomCost,
          }
        ],
        summary: {
          subtotal,
          gst_rate: '18%',
          gst_amount: gstAmount,
          total: totalWithGst,
          actual_amount_booked: booking.total_amount, // Original booked amount
        },
        payments,
      }
    });
  } catch (err) {
    next(err);
  }
};
