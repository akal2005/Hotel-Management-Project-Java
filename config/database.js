const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'hotel_management_db',
  waitForConnections: true,
  connectionLimit:    parseInt(process.env.DB_POOL_MAX || '10'),
  queueLimit:         0,
  timezone:           '+05:30',
  charset:            'utf8mb4',
  decimalNumbers:     true,
});

pool.on('connection', () => {
  logger.info('New MySQL connection established');
});

// Test connection on startup (safely handles dev scenario where MySQL might not be running yet)
(async () => {
  try {
    const conn = await pool.getConnection();
    logger.info('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    logger.error('❌ MySQL connection failed: ' + err.message);
    logger.warn('Continuing execution. Ensure MySQL is running and database is set up.');
  }
})();

/**
 * Execute a query with parameters
 */
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Execute inside a transaction
 */
const transaction = async (callback) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { pool, query, transaction };
