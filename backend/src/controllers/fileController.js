const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { logActivity } = require('../utils/logger');
const { UPLOAD_DIR } = require('../middleware/upload');

const getFiles = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, original_name, mime_type, size, is_public, share_token, created_at
       FROM files
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ files: result.rows });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS file_count, COALESCE(SUM(size), 0) AS total_size
       FROM files WHERE owner_id = $1`,
      [req.user.id]
    );
    res.json({
      fileCount: parseInt(result.rows[0].file_count, 10),
      totalSize: parseInt(result.rows[0].total_size, 10),
    });
  } catch (err) {
    next(err);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, filename, mimetype, size } = req.file;

    const result = await pool.query(
      `INSERT INTO files (owner_id, original_name, stored_name, mime_type, size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, original_name, mime_type, size, is_public, share_token, created_at`,
      [req.user.id, originalname, filename, mimetype, size]
    );

    const file = result.rows[0];
    await logActivity(req.user.id, 'upload', file.id, `Uploaded: ${originalname}`, req.ip);

    res.status(201).json({ message: 'File uploaded successfully.', file });
  } catch (err) {
    // Clean up orphaned file if DB insert failed
    if (req.file) {
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
    }
    next(err);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const file = result.rows[0];

    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const filePath = path.join(UPLOAD_DIR, file.stored_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File data not found on server.' });
    }

    await logActivity(req.user.id, 'download', file.id, `Downloaded: ${file.original_name}`, req.ip);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.sendFile(filePath, (err) => { if (err) next(err); });
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const file = result.rows[0];

    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Remove from DB first so foreign-key constraints are satisfied
    await pool.query('DELETE FROM files WHERE id = $1', [id]);

    const filePath = path.join(UPLOAD_DIR, file.stored_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await logActivity(req.user.id, 'delete', null, `Deleted: ${file.original_name}`, req.ip);

    res.json({ message: 'File deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const toggleShare = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const file = result.rows[0];

    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Toggle: public → private clears the token; private → public mints a fresh token
    const newIsPublic    = !file.is_public;
    const newShareToken  = newIsPublic ? uuidv4() : null;

    const updated = await pool.query(
      `UPDATE files SET is_public = $1, share_token = $2 WHERE id = $3
       RETURNING id, original_name, mime_type, size, is_public, share_token, created_at`,
      [newIsPublic, newShareToken, id]
    );

    const action = newIsPublic ? 'share_on' : 'share_off';
    await logActivity(req.user.id, action, file.id, `Share toggled: ${file.original_name}`, req.ip);

    res.json({
      message: newIsPublic ? 'File is now public.' : 'File is now private.',
      file: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

const getPublicFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      'SELECT * FROM files WHERE share_token = $1 AND is_public = true',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found or link has expired.' });
    }

    const file     = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, file.stored_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File data not found on server.' });
    }

    // null user_id = anonymous/public download
    await logActivity(null, 'public_download', file.id, `Public download: ${file.original_name}`, req.ip);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.sendFile(filePath, (err) => { if (err) next(err); });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFiles, getStats, uploadFile, downloadFile, deleteFile, toggleShare, getPublicFile };
