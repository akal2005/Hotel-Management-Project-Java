const { query } = require('../config/database');

/**
 * GET /api/notifications
 * Get user's notifications
 */
exports.listNotifications = async (req, res, next) => {
  try {
    const notifications = await query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?", [id, req.user.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};
