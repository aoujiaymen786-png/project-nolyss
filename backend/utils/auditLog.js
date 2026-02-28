const AuditLog = require('../models/AuditLog');

/**
 * Enregistre une action dans les logs d'audit (RGPD / conformité).
 * À appeler après une action réussie (côté contrôleur).
 */
const logAudit = async (payload) => {
  try {
    await AuditLog.create({
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      performedBy: payload.performedBy,
      performedByEmail: payload.performedByEmail,
      changes: payload.changes,
      ip: payload.ip,
      userAgent: payload.userAgent,
      metadata: payload.metadata,
    });
  } catch (err) {
    console.error('Erreur écriture audit log:', err);
  }
};

/**
 * Récupère l'IP et le User-Agent depuis la requête Express.
 */
const getRequestMeta = (req) => ({
  ip: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('User-Agent'),
});

module.exports = { logAudit, getRequestMeta };
