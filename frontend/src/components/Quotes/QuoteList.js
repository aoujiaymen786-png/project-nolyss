import React, { useState, useEffect } from 'react';
import { FileText, FolderOpen, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import './Quotes.css';

const QuoteList = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const quoteStatusLabel = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    refused: 'Refusé',
    converted: 'Converti',
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data } = await API.get('/quotes');
      setQuotes(data);
      setFiltered(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let results = quotes;
    if (searchTerm) {
      results = results.filter(q =>
        q.number?.includes(searchTerm) ||
        q.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.lines?.some(l => l.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (statusFilter) {
      results = results.filter(q => q.status === statusFilter);
    }
    setFiltered(results);
  }, [searchTerm, statusFilter, quotes]);

  const handleConvertToInvoice = async (id) => {
    try {
      const { data } = await API.post(`/quotes/${id}/convert`);
      navigate(`/invoices/${data._id}/edit`);
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur conversion');
    }
  };

  const handleConvertToProject = async (id) => {
    try {
      const { data } = await API.post(`/quotes/${id}/convert-to-project`);
      navigate(`/projects/${data._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur conversion');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr ?')) {
      try {
        await API.delete(`/quotes/${id}`);
        fetchQuotes();
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  if (loading) return <div className="quotes-loading">Chargement...</div>;

  return (
    <div className="quotes-container">
      <div className="quotes-list-header">
        <h1>Devis</h1>
        <Link to="/quotes/new" className="btn btn-primary">Nouveau devis</Link>
      </div>

      <div className="quotes-toolbar">
        <input
          type="text"
          placeholder="Rechercher (numéro, client, description…)"
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
          <option value="sent">Envoyé</option>
          <option value="accepted">Accepté</option>
          <option value="refused">Refusé</option>
          <option value="converted">Converti</option>
        </select>
      </div>

      <div className="quotes-table-wrap">
        <table className="quotes-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Description</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Validité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(quote => (
              <tr key={quote._id}>
                <td><strong>{quote.number}</strong></td>
                <td>{quote.client?.name || 'N/A'}</td>
                <td>{quote.lines?.[0]?.description || '-'}</td>
                <td className="amount">{quote.totalTTC?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                <td><span className={`status-${quote.status}`}>{quoteStatusLabel[quote.status] ?? quote.status}</span></td>
                <td>{quote.date ? new Date(quote.date).toLocaleDateString('fr-FR') : '-'}</td>
                <td>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="actions">
                  <Link to={`/quotes/${quote._id}`} className="btn-icon" title="Voir"><Eye size={16} /></Link>
                  {quote.status === 'draft' && (
                    <Link to={`/quotes/${quote._id}/edit`} className="btn-icon" title="Éditer"><Pencil size={16} /></Link>
                  )}
                  {quote.status === 'accepted' && (
                    <>
                      <button type="button" onClick={() => handleConvertToInvoice(quote._id)} className="btn-icon" title="Convertir en facture"><FileText size={16} /></button>
                      <button type="button" onClick={() => handleConvertToProject(quote._id)} className="btn-icon" title="Convertir en projet"><FolderOpen size={16} /></button>
                    </>
                  )}
                  {quote.status === 'draft' && (
                    <button type="button" onClick={() => handleDelete(quote._id)} className="btn-icon btn-danger" title="Supprimer"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="quotes-empty">Aucun devis trouvé</div>
      )}
    </div>
  );
};

export default QuoteList;
