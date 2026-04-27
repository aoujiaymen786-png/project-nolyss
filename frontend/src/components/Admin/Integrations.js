import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { Mail, Cloud, Calendar, MessageCircle, CreditCard, Link2, Plug } from 'lucide-react';
import './AdminCommon.css';
import './Integrations.css';

const PROVIDER_CONFIG_FIELDS = {
  smtp: [
    { key: 'host', label: 'Serveur SMTP', placeholder: 'smtp.gmail.com', type: 'text' },
    { key: 'port', label: 'Port', placeholder: '587', type: 'number' },
    { key: 'user', label: 'Utilisateur', type: 'text' },
    { key: 'pass', label: 'Mot de passe', type: 'password' },
    { key: 'from', label: 'Email expéditeur', type: 'text' },
  ],
  gmail: [
    { key: 'clientId', label: 'Client ID OAuth', type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  outlook: [
    { key: 'clientId', label: 'Application (client) ID', type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  googledrive: [
    { key: 'clientId', label: 'Client ID OAuth', type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  dropbox: [
    { key: 'apiKey', label: 'Access Token / API Key', type: 'password' },
  ],
  s3: [
    { key: 'apiKey', label: 'Access Key ID', type: 'text' },
    { key: 'secret', label: 'Secret Access Key', type: 'password' },
    { key: 'bucket', label: 'Bucket', type: 'text' },
    { key: 'region', label: 'Région', placeholder: 'eu-west-1', type: 'text' },
  ],
  googlecalendar: [
    { key: 'clientId', label: 'Client ID OAuth', type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  outlookcalendar: [
    { key: 'clientId', label: 'Application (client) ID', type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  slack: [
    { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...', type: 'url' },
  ],
  teams: [
    { key: 'webhookUrl', label: 'Webhook Incoming', placeholder: 'https://outlook.office.com/webhook/...', type: 'url' },
  ],
  stripe: [
    { key: 'apiKey', label: 'Clé secrète (sk_...)', type: 'password' },
    { key: 'endpoint', label: 'Webhook secret (optionnel)', type: 'password' },
  ],
  paypal: [
    { key: 'clientId', label: 'Client ID', type: 'text' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  webhook: [
    { key: 'webhookUrl', label: 'URL Webhook', placeholder: 'https://...', type: 'url' },
  ],
};

const CATEGORY_ICONS = {
  email: Mail,
  storage: Cloud,
  calendar: Calendar,
  communication: MessageCircle,
  payment: CreditCard,
  webhook: Link2,
};

const Integrations = () => {
  const [available, setAvailable] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [providerModal, setProviderModal] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'webhook', isActive: true, webhookUrl: '', events: [] });
  const [providerForm, setProviderForm] = useState({ name: '', provider: '', category: '', isActive: true, config: {}, webhookUrl: '' });
  const [testingId, setTestingId] = useState('');
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const [availRes, listRes] = await Promise.all([
          API.get('/admin/integrations/available'),
          API.get('/admin/integrations'),
        ]);
        setAvailable(availRes.data);
        setList(listRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getConfigured = (providerId) => {
    if (providerId === 'webhook') return null;
    return list.find((i) => i.provider === providerId);
  };

  const openProviderConfig = (category, provider) => {
    if (provider.id === 'webhook') {
      openCreate();
      return;
    }
    const configured = getConfigured(provider.id);
    const config = configured?.config || {};
    setProviderForm({
      _id: configured?._id,
      name: configured?.name || `${provider.name} (${category.label})`,
      provider: provider.id,
      category: category.category,
      type: 'provider',
      isActive: configured?.isActive !== false,
      config: { ...config },
      webhookUrl: configured?.webhookUrl || config.webhookUrl || '',
    });
    setProviderModal({ category, provider });
  };

  const openCreate = () => {
    setForm({ name: '', type: 'webhook', isActive: true, webhookUrl: '', events: [] });
    setModal('create');
  };

  const openEdit = (item) => {
    setForm({
      _id: item._id,
      name: item.name,
      type: item.type || 'webhook',
      isActive: item.isActive !== false,
      webhookUrl: item.webhookUrl || '',
      events: item.events || [],
    });
    setModal('edit');
  };

  const handleProviderSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: providerForm.name,
        type: 'provider',
        provider: providerForm.provider,
        category: providerForm.category,
        isActive: providerForm.isActive,
        config: providerForm.config,
        webhookUrl: providerForm.webhookUrl || undefined,
      };
      if (providerForm._id) {
        await API.put(`/admin/integrations/${providerForm._id}`, payload);
      } else {
        await API.post('/admin/integrations', payload);
      }
      setProviderModal(null);
      const { data } = await API.get('/admin/integrations');
      setList(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'create') {
        await API.post('/admin/integrations', { ...form, type: 'webhook' });
      } else {
        const { _id, ...payload } = form;
        await API.put(`/admin/integrations/${form._id}`, payload);
      }
      setModal(null);
      const { data } = await API.get('/admin/integrations');
      setList(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette intégration ?')) return;
    try {
      await API.delete(`/admin/integrations/${id}`);
      setList(list.filter((i) => i._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleTestIntegration = async (integrationId) => {
    if (!integrationId) return;
    try {
      setTestingId(integrationId);
      const { data } = await API.post(`/admin/integrations/${integrationId}/test`);
      setTestResults((prev) => ({
        ...prev,
        [integrationId]: { ok: true, message: data.message },
      }));
      alert(data.message || 'Test réussi.');
    } catch (err) {
      const message = err.response?.data?.message || 'Échec du test de connexion.';
      setTestResults((prev) => ({
        ...prev,
        [integrationId]: { ok: false, message },
      }));
      alert(message);
    } finally {
      setTestingId('');
    }
  };

  const customWebhooks = list.filter((i) => i.type === 'webhook' && !i.provider);

  return (
    <div className="admin-page integrations-page">
      <div className="admin-page-header">
        <h1>Intégrations</h1>
      </div>
      <p className="admin-page-subtitle">
        Connectez vos services préférés : email, stockage cloud, calendriers, communication et paiements.
        Webhooks pour automatisations personnalisées.
      </p>

      {loading ? (
        <div className="admin-loading">Chargement</div>
      ) : (
        <>
          {/* Grille des intégrations disponibles */}
          <div className="integrations-grid">
            {available.map((cat) => (
              <div key={cat.category} className="integration-category-card">
                <div className="integration-category-header">
                  <span className="integration-category-icon">
                  {(() => {
                    const IconComponent = CATEGORY_ICONS[cat.category] || Plug;
                    return <IconComponent size={22} strokeWidth={1.8} />;
                  })()}
                </span>
                  <h3>{cat.label}</h3>
                </div>
                <div className="integration-providers">
                  {cat.providers.map((prov) => {
                    const configured = prov.id === 'webhook' ? customWebhooks.length > 0 : getConfigured(prov.id);
                    const test = configured?._id ? testResults[configured._id] : null;
                    return (
                      <div
                        key={prov.id}
                        className={`integration-provider-card ${configured ? 'configured' : ''}`}
                        onClick={() => openProviderConfig(cat, prov)}
                      >
                        <div className="integration-provider-info">
                          <span className="integration-provider-name">{prov.name}</span>
                          <span className="integration-provider-desc">{prov.desc}</span>
                        </div>
                        <div className="integration-provider-status">
                          {prov.id === 'webhook' ? (
                            <span className="status-badge">{customWebhooks.length} webhook(s)</span>
                          ) : configured ? (
                            <div className="integration-status-stack">
                              <span className="status-badge active">Configuré</span>
                              {test ? (
                                <span className={`status-badge ${test.ok ? 'status-test-ok' : 'status-test-ko'}`}>
                                  {test.ok ? 'Test OK' : 'Test KO'}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="btn-sm integration-test-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestIntegration(configured._id);
                                }}
                                disabled={testingId === configured._id}
                              >
                                {testingId === configured._id ? 'Test...' : 'Tester'}
                              </button>
                            </div>
                          ) : (
                            <span className="status-badge">Non configuré</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Webhooks personnalisés */}
          <div className="admin-card admin-table-wrap">
            <h3>Webhooks personnalisés</h3>
            <p className="integrations-webhooks-desc">
              Créez des webhooks pour notifier vos outils externes (création projet, facture payée, etc.).
            </p>
            <button type="button" className="btn-primary" onClick={openCreate}>Nouveau webhook</button>
            {customWebhooks.length === 0 ? (
              <p className="admin-empty">Aucun webhook personnalisé.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Actif</th>
                    <th>URL</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customWebhooks.map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{item.isActive !== false ? 'Oui' : 'Non'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.webhookUrl || '-'}</td>
                      <td>
                        <button type="button" className="btn-sm" onClick={() => openEdit(item)}>Modifier</button>
                        <button
                          type="button"
                          className="btn-sm integration-test-btn"
                          onClick={() => handleTestIntegration(item._id)}
                          disabled={testingId === item._id}
                        >
                          {testingId === item._id ? 'Test...' : 'Tester'}
                        </button>
                        <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(item._id)}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal configuration fournisseur */}
      {providerModal && (
        <div className="admin-modal-overlay" onClick={() => setProviderModal(null)}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>Configurer {providerModal.provider.name}</h2>
            <form onSubmit={handleProviderSubmit}>
              <div className="admin-form-group">
                <label>Nom</label>
                <input
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  required
                  placeholder={`Intégration ${providerModal.provider.name}`}
                />
              </div>
              {PROVIDER_CONFIG_FIELDS[providerModal.provider.id]?.map((f) => (
                <div key={f.key} className="admin-form-group">
                  <label>{f.label}</label>
                  <input
                    type={f.type === 'url' ? 'url' : f.type}
                    value={providerForm.config?.[f.key] ?? providerForm[f.key] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (f.key === 'webhookUrl') {
                        setProviderForm({ ...providerForm, webhookUrl: val });
                      } else {
                        setProviderForm({
                          ...providerForm,
                          config: { ...providerForm.config, [f.key]: val },
                        });
                      }
                    }}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="admin-form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={providerForm.isActive}
                    onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                  />
                  {' '}Activer cette intégration
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setProviderModal(null)}>Annuler</button>
                {providerForm._id ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleTestIntegration(providerForm._id)}
                    disabled={testingId === providerForm._id}
                  >
                    {testingId === providerForm._id ? 'Test...' : 'Tester la connexion'}
                  </button>
                ) : null}
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal webhook personnalisé */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Nouveau webhook' : 'Modifier le webhook'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>Nom</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Mon webhook"
                />
              </div>
              <div className="admin-form-group">
                <label>URL Webhook</label>
                <input
                  type="url"
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  {' '}Actif
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
