import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../utils/api';
import KpiIcon from '../UI/KpiIcon';
import PaymentModal from './PaymentModal';
import QuoteDetailModal from './QuoteDetailModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import '../Dashboard/Dashboard.css';

const PROJECT_STATUS_LABELS = {
  prospecting: 'Prospection',
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

const ClientDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewQuoteId, setViewQuoteId] = useState(null);
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ type: 'project_delay', subject: '', message: '', projectId: '', invoiceId: '' });
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setError('');
      const [projectsRes, invoicesRes, quotesRes, deliverablesRes, claimsRes] = await Promise.all([
        API.get('/client-portal/projects'),
        API.get('/client-portal/invoices'),
        API.get('/client-portal/quotes'),
        API.get('/client-portal/deliverables'),
        API.get('/client-portal/claims'),
      ]);
      setProjects(projectsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setQuotes(quotesRes.data || []);
      setDeliverables(deliverablesRes.data || []);
      setClaims(claimsRes.data || []);
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

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const closePaymentModal = () => {
    setSelectedInvoice(null);
  };

  const handlePaymentSuccess = async () => {
    await fetchData();
    toast.success('Paiement enregistré avec succès.');
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimForm.subject?.trim() || !claimForm.message?.trim()) {
      toast.error('Veuillez remplir le sujet et le message.');
      return;
    }
    try {
      setClaimSubmitting(true);
      await API.post('/client-portal/claims', {
        type: claimForm.type,
        subject: claimForm.subject.trim(),
        message: claimForm.message.trim(),
        projectId: claimForm.projectId || undefined,
        invoiceId: claimForm.invoiceId || undefined,
      });
      toast.success('Réclamation envoyée. La direction ou la coordinatrice vous répondra sous peu.');
      setShowClaimForm(false);
      setClaimForm({ type: 'project_delay', subject: '', message: '', projectId: '', invoiceId: '' });
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setClaimSubmitting(false);
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
        <div className="kpi-card"><KpiIcon name="warning" /><div className="kpi-content"><h3>Reclamations</h3><p className="kpi-value">{claims.filter((c) => c.status !== 'resolved').length}</p></div></div>
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
                    <td>
                      <span className="project-name">{p.name}</span>
                      {(p.progressPercentage ?? 0) === 0 && (
                        <span className="project-hint" style={{ color: 'var(--text-secondary)', fontSize: '0.9em', fontWeight: 'normal' }}> — En cours de préparation</span>
                      )}
                    </td>
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
        <h3>Mes devis</h3>
        <p className="muted">Devis liés à vos projets, au même titre que les factures. Vous pouvez les consulter et valider ou refuser ceux en attente.</p>
        {quotes.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Projet</th>
                  <th>Date</th>
                  <th>Validité</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q._id}>
                    <td><strong>{q.number}</strong></td>
                    <td>{q.project?.name || '—'}</td>
                    <td>{q.date ? new Date(q.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{q.validUntil ? new Date(q.validUntil).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{(q.totalTTC || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                    <td><span className={`status-${(q.status || '').toLowerCase()}`}>{QUOTE_STATUS_LABELS[q.status] || q.status}</span></td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewQuoteId(q._id)}>Consulter</button>
                      {q.status === 'sent' && (
                        <>
                          {' '}
                          <button type="button" disabled={actionLoadingId === q._id} className="btn btn-sm btn-success" onClick={() => handleQuoteDecision(q._id, 'accept')}>Valider</button>
                          {' '}
                          <button type="button" disabled={actionLoadingId === q._id} className="btn btn-sm btn-danger" onClick={() => handleQuoteDecision(q._id, 'refuse')}>Refuser</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun devis.</p>}
      </div>

      <div className="table-section">
        <h3>Réclamations</h3>
        <p className="claims-intro">
          En cas de problème (projet en retard, erreur sur une facture, etc.), vous pouvez déposer une réclamation. Elle sera traitée par la direction ou la coordinatrice selon la nature du problème.
        </p>
        <div className="claims-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowClaimForm(true)}>
            Déposer une réclamation
          </button>
        </div>
        {showClaimForm && (
          <div className="claims-form-card">
            <h4>Nouvelle réclamation</h4>
            <form className="claims-form" onSubmit={handleClaimSubmit}>
              <div className="form-group">
                <label htmlFor="claim-type">Type</label>
                <select
                  id="claim-type"
                  value={claimForm.type}
                  onChange={(e) => setClaimForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="project_delay">Projet en retard</option>
                  <option value="invoice_error">Erreur sur facture</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              {(claimForm.type === 'project_delay' || claimForm.type === 'other') && (
                <div className="form-group">
                  <label htmlFor="claim-project">Projet concerné (optionnel)</label>
                  <select
                    id="claim-project"
                    value={claimForm.projectId}
                    onChange={(e) => setClaimForm((f) => ({ ...f, projectId: e.target.value }))}
                  >
                    <option value="">— Aucun —</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {(claimForm.type === 'invoice_error' || claimForm.type === 'other') && (
                <div className="form-group">
                  <label htmlFor="claim-invoice">Facture concernée (optionnel)</label>
                  <select
                    id="claim-invoice"
                    value={claimForm.invoiceId}
                    onChange={(e) => setClaimForm((f) => ({ ...f, invoiceId: e.target.value }))}
                  >
                    <option value="">— Aucune —</option>
                    {invoices.map((i) => (
                      <option key={i._id} value={i._id}>{i.number}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="claim-subject">Sujet *</label>
                <input
                  id="claim-subject"
                  type="text"
                  value={claimForm.subject}
                  onChange={(e) => setClaimForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Objet de la réclamation"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="claim-message">Message *</label>
                <textarea
                  id="claim-message"
                  rows={4}
                  value={claimForm.message}
                  onChange={(e) => setClaimForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez le problème..."
                  required
                />
              </div>
              <div className="claims-form-actions">
                <button type="submit" className="btn-primary" disabled={claimSubmitting}>
                  Envoyer
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowClaimForm(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}
        {claims.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Sujet</th><th>Statut</th><th>Assigné</th><th>Réponse</th></tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c._id}>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{CLAIM_TYPE_LABELS[c.type] || c.type}</td>
                    <td>{c.subject}</td>
                    <td><span className={`status-${(c.status || '').toLowerCase().replace('_', '-')}`}>{CLAIM_STATUS_LABELS[c.status] || c.status}</span></td>
                    <td>{c.assignedTo?.name || '—'}</td>
                    <td>{c.response ? <span title={c.response}>{c.response.slice(0, 50)}{c.response.length > 50 ? '…' : ''}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucune reclamation.</p>}
      </div>

      <div className="table-section">
        <h3>Mes factures</h3>
        <p className="muted">Factures liées à vos projets. Vous pouvez consulter les montants et régler celles en attente.</p>
        {invoices.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Projet</th>
                  <th>Date</th>
                  <th>Échéance</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const remaining = (i.totalTTC || 0) - (i.paidAmount || 0);
                  const canPay = ['sent', 'overdue'].includes(i.status) && remaining > 0.01;
                  return (
                    <tr key={i._id}>
                      <td><strong>{i.number}</strong></td>
                      <td>{i.project?.name || '—'}</td>
                      <td>{i.date ? new Date(i.date).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>{i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>{(i.totalTTC || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                      <td><span className={`status-${(i.status || '').toLowerCase()}`}>{INVOICE_STATUS_LABELS[i.status] || i.status}</span></td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewInvoiceId(i._id)}>Consulter</button>
                        {canPay && (
                          <>
                            {' '}
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => openPaymentModal(i)}
                            >
                              Payer
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p>Aucune facture.</p>}
      </div>

      {viewQuoteId && (
        <QuoteDetailModal
          quoteId={viewQuoteId}
          onClose={() => setViewQuoteId(null)}
          onValidated={fetchData}
        />
      )}
      {viewInvoiceId && (
        <InvoiceDetailModal
          invoiceId={viewInvoiceId}
          onClose={() => setViewInvoiceId(null)}
          onPay={(inv) => { setViewInvoiceId(null); setSelectedInvoice(inv); }}
        />
      )}
      {selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={closePaymentModal}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default ClientDashboard;