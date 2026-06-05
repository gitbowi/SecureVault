const pool = require('../db');

module.exports = function log(userId, action, fileName = null) {
  pool.query(
    'INSERT INTO activity_logs (user_id, action, file_name) VALUES ($1, $2, $3)',
    [userId, action, fileName]
  ).catch(() => {});
};
