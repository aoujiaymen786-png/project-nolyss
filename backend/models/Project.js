const mongoose = require('mongoose');

const projectSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String },
    status: {
      type: String,
      enum: ['prospecting', 'quotation', 'inProgress', 'validation', 'completed', 'archived'],
      default: 'prospecting',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    description: { type: String },
    objectives: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    deadline: { type: Date },
    estimatedBudget: { type: Number },
    actualBudget: { type: Number, default: 0 },
    estimatedHours: { type: Number },
    actualHours: { type: Number, default: 0 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tags: [String],
    attachments: [
      {
        name: String,
        url: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
        validated: { type: Boolean, default: false },
        validatedAt: Date,
        validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    milestones: [
      {
        name: { type: String, required: true },
        dueDate: Date,
        description: String,
        completed: { type: Boolean, default: false },
      },
    ],
    sprints: [
      {
        name: { type: String, required: true },
        startDate: Date,
        endDate: Date,
        goal: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;