const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['todo', 'inProgress', 'review', 'done'],
      default: 'todo',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedDate: { type: Date },
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    checklist: [
      {
        item: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Middleware pour mettre à jour les heures réelles du projet
taskSchema.post('save', async function() {
  const Project = mongoose.model('Project');
  const tasks = await mongoose.model('Task').find({ project: this.project });
  const totalActualHours = tasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
  await Project.findByIdAndUpdate(this.project, { actualHours: totalActualHours });
});

taskSchema.post('remove', async function() {
  const Project = mongoose.model('Project');
  const tasks = await mongoose.model('Task').find({ project: this.project });
  const totalActualHours = tasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
  await Project.findByIdAndUpdate(this.project, { actualHours: totalActualHours });
});

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;