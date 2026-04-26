const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: [
      'admin',
      'marketing_manager',
      'telecaller',
      'counselor',
      'telecalling_manager',
      'owner',
      'alliance_manager',
      'alliance_executive',
      'accounts_manager',
      'accounts_executive'
    ]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
