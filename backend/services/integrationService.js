const Integration = require('../models/Integration');
const nodemailer = require('nodemailer');

const WEBHOOK_COMPAT_PROVIDERS = new Set(['slack', 'teams']);

const normalizeEvents = (events) => (
  Array.isArray(events)
    ? events
      .map((e) => String(e || '').trim())
      .filter(Boolean)
    : []
);

const shouldTriggerForEvent = (integration, eventName) => {
  const events = normalizeEvents(integration.events);
  // Aucun filtre d'event = déclenché pour tous les événements.
  if (events.length === 0) return true;
  return events.includes(eventName);
};

const getIntegrationWebhookUrl = (integration) => {
  if (integration.type === 'webhook') return integration.webhookUrl || '';
  if (!WEBHOOK_COMPAT_PROVIDERS.has(integration.provider)) return '';
  return integration.webhookUrl || integration.config?.webhookUrl || '';
};

const buildRequestHeaders = (integration, eventName) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Nolyss-Event': eventName,
  };
  if (integration.config?.headers && typeof integration.config.headers === 'object') {
    Object.assign(headers, integration.config.headers);
  }
  if (integration.config?.secret) {
    headers['X-Nolyss-Signature'] = integration.config.secret;
  }
  return headers;
};

const formatStatusMessage = (statusCode, errorMessage = '') => {
  if (!statusCode && !errorMessage) return 'error';
  if (statusCode && !errorMessage) return `error_http_${statusCode}`;
  return `error_${statusCode || 'network'}_${String(errorMessage).slice(0, 120)}`;
};

const triggerIntegrations = async (eventName, payload = {}, context = {}) => {
  if (!eventName) return { triggered: 0, success: 0, failed: 0 };

  const activeIntegrations = await Integration.find({ isActive: true }).lean();
  const candidates = activeIntegrations.filter((integration) => {
    const url = getIntegrationWebhookUrl(integration);
    return Boolean(url) && shouldTriggerForEvent(integration, eventName);
  });

  if (candidates.length === 0) return { triggered: 0, success: 0, failed: 0 };

  let success = 0;
  let failed = 0;

  for (const integration of candidates) {
    const webhookUrl = getIntegrationWebhookUrl(integration);
    const method = (integration.config?.method || 'POST').toUpperCase();
    const requestBody = {
      event: eventName,
      payload,
      context,
      integration: {
        id: integration._id,
        name: integration.name,
        provider: integration.provider || null,
        type: integration.type,
      },
      sentAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(webhookUrl, {
        method,
        headers: buildRequestHeaders(integration, eventName),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        failed += 1;
        await Integration.findByIdAndUpdate(integration._id, {
          lastTriggeredAt: new Date(),
          lastStatus: formatStatusMessage(response.status),
        });
        continue;
      }

      success += 1;
      await Integration.findByIdAndUpdate(integration._id, {
        lastTriggeredAt: new Date(),
        lastStatus: 'success',
      });
    } catch (error) {
      failed += 1;
      await Integration.findByIdAndUpdate(integration._id, {
        lastTriggeredAt: new Date(),
        lastStatus: formatStatusMessage(null, error.message),
      });
    }
  }

  return { triggered: candidates.length, success, failed };
};

const testIntegrationConnection = async (integration) => {
  if (!integration) throw new Error('Intégration introuvable.');

  const provider = integration.provider || '';
  const webhookUrl = getIntegrationWebhookUrl(integration);

  if (integration.type === 'webhook' || WEBHOOK_COMPAT_PROVIDERS.has(provider)) {
    if (!webhookUrl) throw new Error('Aucune URL webhook configurée.');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nolyss-Event': 'integration.test',
      },
      body: JSON.stringify({
        event: 'integration.test',
        payload: {
          integrationId: integration._id,
          provider: integration.provider || null,
          name: integration.name,
        },
        sentAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error(`Webhook test échoué (${response.status})`);
    }
    return { mode: 'webhook', message: 'Webhook joignable et test envoyé.' };
  }

  if (provider === 'smtp') {
    const transporter = nodemailer.createTransport({
      host: integration.config?.host,
      port: Number(integration.config?.port || 587),
      secure: Number(integration.config?.port) === 465,
      auth: {
        user: integration.config?.user,
        pass: integration.config?.pass,
      },
    });
    await transporter.verify();
    return { mode: 'smtp', message: 'Connexion SMTP validée avec succès.' };
  }

  return {
    mode: 'config',
    message: 'Configuration enregistrée. Test de connectivité distant non disponible pour ce provider.',
  };
};

module.exports = {
  triggerIntegrations,
  testIntegrationConnection,
};
