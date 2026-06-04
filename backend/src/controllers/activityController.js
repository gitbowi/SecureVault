const pool = require('../config/database');

const getLogs = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit,  10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0);

    const result = await pool.query(
      `SELECT
         al.id, al.action, al.details, al.ip_address, al.created_at,
         f.original_name AS file_name
       FROM activity_logs al
       LEFT JOIN files f ON al.file_id = f.id
       WHERE al.user_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ logs: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLogs };
