const mongoose = require('mongoose');

const clientSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    sector: { type: String },
    siret: { type: String },
    taxId: { type: String },
    email: { type: String },
    phone: { type: String },
    billingAddress: {
      street: String,
      city: String,
      zipCode: String,
      country: String,
    },
    deliveryAddress: {
      street: String,
      city: String,
      zipCode: String,
      country: String,
    },
    contacts: [
      {
        name: String,
        email: String,
        phone: String,
        role: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    commercialTerms: {
      paymentDeadline: { type: Number, default: 30 },
      discount: { type: Number, default: 0 },
      vatRate: { type: Number, default: 20 },
      notes: String,
    },
    tags: [String],
    revenue: { type: Number, default: 0 },
    interactions: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String },
        description: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    documents: [
      {
        name: String,
        url: String,
        type: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;