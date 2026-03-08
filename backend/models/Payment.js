const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ['virement', 'carte', 'cheque'],
      required: true,
    },
    status: {
      type: String,
      enum: ['en_attente', 'valide'],
      default: 'valide',
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

