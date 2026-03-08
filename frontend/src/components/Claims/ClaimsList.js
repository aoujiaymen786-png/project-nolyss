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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div className="modal-content" style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', maxWidth: '560px', width: '90%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Réclamation — {selected.subject}</h3>
            <p><strong>Client :</strong> {selected.client?.name || selected.client?.email}</p>
            <p><strong>Type :</strong> {CLAIM_TYPE_LABELS[selected.type] || selected.type}</p>
            {selected.project?.name && <p><strong>Projet :</strong> {selected.project.name}</p>}
            {selected.invoice?.number && <p><strong>Facture :</strong> {selected.invoice.number}</p>}
            <p><strong>Message :</strong></p>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>{selected.message}</div>
            {selected.response && (
              <>
                <p><strong>Votre réponse précédente :</strong></p>
                <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{selected.response}</div>
              </>
            )}
            <form onSubmit={handlePatch}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Statut</label>
                <select
                  className="form-control"
                  value={patchForm.status}
                  onChange={(e) => setPatchForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="open">Ouverte</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolue</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Réponse au client</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={patchForm.response}
                  onChange={(e) => setPatchForm((f) => ({ ...f, response: e.target.value }))}
                  placeholder="Réponse à envoyer au client..."
                />
              </div>
              <div>
                <button type="submit" className="btn btn-primary" disabled={saving}>Enregistrer</button>
                <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => setSelected(null)}>Fermer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimsList;
