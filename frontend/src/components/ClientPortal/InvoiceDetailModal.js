import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import '../Dashboard/Dashboard.css';

const INVOICE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  partial: 'Partiel',
  paid: 'Payé',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const formatCurrency = (n) =>
  n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(n) : '0 TND';

const InvoiceDetailModal = ({ invoiceId, onClose, onPay }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/client-portal/invoices/${invoiceId}`);
        if (!cancelled) setInvoice(data);
      } catch (e) {
        if (!cancelled) alert(e.response?.data?.message || 'Impossible de charger la facture.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const remaining = invoice ? (invoice.totalTTC || 0) - (invoice.paidAmount || 0) : 0;
  const canPay = invoice && ['sent', 'overdue'].includes(invoice.status) && remaining > 0.01;

  if (!invoiceId) return null;

  return (
    <div className="payment-modal-backdrop document-detail-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="document-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>Facture {invoice?.number || invoiceId}</h2>
          <button type="button" className="payment-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="document-detail-body">
          {loading ? (
            <p>Chargement...</p>
          ) : !invoice ? (
            <p>Facture introuvable.</p>
          ) : (
            <div className="document-detail-content document-detail-print">
              <div className="document-detail-meta">
                <p><strong>Numéro</strong> {invoice.number}</p>
                <p><strong>Date</strong> {invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '—'}</p>
                <p><strong>Échéance</strong> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'}</p>
                {invoice.project?.name && <p><strong>Projet</strong> {invoice.project.name}</p>}
                <p><strong>Statut</strong> <span className={`status-${(invoice.status || '').toLowerCase()}`}>{INVOICE_STATUS_LABELS[invoice.status] || invoice.status}</span></p>
                <p><strong>Montant TTC</strong> {formatCurrency(invoice.totalTTC)}</p>
                {(invoice.paidAmount || 0) > 0 && (
                  <p><strong>Déjà payé</strong> {formatCurrency(invoice.paidAmount)} — <strong>Restant</strong> {formatCurrency(remaining)}</p>
                )}
              </div>
              {invoice.lines?.length > 0 && (
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
                    {invoice.lines.map((line, idx) => {
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
                <p><strong>Total HT</strong> {formatCurrency(invoice.subtotalHT)}</p>
                <p><strong>Total TVA</strong> {formatCurrency(invoice.totalTax)}</p>
                <p><strong>Total TTC</strong> {formatCurrency(invoice.totalTTC)}</p>
              </div>
              {invoice.notes && (
                <div className="document-detail-notes">
                  <strong>Notes</strong>
                  <p>{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div className="document-detail-terms">
                  <strong>Conditions</strong>
                  <p>{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {invoice && (
          <div className="document-detail-actions payment-modal-actions">
            <button type="button" className="btn btn-outline" onClick={handlePrint}>
              Imprimer / Enregistrer en PDF
            </button>
            {canPay && (
              <button type="button" className="btn btn-primary" onClick={() => { onClose(); onPay(invoice); }}>
                Payer cette facture
              </button>
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

export default InvoiceDetailModal;
