const mongoose = require('mongoose');

const notificationConfigSchema = mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // email_verification, invoice_reminder, etc.
    enabled: { type: Boolean, default: true },
    channels: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
    template: {
      subject: { type: String },
      body: { type: String },
    },
    options: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const NotificationConfig = mongoose.model('NotificationConfig', notificationConfigSchema);
module.exports = NotificationConfig;
