const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const Integration = require('../models/Integration');
const NotificationConfig = require('../models/NotificationConfig');
const Workflow = require('../models/Workflow');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const { logAudit, getRequestMeta } = require('../utils/auditLog');
const integrationService = require('../services/integrationService');

const APPROVED_USERS_FILTER = {
  $or: [
    { registrationStatus: { $exists: false } },
    { registrationStatus: null },
    { registrationStatus: 'approved' },
  ],
};

const VALID_INTEGRATION_TYPES = ['webhook', 'provider'];
const VALID_PROVIDERS = ['smtp', 'gmail', 'outlook', 'googledrive', 'dropbox', 's3', 'googlecalendar', 'outlookcalendar', 'slack', 'teams', 'stripe', 'paypal'];
const PROVIDER_TO_CATEGORY = {
  smtp: 'email',
  gmail: 'email',
  outlook: 'email',
  googledrive: 'storage',
  dropbox: 'storage',
  s3: 'storage',
  googlecalendar: 'calendar',
  outlookcalendar: 'calendar',
  slack: 'communication',
  teams: 'communication',
  stripe: 'payment',
  paypal: 'payment',
};
const PROVIDER_REQUIRED_FIELDS = {
  smtp: ['host', 'port', 'user', 'pass', 'from'],
  gmail: ['clientId', 'clientSecret'],
  outlook: ['clientId', 'clientSecret'],
  googledrive: ['clientId', 'clientSecret'],
  dropbox: ['apiKey'],
  s3: ['apiKey', 'secret', 'bucket', 'region'],
  googlecalendar: ['clientId', 'clientSecret'],
  outlookcalendar: ['clientId', 'clientSecret'],
  slack: ['webhookUrl'],
  teams: ['webhookUrl'],
  stripe: ['apiKey'],
  paypal: ['clientId', 'clientSecret'],
};
const WEBHOOK_EVENT_PROVIDERS = ['slack', 'teams'];
const WORKFLOW_EVENT_MAP = {
  project: {
    on_create: ['project.created'],
    on_status_change: [],
    on_approval: [],
  },
  quote: {
    on_create: [],
    on_status_change: [],
    on_approval: [],
  },
  invoice: {
    on_create: [],
    on_status_change: ['invoice.sent'],
    on_approval: ['invoice.payment_recorded'],
  },
  task: {
    on_create: [],
    on_status_change: [],
    on_approval: [],
  },
};

const isValidHttpUrl = (value) => /^https?:\/\/.+/i.test(String(value || '').trim());

const sanitizeIntegrationInput = (payload = {}) => {
  const sanitized = { ...payload };
  delete sanitized._id;
  delete sanitized.createdBy;
  delete sanitized.lastTriggeredAt;
  delete sanitized.lastStatus;
  if (sanitized.name !== undefined) sanitized.name = String(sanitized.name).trim();
  if (sanitized.type !== undefined) sanitized.type = String(sanitized.type).trim();
  if (sanitized.provider !== undefined) sanitized.provider = String(sanitized.provider).trim();
  if (sanitized.category !== undefined) sanitized.category = String(sanitized.category).trim();
  if (sanitized.webhookUrl !== undefined) sanitized.webhookUrl = String(sanitized.webhookUrl).trim();
  if (!Array.isArray(sanitized.events)) sanitized.events = [];
  sanitized.events = sanitized.events.map((e) => String(e || '').trim()).filter(Boolean);
  if (!sanitized.config || typeof sanitized.config !== 'object') sanitized.config = {};
  return sanitized;
};

const validateIntegrationInput = (integration) => {
  if (!integration.name) return 'Le nom de l\'intégration est requis.';
  if (!VALID_INTEGRATION_TYPES.includes(integration.type)) return 'Type d\'intégration invalide.';

  if (integration.type === 'webhook') {
    if (!integration.webhookUrl || !isValidHttpUrl(integration.webhookUrl)) {
      return 'URL webhook invalide (http/https requis).';
    }
    return null;
  }

  if (!VALID_PROVIDERS.includes(integration.provider)) {
    return 'Provider d\'intégration invalide.';
  }

  const expectedCategory = PROVIDER_TO_CATEGORY[integration.provider];
  if (!integration.category || integration.category !== expectedCategory) {
    return `Catégorie invalide pour ${integration.provider}. Catégorie attendue: ${expectedCategory}.`;
  }

  const requiredFields = PROVIDER_REQUIRED_FIELDS[integration.provider] || [];
  for (const field of requiredFields) {
    const value = field === 'webhookUrl'
      ? (integration.webhookUrl || integration.config?.webhookUrl)
      : integration.config?.[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      return `Champ requis manquant pour ${integration.provider}: ${field}.`;
    }
  }

  if ((integration.provider === 'slack' || integration.provider === 'teams')
    && !isValidHttpUrl(integration.webhookUrl || integration.config?.webhookUrl)) {
    return 'Webhook URL invalide pour cette intégration.';
  }

  return null;
};

