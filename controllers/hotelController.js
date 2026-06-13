const { query } = require('../config/database');
const logger = require('../utils/logger');

// ── HOTELS ──────────────────────────────────────────────────

exports.listHotels = async (req, res, next) => {
  try {
    const hotels = await query('SELECT * FROM hotels ORDER BY name ASC');
    res.json({ success: true, data: hotels });
  } catch (err) {
    next(err);
  }
};

exports.getHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [hotel] = await query('SELECT * FROM hotels WHERE id = ?', [id]);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }
    res.json({ success: true, data: hotel });
  } catch (err) {
    next(err);
  }
};

exports.createHotel = async (req, res, next) => {
  try {
    const { name, address, city, country, phone, email, description } = req.body;
    
    const result = await query(
      `INSERT INTO hotels (name, address, city, country, phone, email, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, address, city, country, phone || null, email || null, description || null]
    );

    req.entityId = result.insertId;
    res.status(201).json({ success: true, message: 'Hotel created successfully', data: { hotel_id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

exports.updateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, phone, email, description } = req.body;

    await query(
      `UPDATE hotels 
       SET name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, description = ?
       WHERE id = ?`,
      [name, address, city, country, phone || null, email || null, description || null, id]
    );

    req.entityId = id;
    res.json({ success: true, message: 'Hotel updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.deleteHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM hotels WHERE id = ?', [id]);
    req.entityId = id;
    res.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── ROOM CATEGORIES ─────────────────────────────────────────

exports.listCategories = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const categories = await query('SELECT * FROM room_categories WHERE hotel_id = ? ORDER BY base_price ASC', [hotel_id]);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const { name, description, max_occupancy, base_price } = req.body;

    const result = await query(
      `INSERT INTO room_categories (hotel_id, name, description, max_occupancy, base_price)
       VALUES (?, ?, ?, ?, ?)`,
      [hotel_id, name, description || null, max_occupancy || 2, base_price || 0.00]
    );

    req.entityId = result.insertId;
    res.status(201).json({ success: true, message: 'Room category created successfully', data: { category_id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, max_occupancy, base_price } = req.body;

    await query(
      `UPDATE room_categories 
       SET name = ?, description = ?, max_occupancy = ?, base_price = ?
       WHERE id = ?`,
      [name, description || null, max_occupancy, base_price, id]
    );

    req.entityId = id;
    res.json({ success: true, message: 'Room category updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM room_categories WHERE id = ?', [id]);
    req.entityId = id;
    res.json({ success: true, message: 'Room category deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── ROOMS ───────────────────────────────────────────────────

exports.listRooms = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const rooms = await query(
      `SELECT r.*, rc.name AS category_name, rc.base_price 
       FROM rooms r
       JOIN room_categories rc ON r.category_id = rc.id
       WHERE r.hotel_id = ? ORDER BY r.room_number ASC`,
      [hotel_id]
    );
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const { category_id, room_number, status } = req.body;

    const result = await query(
      `INSERT INTO rooms (hotel_id, category_id, room_number, status)
       VALUES (?, ?, ?, ?)`,
      [hotel_id, category_id, room_number, status || 'available']
    );

    req.entityId = result.insertId;
    res.status(201).json({ success: true, message: 'Room created successfully', data: { room_id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, room_number, status } = req.body;

    await query(
      `UPDATE rooms 
       SET category_id = COALESCE(?, category_id),
           room_number = COALESCE(?, room_number),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [category_id || null, room_number || null, status || null, id]
    );

    req.entityId = id;
    res.json({ success: true, message: 'Room updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM rooms WHERE id = ?', [id]);
    req.entityId = id;
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err) {
    next(err);
  }
};
