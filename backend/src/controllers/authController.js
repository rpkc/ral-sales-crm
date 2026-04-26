const User = require('../models/User');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // In a real application, you would compare a hashed password.
    // For scaffolding, we check plain text against the local DB mapping.
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. Please check email or password.' });
    }

    // Generate JWT token here in a real scenario
    const userObject = user.toObject();
    delete userObject.password;

    res.json({ user: userObject, token: 'mock-jwt-token' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
