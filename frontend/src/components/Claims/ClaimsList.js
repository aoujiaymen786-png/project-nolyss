import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../../utils/api';
import '../Dashboard/Dashboard.css';
import '../Admin/AdminCommon.css';

const CLAIM_TYPE_LABELS = {
  project_delay: 'Projet en retard',
  invoice_error: 'Erreur sur facture',
  other: 'Autre',
};

const CLAIM_STATUS_LABELS = {
  open: 'Ouverte',
  in_progress: 'En cours',
  resolved: 'Résolue',
};

const ClaimsList = () => {
  const { pathname } = useLocation();
  const isUnderClients = pathname.startsWith('/clients/claims');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [patchForm, setPatchForm] = useState({ status: '', response: '' });
  const [saving, setSaving] = useState(false);

  const fetchClaims = async () => {
    try {
      const { data } = await API.get('/claims');
      setClaims(data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur chargement des réclamations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const openDetail = (claim) => {
    setSelected(claim);
    setPatchForm({ status: claim.status || 'open', response: claim.response || '' });
  };

  const handlePatch = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setSaving(true);
      await API.patch(`/claims/${selected._id}`, {
        status: patchForm.status,
        response: patchForm.response || undefined,
      });
      toast.success('Réclamation mise à jour.');
      setSelected(null);
      fetchClaims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Chargement...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        {isUnderClients && (
          <Link to="/clients" className="claims-back-link">← Retour à la liste des clients</Link>
        )}
        <h1>Réclamations</h1>
        <p>Réclamations clients qui vous sont assignées</p>
      </div>

      {claims.length === 0 ? (
        <p>Aucune réclamation assignée.</p>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Type</th>
                <th>Sujet</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c._id}>
                  <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>{c.client?.name || c.client?.email || '—'}</td>
                  <td>{CLAIM_TYPE_LABELS[c.type] || c.type}</td>
                  <td>{c.subject}</td>
                  <td>
                    <span className={`status-${(c.status || '').toLowerCase().replace('_', '-')}`}>
                      {CLAIM_STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => openDetail(c)}>
                      Traiter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="claims-modal-overlay" onClick={() => setSelected(null)}>
          <div className="claims-modal claims-form-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="claims-modal-title">Réclamation — {selected.subject}</h3>
            <div className="claims-modal-meta">
              <p><strong>Client :</strong> {selected.client?.name || selected.client?.email}</p>
              <p><strong>Type :</strong> {CLAIM_TYPE_LABELS[selected.type] || selected.type}</p>
              {selected.project?.name && <p><strong>Projet :</strong> {selected.project.name}</p>}
              {selected.invoice?.number && <p><strong>Facture :</strong> {selected.invoice.number}</p>}
            </div>
            <p className="claims-modal-label"><strong>Message :</strong></p>
            <div className="claims-modal-message">{selected.message}</div>
            {selected.response && (
              <>
                <p className="claims-modal-label"><strong>Votre réponse précédente :</strong></p>
                <div className="claims-modal-previous-response">{selected.response}</div>
              </>
            )}
            <form className="claims-form claims-treatment-form" onSubmit={handlePatch}>
              <div className="form-group">
                <label>Statut</label>
                <select
                  value={patchForm.status}
                  onChange={(e) => setPatchForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="open">Ouverte</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolue</option>
                </select>
              </div>
              <div className="form-group">
                <label>Réponse au client</label>
                <textarea
                  rows={4}
                  value={patchForm.response}
                  onChange={(e) => setPatchForm((f) => ({ ...f, response: e.target.value }))}
                  placeholder="Réponse à envoyer au client..."
                />
              </div>
              <div className="claims-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>Enregistrer</button>
                <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimsList;
