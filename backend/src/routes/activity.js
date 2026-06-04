const express = require('express');
const router  = express.Router();
const { getLogs } = require('../controllers/activityController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getLogs);

module.exports = router;
