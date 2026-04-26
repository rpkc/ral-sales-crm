const Invoice = require('../models/Invoice');

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('createdBy', 'name email');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name email');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { subtotal, discount, gstRate, gstType } = req.body;

    // Business logic: Calculate GST and Totals
    const calculatedSubtotal = subtotal || 0;
    const calculatedDiscount = discount || 0;
    const taxableAmount = calculatedSubtotal - calculatedDiscount;

    let gstAmount = 0;
    if (gstType !== 'Exempt' && gstType !== 'Zero Rated') {
      gstAmount = taxableAmount * ((gstRate || 18) / 100);
    }

    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const total = taxableAmount + gstAmount;

    const newInvoice = new Invoice({
      ...req.body,
      cgst,
      sgst,
      total
    });

    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedInvoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(updatedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
