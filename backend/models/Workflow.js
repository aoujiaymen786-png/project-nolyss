const mongoose = require('mongoose');

const workflowStepSchema = mongoose.Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['approval', 'notification', 'auto', 'manual'], default: 'manual' },
  assigneeRole: { type: String },
  conditions: { type: mongoose.Schema.Types.Mixed },
});

const workflowSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    entityType: { type: String, required: true }, // project, quote, invoice, task
    trigger: { type: String, required: true }, // on_create, on_status_change, on_approval
    isActive: { type: Boolean, default: true },
    steps: [workflowStepSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Workflow = mongoose.model('Workflow', workflowSchema);
module.exports = Workflow;
