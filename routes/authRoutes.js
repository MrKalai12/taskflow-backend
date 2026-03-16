const express = require('express');
const router = express.Router();
const { signup, login, logout, refresh, getMe} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

module.exports = router; 