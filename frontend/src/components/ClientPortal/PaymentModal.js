import React, { useState } from 'react';
import API from '../../utils/api';

const PaymentModal = ({ invoice, onClose, onSuccess }) => {
  const hasInvoice = !!invoice;
  const remainingRaw = hasInvoice
    ? (invoice.totalTTC || 0) - (invoice.paidAmount || 0)
    : 0;
  const initialAmount = hasInvoice
    ? Math.max(0, Number(remainingRaw.toFixed(2)))
    : 0;

  const [amount, setAmount] = useState(initialAmount);
  const [method, setMethod] = useState('virement');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!hasInvoice) {
    return null;
  }

  const remaining = remainingRaw;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Veuillez saisir un montant valide.');
      return;
    }
    setLoading(true);
    try {
      await API.post('/paiements', {
        invoiceId: invoice._id,
        amount: numericAmount,
        method,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur paiement client:', err);
      setError(err.response?.data?.message || 'Impossible d\'enregistrer le paiement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-backdrop" role="dialog" aria-modal="true">
      <div className="payment-modal">
        <div className="payment-modal-header">
          <h2>Paiement de la facture {invoice.number}</h2>
          <button type="button" className="payment-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="payment-modal-body">
          <p>
            Montant total:{' '}
            <strong>{(invoice.totalTTC || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</strong>
          </p>
          <p>
            Déjà payé:{' '}
            <strong>{(invoice.paidAmount || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</strong>
          </p>
          <p>
            Restant à payer:{' '}
            <strong>{remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</strong>
          </p>
          <form onSubmit={handleSubmit} className="payment-form">
            <div className="form-group">
              <label>Montant à payer</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Mode de paiement</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="virement">Virement</option>
                <option value="carte">Carte bancaire</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
            {error && <p className="payment-error">{error}</p>}
            <div className="payment-modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </form>
          <p className="payment-hint">
            Ce module enregistre le paiement dans le système. L\'intégration bancaire réelle peut être ajoutée plus tard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

