const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema(
  {
    action: { type: String, required: true }, // CREATE_USER, UPDATE_USER, DELETE_USER, LOGIN, etc.
    entity: { type: String, required: true }, // User, Project, Client, SystemSettings, etc.
    entityId: { type: mongoose.Schema.Types.ObjectId },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedByEmail: { type: String },
    changes: { type: mongoose.Schema.Types.Mixed }, // avant/après pour traçabilité
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
