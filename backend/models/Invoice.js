const mongoose = require('mongoose');

const invoiceLineSchema = mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 20 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percent', 'amount'], default: 'percent' },
});

const paymentSchema = mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, default: 'bank_transfer' },
  reference: String,
});

const invoiceSchema = mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    downPaymentInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    creditNoteFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    date: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    lines: [invoiceLineSchema],
    subtotalHT: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    payments: [paymentSchema],
    status: {
      type: String,
      enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    type: {
      type: String,
      enum: ['invoice', 'credit_note', 'down_payment'],
      default: 'invoice',
    },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: ['monthly', 'quarterly', 'yearly'] },
    remindersSent: { type: Number, default: 0 },
    lastReminderAt: Date,
    legalMentions: String,
    notes: String,
    terms: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

invoiceSchema.pre('save', function(next) {
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
  this.totalTTC = Math.round((subtotal + totalTax) * 100) / 100;
  this.discountTotal = discountTotal;
  if (this.payments && this.payments.length) {
    this.paidAmount = this.payments.reduce((s, p) => s + p.amount, 0);
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;