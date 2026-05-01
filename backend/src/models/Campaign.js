const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platform: {
    type: String,
    enum: ['Meta', 'Google', 'LinkedIn', 'YouTube', 'Referral', 'Offline Event']
  },
  objective: {
    type: String,
    enum: ['Lead Generation', 'Brand Awareness', 'Webinar', 'Course Promotion']
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Completed', 'Archived'],
    default: 'Draft'
  },
  budget: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  leadsGenerated: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
