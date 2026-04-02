// const express = require('express')
// const router = express.Router()
// const authMiddleware = require('../middleware/authMiddleware')  // ← ADD THIS
// const { signup, login, logout, refresh, getMe } = require('../controllers/authController')

// router.post('/signup', signup)
// router.post('/login', login)
// router.post('/refresh', refresh)
// router.post('/logout', logout)
// router.get('/me', authMiddleware, getMe)

// module.exports = router


const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const authMiddleware = require('../middleware/authMiddleware');
const {
  signup,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user;
      const payload = { userId: user._id, role: user.role };

      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m',
      });

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
      );

      await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.redirect(
        `${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}`
      );
    } catch (error) {
      console.error(error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

module.exports = router;