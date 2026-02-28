import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import './AdminCommon.css';

const DEFAULTS = {
  appName: 'Nolyss',
  maintenanceMode: false,
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 60,
  rgpdRetentionDays: 365,
  twoFactorRequired: false,
  quoteValidationThreshold: 5000,
  invoiceValidationThreshold: 5000,
  quoteNumberPrefix: 'DEV',
  invoiceNumberPrefix: 'FAC',
  billingLegalMentions: '',
  documentRetentionYears: 10,
};

const AdminSettings = () => {
  const [settings, setSettings] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await API.get('/admin/settings');
        setSettings({ ...DEFAULTS, ...data });
      } catch (err) {
        setMessage(err.response?.data?.message || 'Erreur chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await API.put('/admin/settings', settings);
      setMessage('Paramètres enregistrés.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page"><div className="admin-loading">Chargement</div></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Paramètres de la plateforme</h1>
      </div>
      {message && (
        <div className={message.includes('Erreur') ? 'admin-error' : 'admin-success'}>
          {message}
        </div>
      )}
      <div className="admin-card">
        <form onSubmit={handleSubmit}>
          <h3>Général</h3>
          <div className="admin-form-group">
            <label>Nom de l&#39;application</label>
            <input
              value={settings.appName || ''}
              onChange={(e) => handleChange('appName', e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label>
              <input
                type="checkbox"
                checked={!!settings.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
              />
              {' '}Mode maintenance
            </label>
          </div>

          <h3>Sécurité</h3>
          <div className="admin-form-group">
            <label>Nombre max. de tentatives de connexion</label>
            <input
              type="number"
              min={3}
              max={20}
              value={settings.maxLoginAttempts ?? 5}
              onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value, 10))}
            />
          </div>
          <div className="admin-form-group">
            <label>Timeout session (minutes)</label>
            <input
              type="number"
              min={5}
              max={1440}
              value={settings.sessionTimeoutMinutes ?? 60}
              onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value, 10))}
            />
          </div>
          <div className="admin-form-group">
            <label>
              <input
                type="checkbox"
                checked={!!settings.twoFactorRequired}
                onChange={(e) => handleChange('twoFactorRequired', e.target.checked)}
              />
              {' '}Exiger 2FA pour les admins
            </label>
          </div>

          <h3>Validation Directeur (seuils)</h3>
          <div className="admin-form-group">
            <label>Seuil validation devis (TND) – au-dessus, le directeur doit valider</label>
            <input
              type="number"
              min={0}
              step={100}
              value={settings.quoteValidationThreshold ?? 5000}
              onChange={(e) => handleChange('quoteValidationThreshold', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="admin-form-group">
            <label>Seuil validation facture (TND) – au-dessus, le directeur doit valider</label>
            <input
              type="number"
              min={0}
              step={100}
              value={settings.invoiceValidationThreshold ?? 5000}
              onChange={(e) => handleChange('invoiceValidationThreshold', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <h3>Facturation & Conformité légale</h3>
          <div className="admin-form-group">
            <label>Préfixe numérotation devis (ex: DEV)</label>
            <input
              type="text"
              value={settings.quoteNumberPrefix ?? 'DEV'}
              onChange={(e) => handleChange('quoteNumberPrefix', e.target.value)}
              placeholder="DEV"
            />
          </div>
          <div className="admin-form-group">
            <label>Préfixe numérotation factures (ex: FAC)</label>
            <input
              type="text"
              value={settings.invoiceNumberPrefix ?? 'FAC'}
              onChange={(e) => handleChange('invoiceNumberPrefix', e.target.value)}
              placeholder="FAC"
            />
          </div>
          <div className="admin-form-group">
            <label>Mentions légales obligatoires (affichées sur devis/factures)</label>
            <textarea
              rows={4}
              value={settings.billingLegalMentions ?? ''}
              onChange={(e) => handleChange('billingLegalMentions', e.target.value)}
              placeholder="SIRET, TVA, capital social, siège social..."
            />
          </div>
          <div className="admin-form-group">
            <label>Conservation des documents (années) – 10 ans recommandé</label>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.documentRetentionYears ?? 10}
              onChange={(e) => handleChange('documentRetentionYears', parseInt(e.target.value, 10) || 10)}
            />
          </div>

          <h3>RGPD & Conformité</h3>
          <div className="admin-form-group">
            <label>Rétention des logs (jours)</label>
            <input
              type="number"
              min={30}
              max={2555}
              value={settings.rgpdRetentionDays ?? 365}
              onChange={(e) => handleChange('rgpdRetentionDays', parseInt(e.target.value, 10))}
            />
          </div>

          <div className="admin-modal-actions" style={{ border: 'none', padding: 0, marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
