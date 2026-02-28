import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import './AdminCommon.css';

const DEFAULT_KEYS = [
  { key: 'email_verification', label: 'Vérification email' },
  { key: 'password_reset', label: 'Réinitialisation mot de passe' },
  { key: 'invoice_reminder', label: 'Rappel facture' },
  { key: 'quote_sent', label: 'Devis envoyé' },
  { key: 'project_update', label: 'Mise à jour projet' },
];

const EmailNotifications = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ enabled: true, channels: { email: true, inApp: true }, template: {} });

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data } = await API.get('/admin/notifications');
        setConfigs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      key: c.key,
      enabled: c.enabled !== false,
      channels: c.channels || { email: true, inApp: true },
      template: c.template || {},
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await API.put('/admin/notifications', form);
      setEditing(null);
      const { data } = await API.get('/admin/notifications');
      setConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const list = configs.length > 0 ? configs : DEFAULT_KEYS.map((d) => ({ key: d.key, label: d.label, enabled: true }));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Emails & Notifications</h1>
      </div>
      <p className="admin-page-subtitle">
        Activer ou désactiver les types de notifications et canaux (email, in-app).
      </p>

      <div className="admin-card admin-table-wrap">
        {loading ? (
          <div className="admin-loading">Chargement</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Actif</th>
                <th>Email</th>
                <th>In-app</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.key}>
                  <td>{c.label || c.key}</td>
                  <td>{c.enabled !== false ? 'Oui' : 'Non'}</td>
                  <td>{c.channels?.email !== false ? 'Oui' : 'Non'}</td>
                  <td>{c.channels?.inApp !== false ? 'Oui' : 'Non'}</td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openEdit(c)}>Configurer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Configurer : {editing.label || editing.key}</h2>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  />
                  {' '}Notification activée
                </label>
              </div>
              <div className="admin-form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.channels?.email !== false}
                    onChange={(e) => setForm({
                      ...form,
                      channels: { ...form.channels, email: e.target.checked },
                    })}
                  />
                  {' '}Envoyer par email
                </label>
              </div>
              <div className="admin-form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.channels?.inApp !== false}
                    onChange={(e) => setForm({
                      ...form,
                      channels: { ...form.channels, inApp: e.target.checked },
                    })}
                  />
                  {' '}Notification in-app
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Fermer</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailNotifications;
