const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const RefreshToken = require('../models/RefreshToken');
const { signupSchema, loginSchema } = require('../validators/authValidator');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const signup = async (req, res) => {
  try {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.errors[0].message });
    }

    const { userName, email, password } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ userName, email, password: hashedPassword });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.errors[0].message });
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked' });
    }

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

    res.cookie('refreshToken', refreshToken, cookieOptions);

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const decoded = jwt.verify(tokenDoc.token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked' });
    }

    await RefreshToken.deleteOne({ token: tokenDoc.token });

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    return res.status(200).json({ message: 'Token refreshed', accessToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        message: 'If that email exists, a reset link has been sent',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your TaskFlow password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:32px;height:32px;background:#6366F1;border-radius:8px;
                        display:flex;align-items:center;justify-content:center">
              <div style="width:12px;height:12px;background:white;border-radius:3px"></div>
            </div>
            <span style="font-weight:700;font-size:16px;color:#111827">TaskFlow</span>
          </div>
          <h2 style="color:#111827;margin-bottom:8px">Reset your password</h2>
          <p style="color:#6B7280;margin-bottom:24px;line-height:1.6">
            You requested a password reset for your TaskFlow account.
            Click the button below to set a new password.
            This link expires in <strong>15 minutes</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#6366F1;color:white;
                    padding:12px 28px;border-radius:10px;text-decoration:none;
                    font-weight:600;font-size:14px;margin-bottom:24px">
            Reset Password
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:16px">
            If you didn't request this, you can safely ignore this email.
            Your password will not be changed.
          </p>
          <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
          <p style="color:#9CA3AF;font-size:11px">
            TaskFlow — Team Task Management
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      message: 'If that email exists, a reset link has been sent',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +password');

    if (!user) {
      return res.status(400).json({
        message: 'Reset link is invalid or has expired',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  signup,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
};


















// const User = require("../models/User");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const RefreshToken = require("../models/RefreshToken");
// const { signupSchema, loginSchema } = require("../validators/authValidator");

// const signup = async (req, res) => {
//   try {
//     // Validate FIRST before anything else
//     const result = signupSchema.safeParse(req.body);
//     if (!result.success) {
//       return res.status(400).json({
//         message: result.error.errors[0].message,
//       });
//     }

//     // Use validated clean data
//     const { userName, email, password } = result.data;

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     const user = await User.create({
//       userName,
//       email,
//       password: hashedPassword,
//     });

//     return res.status(201).json({
//       message: "user created successfully",
//       user: {
//         id: user._id,
//         userName: user.userName,
//         email: user.email,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// const login = async (req, res) => {
//   try {
//     const result = loginSchema.safeParse(req.body);
//     if (!result.success) {
//       return res.status(400).json({
//         message: result.error.errors[0].message,
//       });
//     }

//     // Use validated clean data
//     const { email, password } = result.data;

//     const user = await User.findOne({ email }).select("+password");
//     if (!user) {
//       return res.status(400).json({ message: "Invalid credentials!" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials!" });
//     }

//     const payload = {
//       userId: user._id,
//       role: user.role,
//     };

//     const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
//       expiresIn: "15m",
//     });

//     const refreshToken = jwt.sign(
//       { userId: user._id },
//       process.env.REFRESH_TOKEN_SECRET,
//       { expiresIn: "7d" },
//     );

//     await RefreshToken.create({
//       userId: user._id,
//       token: refreshToken,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
//     });

//     const cookieOptions = {
//   httpOnly: true,
//   secure: true,        // ✅ ALWAYS TRUE (Railway = HTTPS)
//   sameSite: "none",    // ✅ ALWAYS NONE (cross-origin)
//   maxAge: 7 * 24 * 60 * 60 * 1000,
// };

//     // Then use it:
//     res.cookie("refreshToken", refreshToken, cookieOptions);
//     return res.status(200).json({
//       message: "Login sucessfull",
//       accessToken,
//       user: {
//         id: user._id,
//         userName: user.userName,
//         email: user.email,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// const logout = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;

//     if (refreshToken) {
//       await RefreshToken.deleteOne({ token: refreshToken });
//     }

//     // Clear the cookie
//     res.clearCookie("refreshToken", {
//   httpOnly: true,
//   secure: true,
//   sameSite: "none",
// });

//     return res.status(200).json({ message: "Logout Successful" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// const refresh = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken) {
//       return res.status(401).json({ message: "No refresh token" });
//     }
//     const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
//     if (!tokenDoc) {
//       return res.status(401).json({
//         message: "Invalid refresh token",
//       });
//     }

//     const decoded = jwt.verify(
//       tokenDoc.token,
//       process.env.REFRESH_TOKEN_SECRET,
//     );

//     const user = await User.findById(decoded.userId);
//     if (!user) {
//       return res.status(401).json({
//         message: "User not found",
//       });
//     }

//     if (user.isBlocked) {
//       return res.status(403).json({
//         message: "Account is blocked",
//       });
//     }

//     await RefreshToken.deleteOne({ token: tokenDoc.token });

//     const newRefreshToken = jwt.sign(
//       { userId: user._id },
//       process.env.REFRESH_TOKEN_SECRET,
//       { expiresIn: "7d" },
//     );

//     await RefreshToken.create({
//       userId: user._id,
//       token: newRefreshToken,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
//     });

//     const payload = {
//       userId: user._id,
//       role: user.role,
//     };

//     const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
//       expiresIn: "15m",
//     });

//     res.cookie("refreshToken", newRefreshToken, {
//       httpOnly: true,
//       secure: true,        
//       sameSite: "none",    
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     return res.status(200).json({
//       message: "Refresh Token created",
//       accessToken,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       message: "Server Error",
//     });
//   }
// };

// const getMe = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     return res.status(200).json({
//       user: {
//         id: user._id,
//         userName: user.userName,
//         email: user.email,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// module.exports = { signup, login, logout, refresh, getMe };
