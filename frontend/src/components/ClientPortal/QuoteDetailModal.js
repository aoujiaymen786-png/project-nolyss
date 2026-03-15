import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import '../Dashboard/Dashboard.css';

const QUOTE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  converted: 'Converti',
};

const formatCurrency = (n) =>
  n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(n) : '0 TND';

const QuoteDetailModal = ({ quoteId, onClose, onValidated }) => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/client-portal/quotes/${quoteId}`);
        if (!cancelled) setQuote(data);
      } catch (e) {
        if (!cancelled) alert(e.response?.data?.message || 'Impossible de charger le devis.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [quoteId]);

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await API.patch(`/client-portal/quotes/${quoteId}/accept-refuse`, { action: 'accept' });
      if (onValidated) onValidated();
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || 'Action impossible.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefuse = async () => {
    if (!window.confirm('Refuser ce devis ?')) return;
    setActionLoading(true);
    try {
      await API.patch(`/client-portal/quotes/${quoteId}/accept-refuse`, { action: 'refuse' });
      if (onValidated) onValidated();
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || 'Action impossible.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!quoteId) return null;

  return (
    <div className="payment-modal-backdrop document-detail-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="document-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>Devis {quote?.number || quoteId}</h2>
          <button type="button" className="payment-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="document-detail-body">
          {loading ? (
            <p>Chargement...</p>
          ) : !quote ? (
            <p>Devis introuvable.</p>
          ) : (
            <div className="document-detail-content document-detail-print">
              <div className="document-detail-meta">
                <p><strong>Numéro</strong> {quote.number}</p>
                <p><strong>Date</strong> {quote.date ? new Date(quote.date).toLocaleDateString('fr-FR') : '–'}</p>
                <p><strong>Valide jusqu'au</strong> {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-FR') : '–'}</p>
                {quote.project?.name && <p><strong>Projet</strong> {quote.project.name}</p>}
                <p><strong>Statut</strong> <span className={`status-${(quote.status || '').toLowerCase()}`}>{QUOTE_STATUS_LABELS[quote.status] || quote.status}</span></p>
              </div>
              {quote.lines?.length > 0 && (
                <table className="admin-table document-lines-table">
                  <thead>
                    <tr>
                      <th>Désignation</th>
                      <th>Qté</th>
                      <th>Prix unit. HT</th>
                      <th>TVA %</th>
                      <th>Remise</th>
                      <th>Total TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lines.map((line, idx) => {
                      const lineSubtotal = (line.quantity || 0) * (line.unitPrice || 0);
                      const lineDiscount = line.discountType === 'amount'
                        ? Math.min(line.discount || 0, lineSubtotal)
                        : lineSubtotal * ((line.discount || 0) / 100);
                      const afterDiscount = lineSubtotal - lineDiscount;
                      const lineTax = afterDiscount * ((line.taxRate || 0) / 100);
                      const lineTTC = afterDiscount + lineTax;
                      return (
                        <tr key={idx}>
                          <td>{line.description}</td>
                          <td>{Number(line.quantity)}</td>
                          <td>{formatCurrency(line.unitPrice)}</td>
                          <td>{line.taxRate ?? 20} %</td>
                          <td>{line.discountType === 'amount' ? formatCurrency(line.discount) : `${line.discount || 0} %`}</td>
                          <td>{formatCurrency(lineTTC)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="document-detail-totals">
                <p><strong>Total HT</strong> {formatCurrency(quote.subtotalHT)}</p>
                <p><strong>Total TVA</strong> {formatCurrency(quote.totalTax)}</p>
                <p><strong>Total TTC</strong> {formatCurrency(quote.totalTTC)}</p>
              </div>
              {quote.notes && (
                <div className="document-detail-notes">
                  <strong>Notes</strong>
                  <p>{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div className="document-detail-terms">
                  <strong>Conditions</strong>
                  <p>{quote.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {quote && (
          <div className="document-detail-actions payment-modal-actions">
            <button type="button" className="btn btn-outline" onClick={handlePrint}>
              Imprimer / Enregistrer en PDF
            </button>
            {quote.status === 'sent' && (
              <>
                <button type="button" className="btn btn-danger" onClick={handleRefuse} disabled={actionLoading}>
                  Refuser
                </button>
                <button type="button" className="btn btn-success" onClick={handleAccept} disabled={actionLoading}>
                  Valider le devis
                </button>
              </>
            )}
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteDetailModal;
