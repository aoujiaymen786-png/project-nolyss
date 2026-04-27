const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getAdminMetrics,
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getNotificationConfig,
  updateNotificationConfig,
  getAvailableIntegrations,
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect);
router.use(authorize('VIEW_ADMIN_DASHBOARD'));

// Métriques système
router.get('/metrics', getAdminMetrics);

// Paramètres plateforme
router.get('/settings', getSystemSettings);
router.put('/settings', authorize('MANAGE_SYSTEM_SETTINGS'), updateSystemSettings);

// Audit & conformité (RGPD)
router.get('/audit-logs', authorize('VIEW_AUDIT_LOGS'), getAuditLogs);

// Notifications / Emails
router.get('/notifications', getNotificationConfig);
router.put('/notifications', authorize('MANAGE_EMAIL_CONFIG'), updateNotificationConfig);

// Intégrations (API, webhooks, fournisseurs)
router.get('/integrations/available', getAvailableIntegrations);
router.get('/integrations', getIntegrations);
router.post('/integrations', authorize('MANAGE_INTEGRATIONS'), createIntegration);
router.put('/integrations/:id', authorize('MANAGE_INTEGRATIONS'), updateIntegration);
router.delete('/integrations/:id', authorize('MANAGE_INTEGRATIONS'), deleteIntegration);
router.post('/integrations/:id/test', authorize('MANAGE_INTEGRATIONS'), testIntegration);

// Workflows
router.get('/workflows', getWorkflows);
router.post('/workflows', authorize('MANAGE_WORKFLOWS'), createWorkflow);
router.put('/workflows/:id', authorize('MANAGE_WORKFLOWS'), updateWorkflow);
router.delete('/workflows/:id', authorize('MANAGE_WORKFLOWS'), deleteWorkflow);

module.exports = router;
