const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema({
  type: String,
  description: String,
  channel: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, required: true },
  source: String,
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Lost', 'Admitted'], // Simplified enum based on LeadStatus
    default: 'New'
  },
  quality: { type: String, enum: ['Hot', 'Warm', 'Cold'] },
  temperature: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Dormant'] },
  intentCategory: { type: String, enum: ['High Intent', 'Medium Intent', 'Low Intent'] },
  courseInterest: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activities: [leadActivitySchema]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
