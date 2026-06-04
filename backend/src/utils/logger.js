const pool = require('../config/database');

// Fire-and-forget activity logger — failures never break the main request
const logActivity = async (userId, action, fileId = null, details = null, ipAddress = null) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, file_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, fileId, details, ipAddress]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

module.exports = { logActivity };
