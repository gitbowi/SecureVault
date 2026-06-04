const express = require('express');
const router  = express.Router();
const {
  getFiles, uploadFile, downloadFile,
  deleteFile, toggleShare, getPublicFile, getStats,
} = require('../controllers/fileController');
const { verifyToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public – no auth needed
router.get('/public/:token', getPublicFile);

// All routes below require a valid JWT
router.use(verifyToken);

router.get('/',                    getFiles);
router.get('/stats',               getStats);
router.post('/upload',             upload.single('file'), uploadFile);
router.get('/:id/download',        downloadFile);
router.delete('/:id',              deleteFile);
router.patch('/:id/share',         toggleShare);

module.exports = router;
