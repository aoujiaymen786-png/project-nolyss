import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import API from '../../utils/api';
import './ClientDetail.css';

const formatCurrency = (n) => (n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(n) : '–');

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newInteraction, setNewInteraction] = useState({ type: 'note', description: '' });

  const canDelete = user?.role === 'admin' || user?.role === 'director';

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const { data } = await API.get(`/clients/${id}`);
        setClient(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteraction.description?.trim()) return;
    try {
      const { data } = await API.post(`/clients/${id}/interactions`, newInteraction);
      setClient(data);
      setNewInteraction({ type: 'note', description: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce client ? Cette action est irréversible.')) return;
    try {
      await API.delete(`/clients/${id}`);
      navigate('/clients');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <div className="client-detail-loading">Chargement...</div>;
  if (!client) return <div className="client-detail-error">Client non trouvé</div>;

  const revenue = client.revenueComputed ?? client.revenue ?? 0;
  const primaryContact = client.contacts?.find((c) => c.isPrimary) || client.contacts?.[0];

  return (
    <div className="client-detail-page">
      <div className="client-detail-header">
        <div>
          <Link to="/clients" className="back-link">← Liste des clients</Link>
          <h1>{client.name}</h1>
          {client.sector && <span className="client-sector">{client.sector}</span>}
          {client.tags?.length > 0 && (
            <div className="client-tags">
              {client.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="client-detail-actions">
          <Link to={`/clients/edit/${id}`} className="btn-primary">Modifier</Link>
          {canDelete && (
            <button type="button" className="btn-danger" onClick={handleDelete}>Supprimer</button>
          )}
        </div>
      </div>

      <div className="client-detail-grid">
        <section className="client-detail-card">
          <h2>Informations générales</h2>
          <dl>
            <dt>SIRET</dt>
            <dd>{client.siret || '–'}</dd>
            <dt>Email</dt>
            <dd>{client.email || primaryContact?.email || '–'}</dd>
            <dt>Téléphone</dt>
            <dd>{client.phone || primaryContact?.phone || '–'}</dd>
          </dl>
        </section>

        <section className="client-detail-card">
          <h2>Chiffre d&apos;affaires (client)</h2>
          <p className="revenue-value">{formatCurrency(revenue)}</p>
          <p className="revenue-hint">Factures payées associées à ce client</p>
        </section>

        <section className="client-detail-card full-width">
          <h2>Adresses</h2>
          <div className="addresses-row">
            <div>
              <h3>Facturation</h3>
              <p>
                {[client.billingAddress?.street, client.billingAddress?.zipCode, client.billingAddress?.city, client.billingAddress?.country]
                  .filter(Boolean).join(', ') || '–'}
              </p>
            </div>
            <div>
              <h3>Livraison</h3>
              <p>
                {[client.deliveryAddress?.street, client.deliveryAddress?.zipCode, client.deliveryAddress?.city, client.deliveryAddress?.country]
                  .filter(Boolean).join(', ') || '–'}
              </p>
            </div>
          </div>
        </section>

        <section className="client-detail-card full-width">
          <h2>Contacts</h2>
          {client.contacts?.length > 0 ? (
            <table className="client-detail-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Principal</th>
                </tr>
              </thead>
              <tbody>
                {client.contacts.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name || '–'}</td>
                    <td>{c.email || '–'}</td>
                    <td>{c.phone || '–'}</td>
                    <td>{c.role || '–'}</td>
                    <td>{c.isPrimary ? 'Oui' : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-text">Aucun contact enregistré</p>
          )}
        </section>

        <section className="client-detail-card full-width">
          <h2>Conditions commerciales</h2>
          <dl className="inline-dl">
            <dt>Délai de paiement</dt>
            <dd>{client.commercialTerms?.paymentDeadline ?? 30} jours</dd>
            <dt>Remise</dt>
            <dd>{client.commercialTerms?.discount ?? 0} %</dd>
            <dt>TVA</dt>
            <dd>{client.commercialTerms?.vatRate ?? 20} %</dd>
          </dl>
          {client.commercialTerms?.notes && (
            <p className="commercial-notes">{client.commercialTerms.notes}</p>
          )}
        </section>

        <section className="client-detail-card full-width">
          <h2>Historique des interactions</h2>
          <form onSubmit={handleAddInteraction} className="add-interaction-form">
            <select value={newInteraction.type} onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}>
              <option value="note">Note</option>
              <option value="call">Appel</option>
              <option value="meeting">Réunion</option>
              <option value="email">Email</option>
            </select>
            <input
              type="text"
              value={newInteraction.description}
              onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })}
              placeholder="Description..."
              required
            />
            <button type="submit" className="btn-primary">Ajouter</button>
          </form>
          {client.interactions?.length > 0 ? (
            <ul className="interactions-list">
              {[...client.interactions].reverse().map((i, idx) => (
                <li key={idx}>
                  <span className="interaction-date">{new Date(i.date).toLocaleString('fr-FR')}</span>
                  <span className={`interaction-type type-${i.type}`}>{i.type}</span>
                  <span className="interaction-desc">{i.description}</span>
                  {i.createdBy?.name && <span className="interaction-by">par {i.createdBy.name}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">Aucune interaction</p>
          )}
        </section>

        <section className="client-detail-card full-width">
          <h2>Documents (contrats, briefs)</h2>
          {client.documents?.length > 0 ? (
            <ul className="documents-list">
              {client.documents.map((d, idx) => (
                <li key={idx}>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer">{d.name || 'Document'}</a>
                  ) : (
                    <span>{d.name || 'Document'}</span>
                  )}
                  <span className="doc-meta">{d.type} – {new Date(d.uploadedAt).toLocaleDateString('fr-FR')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">Aucun document.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClientDetail;
