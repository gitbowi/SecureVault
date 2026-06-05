const express = require('express');
const pool    = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT action, file_name, created_at FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.userId]
    );
    res.json({ logs: rows });
  } catch {
    res.status(500).json({ error: 'Could not fetch activity.' });
  }
});

module.exports = router;
