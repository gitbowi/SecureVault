const express = require('express');
const path    = require('path');
const pool    = require('../db');
const log     = require('../lib/log');

const router  = express.Router();
const UPLOADS = path.join(__dirname, '../../uploads');

router.get('/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT user_id, filename, original_name FROM files WHERE share_token = $1',
      [req.params.token]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Share link not found.' });
    const file = rows[0];
    log(file.user_id, 'share_download', file.original_name);
    res.download(path.join(UPLOADS, file.filename), file.original_name);
  } catch {
    res.status(500).json({ error: 'Could not retrieve file.' });
  }
});

module.exports = router;
