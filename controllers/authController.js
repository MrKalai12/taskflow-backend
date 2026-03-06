const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const RefreshToken = require("../models/RefreshToken");
const {
  signupSchema,
  loginSchema,
  refreshSchema,
} = require("../validators/authValidator");

const signup = async (req, res) => {
  try {
    // Validate FIRST before anything else
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }

    // Use validated clean data
    const { userName, email, password } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "user created successfully",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const login = async (req, res) => {
  try {

    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }

    // Use validated clean data
    const { email, password } = result.data;
    
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const payload = {
      userId: user._id,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    return res.status(200).json({
      message: "Login sucessfull",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const logout = async (req, res) => {
  try {

    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }

    // Use validated clean data
    const { refreshToken } = result.data;
    await RefreshToken.deleteOne({ token: refreshToken });
    return res.status(200).json({
      message: "Logout Successfull",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const refresh = async (req, res) => {
  try {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }

    // Use validated clean data
    const { refreshToken } = result.data;
   const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    const decoded = jwt.verify(
      tokenDoc.token,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Account is blocked",
      });
    }

    await RefreshToken.deleteOne({ token: tokenDoc.token });

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    const payload = {
      userId: user._id,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    return res.status(200).json({
      message: "Refresh Token created",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
module.exports = { signup, login, logout, refresh };
