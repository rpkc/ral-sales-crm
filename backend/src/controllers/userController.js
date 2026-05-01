const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    // In a real app, hash the password here before saving
    const savedUser = await newUser.save();
    const userObject = savedUser.toObject();
    delete userObject.password;
    res.status(201).json(userObject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
