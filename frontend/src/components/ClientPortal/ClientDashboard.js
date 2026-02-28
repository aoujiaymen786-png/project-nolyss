import React, { useEffect, useMemo, useState } from 'react';
import API from '../../utils/api';
import KpiIcon from '../UI/KpiIcon';
import '../Dashboard/Dashboard.css';

const PROJECT_STATUS_LABELS = {
  prospecting: 'Prospection',
  quotation: 'Devis',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Termine',
  archived: 'Archive',
};

const INVOICE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  partial: 'Partielle',
  paid: 'Payee',
  overdue: 'En retard',
  cancelled: 'Annulee',
};

const QUOTE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoye',
  accepted: 'Accepte',
  refused: 'Refuse',
  converted: 'Converti',
};

const ClientDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const fetchData = async () => {
    try {
      setError('');
      const [projectsRes, invoicesRes, quotesRes, deliverablesRes] = await Promise.all([
        API.get('/client-portal/projects'),
        API.get('/client-portal/invoices'),
        API.get('/client-portal/quotes'),
        API.get('/client-portal/deliverables'),
      ]);
      setProjects(projectsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setQuotes(quotesRes.data || []);
      setDeliverables(deliverablesRes.data || []);
    } catch (e) {
      console.error('Erreur chargement espace client:', e);
      setError('Impossible de charger votre espace client pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingInvoices = useMemo(
    () => invoices.filter((i) => !['paid', 'cancelled'].includes(i.status)),
    [invoices]
  );

  const handleQuoteDecision = async (quoteId, action) => {
    try {
      setActionLoadingId(quoteId);
      await API.patch(`/client-portal/quotes/${quoteId}/accept-refuse`, { action });
      await fetchData();
    } catch (e) {
      console.error('Erreur validation devis client:', e);
      alert(e.response?.data?.message || 'Action impossible pour ce devis.');
    } finally {
      setActionLoadingId('');
    }
  };

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Mon espace client</h1>
        <p>Suivi de vos projets, livrables, devis et factures</p>
      </div>

      <div className="kpis-grid">
        <div className="kpi-card"><KpiIcon name="folder" /><div className="kpi-content"><h3>Projets actifs</h3><p className="kpi-value">{projects.filter((p) => ['prospecting', 'quotation', 'inProgress', 'validation'].includes(p.status)).length}</p></div></div>
        <div className="kpi-card"><KpiIcon name="package" /><div className="kpi-content"><h3>Livrables</h3><p className="kpi-value">{deliverables.length}</p></div></div>
        <div className="kpi-card"><KpiIcon name="file" /><div className="kpi-content"><h3>Factures en attente</h3><p className="kpi-value">{pendingInvoices.length}</p></div></div>
        <div className="kpi-card"><KpiIcon name="receipt" /><div className="kpi-content"><h3>Devis a valider</h3><p className="kpi-value">{quotes.filter((q) => q.status === 'sent').length}</p></div></div>
      </div>

      <div className="table-section">
        <h3>Mes projets</h3>
        {projects.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Projet</th><th>Statut</th><th>Progression</th><th>Manager</th><th>Echeance</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td><span className={`status-${(p.status || '').toLowerCase()}`}>{PROJECT_STATUS_LABELS[p.status] || p.status}</span></td>
                    <td>{p.progressPercentage ?? 0}%</td>
                    <td>{p.manager?.name || 'N/A'}</td>
                    <td>{p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun projet.</p>}
      </div>

      <div className="table-section">
        <h3>Livrables recents</h3>
        {deliverables.length > 0 ? (
          <ul className="deliverables-list">
            {deliverables.slice(0, 12).map((d, idx) => (
              <li className="deliverable-item" key={`${d.projectId || 'p'}-${idx}`}>
                <span className="deliverable-name">{d.name || 'Fichier'}</span>
                <span className="deliverable-project">{d.projectName || 'Projet'}</span>
                {d.url ? <a className="link-download" href={d.url} target="_blank" rel="noopener noreferrer">Telecharger</a> : null}
              </li>
            ))}
          </ul>
        ) : <p>Aucun livrable recent.</p>}
      </div>

      <div className="table-section">
        <h3>Devis</h3>
        {quotes.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Numero</th><th>Date</th><th>Montant</th><th>Statut</th><th>Action</th></tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q._id}>
                    <td>{q.number}</td>
                    <td>{q.date ? new Date(q.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{(q.totalTTC || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                    <td><span className={`status-${(q.status || '').toLowerCase()}`}>{QUOTE_STATUS_LABELS[q.status] || q.status}</span></td>
                    <td>
                      {q.status === 'sent' ? (
                        <>
                          <button type="button" disabled={actionLoadingId === q._id} className="btn btn-sm btn-success" onClick={() => handleQuoteDecision(q._id, 'accept')}>Valider</button>{' '}
                          <button type="button" disabled={actionLoadingId === q._id} className="btn btn-sm btn-danger" onClick={() => handleQuoteDecision(q._id, 'refuse')}>Refuser</button>
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun devis.</p>}
      </div>

      <div className="table-section">
        <h3>Mes factures</h3>
        {invoices.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Numero</th><th>Date</th><th>Echeance</th><th>Montant</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i._id}>
                    <td>{i.number}</td>
                    <td>{i.date ? new Date(i.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{(i.totalTTC || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                    <td><span className={`status-${(i.status || '').toLowerCase()}`}>{INVOICE_STATUS_LABELS[i.status] || i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucune facture.</p>}
      </div>
    </div>
  );
};

export default ClientDashboard;