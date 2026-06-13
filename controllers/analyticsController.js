const { query } = require('../config/database');

/**
 * GET /api/analytics/dashboard
 * Aggregated revenue, occupancy, bookings, and complaints metrics for hotel managers
 */
exports.getManagerDashboard = async (req, res, next) => {
  try {
    const { hotel_id } = req.query;

    if (!hotel_id) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required' });
    }

    // 1. Total bookings count
    const [bookingsCount] = await query(
      "SELECT COUNT(*) AS total FROM bookings WHERE hotel_id = ? AND status != 'cancelled'",
      [hotel_id]
    );

    // 2. Total revenue (from completed payments)
    const [revenueSum] = await query(
      `SELECT SUM(p.amount) AS total 
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE b.hotel_id = ? AND p.status = 'completed'`,
      [hotel_id]
    );

    // 3. Occupancy calculation
    const [totalRooms] = await query("SELECT COUNT(*) AS count FROM rooms WHERE hotel_id = ?", [hotel_id]);
    const [occupiedRooms] = await query("SELECT COUNT(*) AS count FROM rooms WHERE hotel_id = ? AND status = 'occupied'", [hotel_id]);
    const occupancyRate = totalRooms.count > 0 ? ((occupiedRooms.count / totalRooms.count) * 100).toFixed(1) : 0;

    // 4. Monthly revenue trend (last 6 months)
    const revenueTrend = await query(
      `SELECT DATE_FORMAT(p.created_at, '%b %Y') AS month, SUM(p.amount) AS amount
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE b.hotel_id = ? AND p.status = 'completed'
       GROUP BY MONTH(p.created_at), DATE_FORMAT(p.created_at, '%b %Y')
       ORDER BY MIN(p.created_at) ASC
       LIMIT 6`,
      [hotel_id]
    );

    // 5. Complaint breakdown
    const complaintsBreakdown = await query(
      `SELECT status, COUNT(*) AS count 
       FROM complaints 
       WHERE hotel_id = ?
       GROUP BY status`,
      [hotel_id]
    );

    res.json({
      success: true,
      data: {
        total_bookings: bookingsCount.total,
        total_revenue: revenueSum.total || 0.00,
        occupancy_rate: Number(occupancyRate),
        revenue_trend: revenueTrend,
        complaints_breakdown: complaintsBreakdown,
      }
    });
  } catch (err) {
    next(err);
  }
};
