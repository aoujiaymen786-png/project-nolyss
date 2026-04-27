const mongoose = require('mongoose');

const integrationSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['webhook', 'provider'] },
    provider: {
      type: String,
      enum: ['smtp', 'gmail', 'outlook', 'googledrive', 'dropbox', 's3', 'googlecalendar', 'outlookcalendar', 'slack', 'teams', 'stripe', 'paypal'],
    },
    category: { type: String, enum: ['email', 'storage', 'calendar', 'communication', 'payment', 'webhook'] },
    isActive: { type: Boolean, default: true },
    config: {
      endpoint: { type: String },
      method: { type: String, default: 'POST' },
      headers: { type: mongoose.Schema.Types.Mixed },
      secret: { type: String },
      host: { type: String },
      port: { type: Number },
      user: { type: String },
      pass: { type: String },
      from: { type: String },
      clientId: { type: String },
      clientSecret: { type: String },
      apiKey: { type: String },
      accessToken: { type: String },
      refreshToken: { type: String },
      bucket: { type: String },
      region: { type: String },
      credentials: { type: mongoose.Schema.Types.Mixed },
    },
    webhookUrl: { type: String },
    events: [{ type: String }],
    lastTriggeredAt: { type: Date },
    lastStatus: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

integrationSchema.index(
  { provider: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'provider', provider: { $exists: true, $type: 'string' } },
  }
);

const Integration = mongoose.model('Integration', integrationSchema);
module.exports = Integration;
