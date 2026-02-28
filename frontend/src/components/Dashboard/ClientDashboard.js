import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import './Dashboard.css';

const CLIENT_WIDGET_LAYOUT = [
  { i: 'kpi-1', x: 0, y: 0, w: 3, h: 2 },
  { i: 'kpi-2', x: 3, y: 0, w: 3, h: 2 },
  { i: 'kpi-3', x: 6, y: 0, w: 3, h: 2 },
  { i: 'kpi-4', x: 9, y: 0, w: 3, h: 2 },
  { i: 'chart-1', x: 0, y: 2, w: 6, h: 4 },
  { i: 'chart-2', x: 6, y: 2, w: 6, h: 4 },
];

const ClientDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientStats = async () => {
      try {
        const { data } = await API.get('/dashboard/client-stats');
        setStats(data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur stats client:', error);
        setLoading(false);
      }
    };
    fetchClientStats();
  }, []);

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!stats) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const COLORS = ['rgb(223, 48, 0)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)'];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Mon Espace Client</h1>
        <p>Suivi de vos projets et factures</p>
      </div>

      <DashboardWidgetGrid storageKey="client" defaultLayout={CLIENT_WIDGET_LAYOUT}>
        <div key="kpi-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="folder" />
            <div className="kpi-content">
              <h3>Mes Projets</h3>
              <p className="kpi-value">{stats.projectCount || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="file" />
            <div className="kpi-content">
              <h3>Factures</h3>
              <p className="kpi-value">{stats.invoiceCount || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="wallet" />
            <div className="kpi-content">
              <h3>Montant Total</h3>
              <p className="kpi-value">{stats.totalAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }) || '0 TND'}</p>
            </div>
          </div>
        </div>
        <div key="kpi-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="check" />
            <div className="kpi-content">
              <h3>Payé</h3>
              <p className="kpi-value">{stats.paidAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }) || '0 TND'}</p>
            </div>
          </div>
        </div>
        <div key="chart-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Statut de Mes Projets</h3>
            {stats.projectsByStatus && stats.projectsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.projectsByStatus}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {stats.projectsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de projets</p>}
          </div>
        </div>
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Statut des Factures</h3>
            {stats.invoicesByStatus && stats.invoicesByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.invoicesByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="rgb(223, 48, 0)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Aucune facture</p>}
          </div>
        </div>
      </DashboardWidgetGrid>

      {/* Projets en cours */}
      <div className="table-section">
        <h3>Mes Projets</h3>
        {stats.projects && stats.projects.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom du Projet</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th>Responsable</th>
                  <th>Début</th>
                  <th>Fin Prévue</th>
                </tr>
              </thead>
              <tbody>
                {stats.projects.map((project) => (
                  <tr key={project._id}>
                    <td><strong>{project.name}</strong></td>
                    <td><span className={`status-${project.status.toLowerCase()}`}>{project.status}</span></td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${project.progressPercentage || 0}%` }}></div>
                      </div>
                      <span>{project.progressPercentage || 0}%</span>
                    </td>
                    <td>{project.manager?.name || 'N/A'}</td>
                    <td>{new Date(project.startDate).toLocaleDateString('fr-FR')}</td>
                    <td>{new Date(project.endDate).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun projet en cours</p>}
      </div>

      {/* Factures en attente */}
      {stats.pendingInvoices && stats.pendingInvoices.length > 0 && (
        <div className="table-section">
          <h3>Factures en attente</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Projet</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Échéance</th>
                </tr>
              </thead>
              <tbody>
                {stats.pendingInvoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice._id}>
                    <td><strong>{invoice.number}</strong></td>
                    <td>{invoice.project?.name || 'N/A'}</td>
                    <td>{(invoice.totalTTC ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                    <td><span className={`status-${(invoice.status || '').toLowerCase()}`}>{invoice.status}</span></td>
                    <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Livrables récents */}
      {stats.recentDeliverables && stats.recentDeliverables.length > 0 && (
        <div className="table-section">
          <h3>Livrables récents</h3>
          <ul className="deliverables-list">
            {stats.recentDeliverables.map((d, idx) => (
              <li key={idx} className="deliverable-item">
                <span className="deliverable-name">{d.name || 'Document'}</span>
                <span className="deliverable-project">{d.projectName}</span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="link-download">Télécharger</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notifications */}
      {stats.notifications && stats.notifications.length > 0 && (
        <div className="table-section">
          <h3>Notifications</h3>
          <ul className="notifications-list">
            {stats.notifications.map((n, idx) => (
              <li key={idx}>{n.message || n.text || JSON.stringify(n)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Factures */}
      <div className="table-section">
        <h3>Mes Factures</h3>
        {stats.invoices && stats.invoices.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Projet</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Échéance</th>
                </tr>
              </thead>
              <tbody>
                {stats.invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td><strong>{invoice.number}</strong></td>
                    <td>{invoice.project?.name || 'N/A'}</td>
                    <td>{(invoice.totalTTC ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                    <td><span className={`status-${(invoice.status || '').toLowerCase()}`}>{invoice.status}</span></td>
                    <td>{invoice.date ? new Date(invoice.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucune facture</p>}
      </div>

      {/* Devis */}
      {stats.quotes && stats.quotes.length > 0 && (
        <div className="table-section">
          <h3>Devis et Propositions</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Projet</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.quotes.map((quote) => (
                  <tr key={quote._id}>
                    <td><strong>{quote.number}</strong></td>
                    <td>{quote.project?.name || '—'}</td>
                    <td>{(quote.totalTTC ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}</td>
                    <td><span className={`status-${(quote.status || '').toLowerCase()}`}>{quote.status}</span></td>
                    <td>{quote.date ? new Date(quote.date).toLocaleDateString('fr-FR') : (quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('fr-FR') : '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