const getEventsFromWorkflow = (workflow) => {
  if (!workflow || !workflow.isActive) return [];
  const byEntity = WORKFLOW_EVENT_MAP[workflow.entityType] || {};
  return byEntity[workflow.trigger] || [];
};

const syncWorkflowEventsToIntegrations = async () => {
  const workflows = await Workflow.find({ isActive: true }).lean();
  const mappedEvents = [...new Set(workflows.flatMap(getEventsFromWorkflow).filter(Boolean))];
  const filter = {
    $or: [
      { type: 'webhook' },
      { type: 'provider', provider: { $in: WEBHOOK_EVENT_PROVIDERS } },
    ],
  };
  await Integration.updateMany(filter, { events: mappedEvents });
  return mappedEvents;
};

// ——— Tableau de bord admin (métriques système) ———
const getAdminMetrics = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalClients,
      totalTasks,
      totalInvoices,
      recentLogsCount,
    ] = await Promise.all([
      User.countDocuments(APPROVED_USERS_FILTER),
      User.countDocuments({ ...APPROVED_USERS_FILTER, isActive: true }),
      Project.countDocuments(),
      Client.countDocuments(),
      Task.countDocuments(),
      Invoice.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    const integrationsCount = await Integration.countDocuments({ isActive: true });
    const workflowsCount = await Workflow.countDocuments({ isActive: true });

    res.json({
      totalUsers,
      activeUsers,
      totalProjects,
      totalClients,
      totalTasks,
      totalInvoices,
      recentLogsCount,
      integrationsCount,
      workflowsCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ——— Paramètres système ———
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({}).lean();
    const byKey = {};
    settings.forEach((s) => { byKey[s.key] = s.value; });
    res.json(byKey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const { _category, ...rest } = req.body;
    const entries = Object.entries(rest).filter(([k]) => k !== '_id');
    for (const [key, value] of entries) {
      await SystemSettings.findOneAndUpdate(
        { key },
        { value, category: _category || 'general' },
        { upsert: true, new: true }
      );
    }
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_SYSTEM_SETTINGS',
      entity: 'SystemSettings',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { keys: entries.map(([k]) => k) },
      ...meta,
    });
    const settings = await SystemSettings.find({}).lean();
    const byKey = {};
    settings.forEach((s) => { byKey[s.key] = s.value; });
    res.json(byKey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ——— Logs d'audit (RGPD, conformité) ———
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity, userId } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (userId) filter.performedBy = userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('performedBy', 'name email')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ——— Notifications / Emails ———
const getNotificationConfig = async (req, res) => {
  try {
    const configs = await NotificationConfig.find({}).lean();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNotificationConfig = async (req, res) => {
  try {
    const { key, enabled, channels, template, options } = req.body;
    const updated = await NotificationConfig.findOneAndUpdate(
      { key },
      { enabled, channels, template, options },
      { upsert: true, new: true }
    );
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_NOTIFICATION_CONFIG',
      entity: 'NotificationConfig',
      entityId: updated._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      ...meta,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Types d'intégrations disponibles (statique)
const AVAILABLE_INTEGRATIONS = [
  {
    category: 'email',
    label: 'Email',
    providers: [
      { id: 'smtp', name: 'SMTP', icon: 'mail', desc: 'Serveur SMTP générique (Gmail, Outlook, etc.)' },
      { id: 'gmail', name: 'Gmail API', icon: 'gmail', desc: 'API Google pour envoi d\'emails' },
      { id: 'outlook', name: 'Microsoft Outlook', icon: 'outlook', desc: 'API Microsoft Graph pour emails' },
    ],
  },
  {
    category: 'storage',
    label: 'Stockage cloud',
    providers: [
      { id: 'googledrive', name: 'Google Drive', icon: 'drive', desc: 'Stockage et partage de fichiers' },
      { id: 'dropbox', name: 'Dropbox', icon: 'dropbox', desc: 'Stockage cloud et synchronisation' },
      { id: 's3', name: 'AWS S3', icon: 's3', desc: 'Stockage objet Amazon S3' },
    ],
  },
  {
    category: 'calendar',
    label: 'Calendrier',
    providers: [
      { id: 'googlecalendar', name: 'Google Calendar', icon: 'calendar', desc: 'Calendrier et événements' },
      { id: 'outlookcalendar', name: 'Outlook Calendar', icon: 'outlook', desc: 'Calendrier Microsoft 365' },
    ],
  },
  {
    category: 'communication',
    label: 'Communication',
    providers: [
      { id: 'slack', name: 'Slack', icon: 'slack', desc: 'Notifications et messages d\'équipe' },
      { id: 'teams', name: 'Microsoft Teams', icon: 'teams', desc: 'Chat et canaux Microsoft Teams' },
    ],
  },
  {
    category: 'payment',
    label: 'Paiement en ligne',
    providers: [
      { id: 'stripe', name: 'Stripe', icon: 'stripe', desc: 'Paiements par carte et SEPA' },
      { id: 'paypal', name: 'PayPal', icon: 'paypal', desc: 'Paiements PayPal' },
    ],
  },
  {
    category: 'webhook',
    label: 'Webhooks',
    providers: [
      { id: 'webhook', name: 'Webhooks personnalisés', icon: 'webhook', desc: 'Automatisations et notifications vers URLs externes' },
    ],
  },
];

const getAvailableIntegrations = async (req, res) => {
  try {
    res.json(AVAILABLE_INTEGRATIONS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ——— Intégrations (API, webhooks) ———
const getIntegrations = async (req, res) => {
  try {
    const list = await Integration.find({}).populate('createdBy', 'name').lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createIntegration = async (req, res) => {
  try {
    const sanitized = sanitizeIntegrationInput(req.body);
    const validationError = validateIntegrationInput(sanitized);
    if (validationError) return res.status(400).json({ message: validationError });
    if (sanitized.type === 'provider') {
      const duplicate = await Integration.findOne({ type: 'provider', provider: sanitized.provider }).lean();
      if (duplicate) {
        return res.status(409).json({ message: `Une configuration existe déjà pour le provider "${sanitized.provider}".` });
      }
    }
    const integration = await Integration.create({
      ...sanitized,
      createdBy: req.user._id,
    });
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'CREATE_INTEGRATION',
      entity: 'Integration',
      entityId: integration._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      ...meta,
    });
    res.status(201).json(integration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateIntegration = async (req, res) => {
  try {
    const existing = await Integration.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Intégration introuvable.' });
    const sanitized = sanitizeIntegrationInput(req.body);
    const merged = {
      ...existing.toObject(),
      ...sanitized,
      config: { ...(existing.config || {}), ...(sanitized.config || {}) },
    };
    const validationError = validateIntegrationInput(merged);
    if (validationError) return res.status(400).json({ message: validationError });
    if (merged.type === 'provider') {
      const duplicate = await Integration.findOne({
        _id: { $ne: existing._id },
        type: 'provider',
        provider: merged.provider,
      }).lean();
      if (duplicate) {
        return res.status(409).json({ message: `Une configuration existe déjà pour le provider "${merged.provider}".` });
      }
    }
    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      {
        ...sanitized,
        config: { ...(existing.config || {}), ...(sanitized.config || {}) },
        updatedAt: new Date(),
      },
      { new: true }
    );
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_INTEGRATION',
      entity: 'Integration',
      entityId: integration._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      ...meta,
    });
    res.json(integration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteIntegration = async (req, res) => {
  try {
    const integration = await Integration.findByIdAndDelete(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Intégration introuvable.' });
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'DELETE_INTEGRATION',
      entity: 'Integration',
      entityId: integration._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      ...meta,
    });
    res.json({ message: 'Intégration supprimée.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const testIntegration = async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: 'Intégration introuvable.' });

    const result = await integrationService.testIntegrationConnection(integration);
    integration.lastTriggeredAt = new Date();
    integration.lastStatus = 'success';
    await integration.save();

    const meta = getRequestMeta(req);
    await logAudit({
      action: 'TEST_INTEGRATION',
      entity: 'Integration',
      entityId: integration._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { result: result.mode },
      ...meta,
    });

    res.json({
      ok: true,
      message: result.message,
      mode: result.mode,
      integrationId: integration._id,
      testedAt: integration.lastTriggeredAt,
    });
  } catch (error) {
    try {
      await Integration.findByIdAndUpdate(req.params.id, {
        lastTriggeredAt: new Date(),
        lastStatus: `error_test_${String(error.message || 'unknown').slice(0, 120)}`,
      });
    } catch (e) {
      // ignore secondary persistence errors
    }
    res.status(400).json({ message: error.message || 'Échec du test d\'intégration.' });
  }
};

// ——— Workflows ———
const getWorkflows = async (req, res) => {
  try {
    const list = await Workflow.find({}).populate('createdBy', 'name').lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.create({
      ...req.body,
      createdBy: req.user._id,
    });
    const syncedEvents = await syncWorkflowEventsToIntegrations();
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'CREATE_WORKFLOW',
      entity: 'Workflow',
      entityId: workflow._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { syncedEvents },
      ...meta,
    });
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!workflow) return res.status(404).json({ message: 'Workflow introuvable.' });
    const syncedEvents = await syncWorkflowEventsToIntegrations();
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_WORKFLOW',
      entity: 'Workflow',
      entityId: workflow._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { syncedEvents },
      ...meta,
    });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndDelete(req.params.id);
    if (!workflow) return res.status(404).json({ message: 'Workflow introuvable.' });
    const syncedEvents = await syncWorkflowEventsToIntegrations();
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'DELETE_WORKFLOW',
      entity: 'Workflow',
      entityId: workflow._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { syncedEvents },
      ...meta,
    });
    res.json({ message: 'Workflow supprimé.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
