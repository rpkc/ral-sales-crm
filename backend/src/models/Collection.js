const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  receiptRef: { type: String, required: true },
  studentName: { type: String, required: true },
  amount: { type: Number, required: true },
  mode: {
    type: String,
    enum: ['Cash', 'Cheque', 'Online Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'],
    required: true
  },
  status: {
    type: String,
    enum: ['Collected', 'Awaiting Verification', 'Verified', 'Mismatch', 'Ready For Invoice', 'Invoice Generated'],
    default: 'Collected'
  },
  collectedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectedAt: { type: Date, default: Date.now },

  // Link to Lead/Student
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  // Link to Invoice if generated
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

  remarks: String
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);
