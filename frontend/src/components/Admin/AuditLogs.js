import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import './AdminCommon.css';

const ACTIONS = ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UPDATE_USER_ROLE', 'UPDATE_SYSTEM_SETTINGS', 'UPDATE_NOTIFICATION_CONFIG', 'CREATE_INTEGRATION', 'UPDATE_INTEGRATION', 'DELETE_INTEGRATION', 'CREATE_WORKFLOW', 'UPDATE_WORKFLOW', 'DELETE_WORKFLOW'];

const ACTION_LABELS = {
  CREATE_USER: 'Création utilisateur',
  UPDATE_USER: 'Modification utilisateur',
  DELETE_USER: 'Suppression utilisateur',
  UPDATE_USER_ROLE: 'Changement de rôle',
  UPDATE_SYSTEM_SETTINGS: 'Modification paramètres système',
  UPDATE_NOTIFICATION_CONFIG: 'Modification notifications',
  CREATE_INTEGRATION: 'Création intégration',
  UPDATE_INTEGRATION: 'Modification intégration',
  DELETE_INTEGRATION: 'Suppression intégration',
  CREATE_WORKFLOW: 'Création workflow',
  UPDATE_WORKFLOW: 'Modification workflow',
  DELETE_WORKFLOW: 'Suppression workflow',
};

const ENTITY_LABELS = {
  User: 'Utilisateur',
  SystemSettings: 'Paramètres système',
  Integration: 'Intégration',
  Workflow: 'Workflow',
  NotificationConfig: 'Configuration notifications',
};

const AuditLogs = () => {
  const [data, setData] = useState({ logs: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 50 });
        if (filterAction) params.set('action', filterAction);
        if (filterEntity) params.set('entity', filterEntity);
        const { data: res } = await API.get(`/admin/audit-logs?${params}`);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, filterAction, filterEntity]);

  const totalPages = Math.ceil(data.total / data.limit) || 1;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Audit & Conformité (RGPD)</h1>
      </div>
      <p className="admin-page-subtitle">
        Historique des actions sensibles pour la traçabilité et la conformité.
      </p>

      <div className="admin-card admin-filters-wrap">
        <div className="admin-filters">
          <div className="admin-form-group">
            <label>Action</label>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="admin-select-inline"
              style={{ minWidth: '180px' }}
            >
              <option value="">Toutes</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-group">
            <label>Entité</label>
            <select
              value={filterEntity}
              onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
              className="admin-select-inline"
              style={{ minWidth: '140px' }}
            >
              <option value="">Toutes</option>
              <option value="User">{ENTITY_LABELS.User}</option>
              <option value="SystemSettings">{ENTITY_LABELS.SystemSettings}</option>
              <option value="Integration">{ENTITY_LABELS.Integration}</option>
              <option value="Workflow">{ENTITY_LABELS.Workflow}</option>
              <option value="NotificationConfig">{ENTITY_LABELS.NotificationConfig}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card admin-table-wrap">
        {loading ? (
          <div className="admin-loading">Chargement</div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Par</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.length === 0 ? (
                  <tr><td colSpan={5} className="admin-empty">Aucun log</td></tr>
                ) : (
                  data.logs.map((log) => (
                    <tr key={log._id}>
                      <td>{new Date(log.createdAt).toLocaleString('fr-FR')}</td>
                      <td><code style={{ fontSize: '0.8rem' }}>{ACTION_LABELS[log.action] || log.action}</code></td>
                      <td>{ENTITY_LABELS[log.entity] || log.entity}</td>
                      <td>{log.performedBy?.email || log.performedByEmail || '-'}</td>
                      <td>
                        {log.changes && (
                          <details>
                            <summary>Voir</summary>
                            <pre style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap', maxWidth: '300px' }}>
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="admin-pagination">
                <span className="admin-pagination-info">{data.total} résultat(s)</span>
                <div className="admin-pagination-buttons">
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Précédent
                  </button>
                  <span className="admin-pagination-info">Page {page} / {totalPages}</span>
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
