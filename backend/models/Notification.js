const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // project_created, task_assigned, invoice_sent, etc.
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String }, // ex: /projects/xxx, /tasks/edit/xxx
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed }, // project, task, invoice id, etc.
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
