import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Trash2, Mail } from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../../utils/api';
import './Invoices.css';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reminderLoadingId, setReminderLoadingId] = useState(null);

  const invoiceStatusLabel = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    partial: 'Partiellement payée',
    paid: 'Payée',
    overdue: 'En retard',
    cancelled: 'Annulée',
  };

  useEffect(() => {
    fetchInvoices();
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socket.on('invoiceUpdated', () => {
      fetchInvoices();
    });
    return () => socket.disconnect();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data } = await API.get('/invoices');
      setInvoices(data);
      setFiltered(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let results = invoices;
    if (searchTerm) {
      results = results.filter(inv =>
        inv.number?.includes(searchTerm) ||
        inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      results = results.filter(inv => inv.status === statusFilter);
    }
    setFiltered(results);
  }, [searchTerm, statusFilter, invoices]);

  const handleExportFEC = async () => {
    try {
      const response = await API.get('/invoices/export-fec', { responseType: 'blob' });
      const blob = response.data;
      if (!(blob instanceof Blob)) {
        throw new Error('Réponse invalide du serveur');
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FEC_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export FEC:', error);
      let msg = 'Erreur lors de l\'export FEC. Vérifiez votre connexion et réessayez.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') msg = error.response.data;
        else if (error.response.data?.message) msg = error.response.data.message;
      }
      alert(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette facture ?')) {
      try {
        await API.delete(`/invoices/${id}`);
        fetchInvoices();
      } catch (error) {
        alert(error.response?.data?.message || 'Erreur lors de la suppression.');
      }
    }
  };

  const canSendReminder = (inv) => {
    if (!['sent', 'partial', 'overdue'].includes(inv.status)) return false;
    const remaining = (inv.totalTTC || 0) - (inv.paidAmount || 0);
    return remaining > 0.01;
  };

  const handleSendReminder = async (id) => {
    try {
      setReminderLoadingId(id);
      await API.post(`/invoices/${id}/send-reminder`);
      fetchInvoices();
      alert('Relance envoyée au client.');
    } catch (err) {
      alert(err.response?.data?.message || 'Impossible d\'envoyer la relance.');
    } finally {
      setReminderLoadingId(null);
    }
  };

  if (loading) return <div className="invoices-loading">Chargement...</div>;

  return (
    <div className="invoices-container">
      <div className="invoices-list-header">
        <h1>Factures</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={handleExportFEC} className="btn btn-secondary">Export FEC</button>
          <Link to="/invoices/new" className="btn btn-primary">Nouvelle facture</Link>
        </div>
      </div>

      <div className="invoices-toolbar">
        <input
          type="text"
          placeholder="Rechercher (numéro, client, projet…)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-select"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="sent">Envoyée</option>
          <option value="partial">Partiellement payée</option>
          <option value="paid">Payée</option>
          <option value="overdue">En retard</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>

      <div className="invoices-table-wrap">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Projet</th>
              <th>Type</th>
              <th>Montant</th>
              <th>Payé</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Échéance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(invoice => (
              <tr key={invoice._id}>
                <td><strong>{invoice.number}</strong></td>
                <td>{invoice.client?.name || 'N/A'}</td>
                <td>{invoice.project?.name || '-'}</td>
                <td>{invoice.type === 'credit_note' ? 'Avoir' : invoice.type === 'down_payment' ? 'Acompte' : 'Facture'}</td>
                <td className="amount">{invoice.totalTTC?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                <td>{invoice.paidAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }) || '-'}</td>
                <td><span className={`status-${invoice.status}`}>{invoiceStatusLabel[invoice.status] ?? invoice.status}</span></td>
                <td>{invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '-'}</td>
                <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="actions">
                  <Link to={`/invoices/${invoice._id}/edit`} className="btn-icon" title="Voir/Éditer"><Eye size={16} /></Link>
                  {canSendReminder(invoice) && (
                    <button
                      type="button"
                      onClick={() => handleSendReminder(invoice._id)}
                      disabled={reminderLoadingId === invoice._id}
                      className="btn-icon"
                      title="Envoyer une relance au client"
                    >
                      {reminderLoadingId === invoice._id ? '…' : <Mail size={16} />}
                    </button>
                  )}
                  {['draft', 'cancelled'].includes(invoice.status) && (
                    <button type="button" onClick={() => handleDelete(invoice._id)} className="btn-icon btn-danger" title="Supprimer"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="invoices-empty">Aucune facture trouvée</div>
      )}
    </div>
  );
};

export default InvoiceList;
