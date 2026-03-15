import React, { useEffect, useState, useContext } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import API from '../../utils/api';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { notify } from '../../utils/notify';
import DataTable from '../UI/DataTable';
import './ClientList.css';

const formatCurrency = (n) => (n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(n) : '–');

const ClientList = () => {
  const { user } = useContext(AuthContext);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const canDelete = user?.role === 'admin' || user?.role === 'director';
  const canSeeClaims = ['admin', 'director', 'coordinator'].includes(user?.role);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data } = await API.get('/clients');
        setClients(data);
      } catch (err) {
        console.error(err);
        notify.error('Erreur lors du chargement des clients.');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    try {
      await API.delete(`/clients/${id}`);
      setClients((prev) => prev.filter((c) => c._id !== id));
      notify.success('Client supprimé.');
    } catch (err) {
      notify.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  if (loading) return <div className="client-list-loading">Chargement...</div>;

  const columns = [
    { key: 'name', label: 'Nom', sortable: true, render: (val, row) => <Link to={`/clients/${row._id}`} className="client-name-link">{val}</Link> },
    { key: 'sector', label: 'Secteur', sortable: true },
    { key: 'siret', label: 'SIRET', sortable: true },
    { key: 'tags', label: 'Tags', sortable: false, render: (val) => (val?.length > 0 ? `${val.slice(0, 3).join(', ')}${val.length > 3 ? ` +${val.length - 3}` : ''}` : '–') },
    { key: 'revenue', label: 'CA', sortable: true, render: (val) => formatCurrency(val) },
    {
      key: '_id',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <span className="actions-cell">
          <Link to={`/clients/${row._id}`} className="btn-icon" title="Voir"><Eye size={18} /></Link>
          <Link to={`/clients/edit/${row._id}`} className="btn-icon" title="Modifier"><Pencil size={18} /></Link>
          {canDelete && (
            <button type="button" className="btn-icon btn-danger" onClick={() => handleDelete(row._id)} title="Supprimer"><Trash2 size={18} /></button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="client-list-page invoices-container">
      <div className="page-header client-list-header">
        <h1>Gestion des clients</h1>
        <div className="client-list-header-actions">
          {canSeeClaims && (
            <Link to="/clients/claims" className="btn btn-secondary client-list-btn-claims">Réclamations</Link>
          )}
          <Link to="/clients/new" className="btn btn-primary">Nouveau client</Link>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={clients}
        searchPlaceholder="Rechercher un client…"
        exportFilename="clients"
        emptyMessage="Aucun client"
      />
    </div>
  );
};

export default ClientList;
