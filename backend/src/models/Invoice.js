const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  type: { type: String, enum: ['PI', 'TI'], required: true },
  customerId: { type: String, required: true }, // Could be Lead/User ID
  customerName: { type: String, required: true },
  customerType: { type: String }, // 'Student', 'Institution', 'Event', 'Other'
  revenueStream: { type: String },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date },

  subtotal: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  gstType: { type: String, enum: ['Taxable', 'Exempt', 'Zero Rated'], default: 'Taxable' },
  gstRate: { type: Number, default: 18 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },

  amountPaid: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled', 'Converted', 'Expired'],
    default: 'Draft'
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
