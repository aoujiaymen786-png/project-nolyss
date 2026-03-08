const mongoose = require('mongoose');

const claimSchema = mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: {
      type: String,
      enum: ['project_delay', 'invoice_error', 'other'],
      required: true,
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
    },
    /** Assigné à la direction (director) ou à la coordinatrice selon la nature */
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    /** Réponse de la direction / coordinatrice */
    response: { type: String },
    respondedAt: { type: Date },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

claimSchema.index({ client: 1, createdAt: -1 });
claimSchema.index({ assignedTo: 1, status: 1 });

const Claim = mongoose.model('Claim', claimSchema);
module.exports = Claim;
