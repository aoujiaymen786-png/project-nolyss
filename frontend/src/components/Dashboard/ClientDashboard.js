import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import DonutCenterLabel from './DonutCenterLabel';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_ORDER, PROJECT_STATUS_COLORS, PROJECT_STATUS_ORDER, sortByKeyOrder } from './chartTheme';
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
  const [activeInvoiceSlice, setActiveInvoiceSlice] = useState(null);

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

  const INVOICE_STATUS_LABELS = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    partial: 'Partielle',
    paid: 'Payée',
    overdue: 'En retard',
    cancelled: 'Annulée',
  };

  const QUOTE_STATUS_LABELS = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    refused: 'Refusé',
    converted: 'Converti',
  };

  const projectsByStatusForChart = sortByKeyOrder(stats.projectsByStatus || [], '_id', PROJECT_STATUS_ORDER).map((s) => ({
    ...s,
    label: PROJECT_STATUS_LABELS[s._id] || s._id,
  }));

  const invoicesByStatusForChart = sortByKeyOrder(stats.invoicesByStatus || [], '_id', INVOICE_STATUS_ORDER).map((status) => ({
    ...status,
    label: INVOICE_STATUS_LABELS[status._id] || status._id,
    value: status.count || 0,
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
          <div className="kpi-card kpi-widget">
            <KpiIcon name="folder" />
            <div className="kpi-content">
              <h3>Mes Projets</h3>
              <p className="kpi-value">{stats.projectCount || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="file" />
            <div className="kpi-content">
              <h3>Factures</h3>
              <p className="kpi-value">{stats.invoiceCount || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="wallet" />
            <div className="kpi-content">
              <h3>Montant Total</h3>
              <p className="kpi-value">{stats.totalAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }) || '0 TND'}</p>
            </div>
          </div>
        </div>
        <div key="kpi-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="check" />
            <div className="kpi-content">
              <h3>Payé</h3>
              <p className="kpi-value">{stats.paidAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'TND' }) || '0 TND'}</p>
            </div>
          </div>
        </div>
        <div key="chart-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card chart-card-donut chart-card--compact">
            <h3>Statut de mes projets</h3>
            {projectsByStatusForChart.length > 0 ? (
              <div className="chart-card-inner">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={projectsByStatusForChart}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      label={false}
                      isAnimationActive
                      animationDuration={800}
                      activeIndex={activeProjectSlice}
                      onMouseEnter={(_, index) => setActiveProjectSlice(index)}
                    >
                      {projectsByStatusForChart.map((entry, index) => (
                        <Cell key={`cell-${entry._id || index}`} fill={PROJECT_STATUS_COLORS[entry._id] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <DonutCenterLabel
                      data={projectsByStatusForChart}
                      activeIndex={activeProjectSlice}
                      activeColor={PROJECT_STATUS_COLORS[projectsByStatusForChart[activeProjectSlice ?? 0]?._id]}
                      cx="50%"
                      cy="45%"
                    />
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
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={invoicesByStatusForChart}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      label={false}
                      isAnimationActive
                      animationDuration={800}
                      activeIndex={activeInvoiceSlice}
                      onMouseEnter={(_, index) => setActiveInvoiceSlice(index)}
                    >
                      {invoicesByStatusForChart.map((entry, index) => (
                        <Cell key={`invoice-cell-${entry._id || index}`} fill={INVOICE_STATUS_COLORS[entry._id] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <DonutCenterLabel
                      data={invoicesByStatusForChart}
                      activeIndex={activeInvoiceSlice}
                      activeColor={INVOICE_STATUS_COLORS[invoicesByStatusForChart[activeInvoiceSlice ?? 0]?._id]}
                      cx="50%"
                      cy="45%"
                    />
                    <Tooltip content={renderChartTooltip} />
                    <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
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
                    <td><span className={`status-${(invoice.status || '').toLowerCase()}`}>{INVOICE_STATUS_LABELS[invoice.status] || invoice.status}</span></td>
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
                    <td><span className={`status-${(invoice.status || '').toLowerCase()}`}>{INVOICE_STATUS_LABELS[invoice.status] || invoice.status}</span></td>
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
                    <td><span className={`status-${(quote.status || '').toLowerCase()}`}>{QUOTE_STATUS_LABELS[quote.status] || quote.status}</span></td>
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
