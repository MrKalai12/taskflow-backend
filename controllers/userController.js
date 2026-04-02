const User = require('../models/User');

const searchUser = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }

    // const user = await User.findOne({
    //   email: email.toLowerCase().trim(),
    //   _id: { $ne: req.user.userId },
    // }).select('_id userName email');

      const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
      _id: { $ne: req.user.userId },
    }).select('_id userName email');

    if (!user) {
      return res.status(404).json({
        message: 'No user found with that email',
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { searchUser };