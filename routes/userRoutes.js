const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { searchUser } = require('../controllers/userController');

router.get('/search', authMiddleware, searchUser);

module.exports = router;