const express = require('express');
const router = express.Router();
const { createBot } = require('../controllers/admin.controller');
const { isAdmin } = require('../middleware/auth.middleware');

// Create a new bot
router.post('/bots', isAdmin, createBot);

module.exports = router; 