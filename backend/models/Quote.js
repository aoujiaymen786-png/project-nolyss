const mongoose = require('mongoose');

const quoteLineSchema = mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 20 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percent', 'amount'], default: 'percent' },
});

const quoteSchema = mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    date: { type: Date, default: Date.now },
    validUntil: { type: Date },
    lines: [quoteLineSchema],
    subtotalHT: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'refused', 'converted'],
      default: 'draft',
    },
    notes: String,
    terms: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

quoteSchema.pre('save', function(next) {
  let subtotal = 0;
  let totalTax = 0;
  let discountTotal = 0;
  (this.lines || []).forEach(line => {
    const lineSubtotal = line.quantity * line.unitPrice;
    const lineDiscount = line.discountType === 'amount'
      ? Math.min(line.discount || 0, lineSubtotal)
      : lineSubtotal * ((line.discount || 0) / 100);
    discountTotal += lineDiscount;
    const lineAfterDiscount = lineSubtotal - lineDiscount;
    subtotal += lineAfterDiscount;
    totalTax += lineAfterDiscount * ((line.taxRate || 0) / 100);
  });
  this.subtotalHT = subtotal;
  this.totalTax = totalTax;
  this.totalTTC = subtotal + totalTax;
  this.discountTotal = discountTotal;
  next();
});

const Quote = mongoose.model('Quote', quoteSchema);
module.exports = Quote;