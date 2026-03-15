import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [activeProjectSlice, setActiveProjectSlice] = useState(null);

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

  const PROJECT_STATUS_LABELS = {
    prospecting: 'Prospection',
    inProgress: 'En cours',
    validation: 'Validation',
    completed: 'Terminé',
    archived: 'Archivé',
  };

  const PROJECT_STATUS_CHART_COLORS = {
    prospecting: '#94a3b8',
    inProgress: '#0ea5e9',
    validation: '#8b5cf6',
    completed: '#22c55e',
    archived: '#64748b',
  };

  const projectsByStatusForChart = (stats.projectsByStatus || []).map((s) => ({
    ...s,
    label: PROJECT_STATUS_LABELS[s._id] || s._id,
  }));

  const renderChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="chart-tooltip">
        {label && <div className="chart-tooltip-label">{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} className="chart-tooltip-item">
            <span className="chart-tooltip-name">{entry.name}</span>
            <span className="chart-tooltip-value">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

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
            <h3>Statut de mes projets</h3>
            {projectsByStatusForChart.length > 0 ? (
              <div className="chart-card-inner">
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={projectsByStatusForChart}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="48%"
                      innerRadius={64}
                      outerRadius={100}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)} %`}
                      labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1 }}
                      isAnimationActive
                      animationDuration={800}
                      activeIndex={activeProjectSlice}
                      onMouseEnter={(_, index) => setActiveProjectSlice(index)}
                    >
                      {projectsByStatusForChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PROJECT_STATUS_CHART_COLORS[entry._id] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={renderChartTooltip} />
                    <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="chart-empty">Pas de projets</p>}
          </div>
        </div>
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Statut des factures</h3>
            {stats.invoicesByStatus && stats.invoicesByStatus.length > 0 ? (
              <div className="chart-card-inner">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.invoicesByStatus} barCategoryGap={20} barGap={8} margin={{ top: 12, right: 20, bottom: 28, left: 12 }}>
                    <defs>
                      <linearGradient id="clientBarInvoices" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--primary-hover, #c23d14)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} height={40} />
                    <YAxis width={32} allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip content={renderChartTooltip} />
                    <Bar dataKey="count" name="Nombre" fill="url(#clientBarInvoices)" radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                    <td><span className={`status-${(project.status || '').toLowerCase()}`}>{PROJECT_STATUS_LABELS[project.status] || project.status}</span></td>
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
