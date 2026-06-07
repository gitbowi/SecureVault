const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');
const log = require('../lib/log');

const router = express.Router();
const UPLOADS = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, original_name, size, mimetype, created_at FROM files WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ files: rows });
  } catch {
    res.status(500).json({ error: 'Could not fetch files.' });
  }
});

router.post('/upload', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO files (user_id, filename, original_name, size, mimetype) VALUES ($1, $2, $3, $4, $5) RETURNING id, original_name, size, mimetype, created_at',
      [req.user.userId, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype]
    );
    res.status(201).json({ file: rows[0] });
    log(req.user.userId, 'upload', rows[0].original_name);
  } catch {
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Upload failed.' });
  }
});

router.get('/:id/download', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT filename, original_name FROM files WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
    log(req.user.userId, 'download', rows[0].original_name);
    res.download(path.join(UPLOADS, rows[0].filename), rows[0].original_name);
  } catch {
    res.status(500).json({ error: 'Download failed.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING filename, original_name',
      [req.params.id, req.user.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
    fs.unlink(path.join(UPLOADS, rows[0].filename), () => {});
    res.status(204).end();
    log(req.user.userId, 'delete', rows[0].original_name);
  } catch {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

module.exports = router;
