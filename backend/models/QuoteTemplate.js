const mongoose = require('mongoose');

const lineSchema = mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  taxRate: { type: Number, default: 20 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percent', 'amount'], default: 'percent' },
});

const QuoteTemplate = mongoose.model('QuoteTemplate', new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  lines: [lineSchema],
  defaultTerms: String,
  defaultNotes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));

module.exports = QuoteTemplate;
